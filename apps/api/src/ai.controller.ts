import {
  BadGatewayException,
  Body,
  Controller,
  Get,
  Inject,
  Post,
  Req,
  Res,
  UseGuards,
} from "@nestjs/common";
import type { Response } from "express";
import { ApiTags } from "@nestjs/swagger";
import { z } from "zod";
import { AuthedRequest, SessionGuard } from "./auth";
import { Db } from "./db";
import { FinanceService } from "./finance.service";
import { currentMonth, money } from "./finance";
import { uuid, validate } from "./validation";
@ApiTags("Copilot")
@UseGuards(SessionGuard)
@Controller("ai")
export class AiController {
  constructor(
    @Inject(Db) private readonly db: Db,
    @Inject(FinanceService) private readonly finance: FinanceService,
  ) {}
  @Get("conversations") history(@Req() req: AuthedRequest) {
    return this.db.conversation.findMany({
      where: { userId: req.userId },
      take: 20,
      orderBy: { createdAt: "desc" },
      include: { messages: { orderBy: { createdAt: "asc" }, take: 100 } },
    });
  }
  @Post("chat") async chat(
    @Req() req: AuthedRequest,
    @Body() body: unknown,
    @Res() res: Response,
  ) {
    const input = validate(
      z
        .object({
          message: z.string().trim().min(1).max(2000),
          conversationId: uuid.optional(),
        })
        .strict(),
      body,
    );
    const month = currentMonth();
    const conversation = await this.db.$transaction(
      async (tx) => {
        const subscription = await tx.subscription.upsert({
          where: { userId: req.userId },
          create: { userId: req.userId, usageMonth: month },
          update: {},
        });
        if (subscription.usageMonth !== month)
          await tx.subscription.update({
            where: { userId: req.userId },
            data: { aiUsage: 0, usageMonth: month },
          });
        const quota = await tx.subscription.updateMany({
          where: {
            userId: req.userId,
            aiUsage: { lt: subscription.tier === "FREE" ? 30 : 200 },
          },
          data: { aiUsage: { increment: 1 } },
        });
        if (!quota.count)
          throw new BadGatewayException("Monthly copilot quota reached");
        if (input.conversationId) {
          const found = await tx.conversation.findFirst({
            where: { id: input.conversationId, userId: req.userId },
          });
          if (!found) throw new BadGatewayException("Conversation not found");
          return found;
        }
        return tx.conversation.create({ data: { userId: req.userId } });
      },
      { isolationLevel: "Serializable" },
    );
    const summary = await this.finance.dashboard(req.userId);
    const facts = {
      month: summary.month,
      currency: "INR",
      income: money(summary.income),
      expenses: money(summary.expenses),
      savings: money(summary.netCashFlow),
      savingsRate: summary.savingsRate,
      spending: summary.spending.map((s) => ({
        category: s.name,
        amount: money(s.value),
      })),
      investmentCost: money(summary.investmentCost),
      insights: summary.insights,
    };
    let answer: string;
    let mode = "demo";
    if (process.env.AI_MODE === "live") {
      const token = process.env.AI_SERVICE_TOKEN;
      if (!token) throw new BadGatewayException("AI service is not configured");
      try {
        const response = await fetch(
          `${process.env.AI_SERVICE_URL ?? "http://localhost:8000"}/respond`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ question: input.message, facts }),
            signal: AbortSignal.timeout(45000),
          },
        );
        if (!response.ok) throw new Error("Provider failure");
        const result: unknown = await response.json();
        answer = validate(
          z.object({ answer: z.string() }).passthrough(),
          result,
        ).answer;
        mode = "live";
      } catch {
        throw new BadGatewayException(
          "AI provider unavailable; no response was fabricated",
        );
      }
    } else {
      const q = input.message.toLowerCase();
      const largest = [...summary.spending].sort((a, b) =>
        a.value > b.value ? -1 : 1,
      )[0];
      if (/portfolio|invest|allocat/.test(q))
        answer = `Your recorded investment cost is INR ${facts.investmentCost}. Live market values and returns are unavailable. Open Portfolio for holdings and realized gains using weighted-average cost.`;
      else if (/category|most|largest/.test(q))
        answer = largest
          ? `Your largest spending category for ${month} is ${largest.name}: INR ${money(largest.value)}.`
          : `No expenses recorded for ${month}.`;
      else if (/save|saving/.test(q))
        answer = `For ${month}, recorded income minus expenses is INR ${facts.savings}, a savings rate of ${facts.savingsRate}%. The Forecast tool models fixed monthly contributions with zero assumed return.`;
      else if (/spend|spent|expense|income|summary/.test(q))
        answer = `For ${month}, your recorded income is INR ${facts.income}, expenses INR ${facts.expenses}, and net cash flow INR ${facts.savings}. Account transfers are excluded.`;
      else
        answer =
          "Demo copilot supports monthly spending, income, largest category, savings, and investment cost questions. Ask “How much did I spend this month?” for a calculation from your saved records. Other questions require live AI mode.";
      answer = `[Deterministic demo · saved records only] ${answer}`;
    }
    await this.db.message.createMany({
      data: [
        {
          conversationId: conversation.id,
          role: "user",
          content: input.message,
        },
        { conversationId: conversation.id, role: "assistant", content: answer },
      ],
    });
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("X-Accel-Buffering", "no");
    res.flushHeaders();
    // SSE delivery is chunked; live model generation currently completes before delivery.
    res.write(
      `event: metadata\ndata: ${JSON.stringify({ conversationId: conversation.id, mode })}\n\n`,
    );
    for (const chunk of answer.match(/.{1,80}/gs) ?? [])
      res.write(`data: ${JSON.stringify({ text: chunk })}\n\n`);
    res.write("event: done\ndata: {}\n\n");
    res.end();
  }
}
