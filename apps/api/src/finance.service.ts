import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { createHash, randomUUID } from "node:crypto";
import { parse } from "csv-parse/sync";
import { z } from "zod";
import { Db } from "./db";
import {
  amount,
  date,
  month,
  nonnegative,
  text,
  uuid,
  validate,
} from "./validation";
import {
  categorize,
  currentMonth,
  minor,
  money,
  monthRange,
  position,
} from "./finance";

const transactionSchema = z
  .object({
    accountId: uuid,
    categoryId: text,
    amount,
    kind: z.enum(["INCOME", "EXPENSE"]),
    merchant: text,
    date,
    recurring: z.boolean().default(false),
    note: z.string().max(500).default(""),
  })
  .strict();
const tradeSchema = z
  .object({
    symbol: z
      .string()
      .trim()
      .toUpperCase()
      .regex(/^[A-Z0-9.-]{1,16}$/),
    name: text,
    kind: z.enum(["BUY", "SELL", "DIVIDEND"]),
    quantity: z
      .string()
      .regex(/^\d{1,8}(\.\d{1,8})?$/)
      .refine((v) => Number(v) > 0),
    price: amount,
    fees: nonnegative.default("0"),
    date,
  })
  .strict();
const serializable = {
  isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
};
@Injectable()
export class FinanceService {
  constructor(@Inject(Db) private readonly db: Db) {}
  async account(userId: string, id: string) {
    const account = await this.db.account.findFirst({
      where: { userId, id: validate(uuid, id) },
    });
    if (!account) throw new NotFoundException("Account not found");
    return account;
  }
  async accounts(userId: string) {
    const records = await this.db.account.findMany({
      where: { userId },
      orderBy: { createdAt: "asc" },
      include: { transactions: { select: { kind: true, amount: true } } },
    });
    return records.map(({ transactions, ...a }) => ({
      ...a,
      balance:
        a.openingBalance +
        transactions.reduce(
          (n, t) => n + (t.kind === "INCOME" ? t.amount : -t.amount),
          0n,
        ),
    }));
  }
  async createAccount(userId: string, body: unknown) {
    const input = validate(
      z
        .object({
          name: text,
          type: z.enum(["BANK", "CASH", "SAVINGS"]).default("BANK"),
          openingBalance: nonnegative.default("0"),
        })
        .strict(),
      body,
    );
    return this.db.account.create({
      data: { userId, ...input, openingBalance: minor(input.openingBalance) },
    });
  }
  async transactions(userId: string, query: unknown) {
    const q = validate(
      z
        .object({
          page: z.coerce.number().int().min(1).max(10000).default(1),
          search: z.string().max(120).default(""),
          month: month.optional(),
          kind: z.enum(["INCOME", "EXPENSE"]).optional(),
          categoryId: text.optional(),
          sort: z.enum(["asc", "desc"]).default("desc"),
        })
        .strict(),
      query,
    );
    const where: Prisma.TransactionWhereInput = {
      userId,
      ...(q.month ? { date: monthRange(q.month) } : {}),
      ...(q.kind ? { kind: q.kind } : {}),
      ...(q.categoryId ? { categoryId: q.categoryId } : {}),
      ...(q.search
        ? { merchant: { contains: q.search, mode: "insensitive" } }
        : {}),
    };
    const [items, total] = await this.db.$transaction([
      this.db.transaction.findMany({
        where,
        orderBy: [{ date: q.sort }, { createdAt: q.sort }],
        skip: (q.page - 1) * 20,
        take: 20,
        include: { account: { select: { name: true } }, category: true },
      }),
      this.db.transaction.count({ where }),
    ]);
    return {
      items,
      total,
      page: q.page,
      pages: Math.max(1, Math.ceil(total / 20)),
    };
  }
  async createTransaction(userId: string, body: unknown) {
    const input = validate(transactionSchema, body);
    await this.account(userId, input.accountId);
    return this.db.$transaction(async (tx) => {
      const record = await tx.transaction.create({
        data: {
          ...input,
          userId,
          amount: minor(input.amount),
          date: new Date(input.date),
        },
      });
      await tx.auditLog.create({
        data: { userId, action: "TRANSACTION_CREATE", resourceId: record.id },
      });
      return record;
    });
  }
  async updateTransaction(userId: string, id: string, body: unknown) {
    const input = validate(transactionSchema, body);
    await this.account(userId, input.accountId);
    const record = await this.db.transaction.findFirst({
      where: { id: validate(uuid, id), userId, transferId: null },
    });
    if (!record) throw new NotFoundException("Editable transaction not found");
    return this.db.$transaction(async (tx) => {
      const updated = await tx.transaction.update({
        where: { id: record.id },
        data: {
          ...input,
          amount: minor(input.amount),
          date: new Date(input.date),
        },
      });
      await tx.auditLog.create({
        data: { userId, action: "TRANSACTION_UPDATE", resourceId: id },
      });
      return updated;
    });
  }
  async deleteTransaction(userId: string, id: string) {
    return this.db.$transaction(async (tx) => {
      const record = await tx.transaction.findFirst({
        where: { id: validate(uuid, id), userId },
      });
      if (!record) throw new NotFoundException("Transaction not found");
      await tx.transaction.deleteMany({
        where: {
          userId,
          ...(record.transferId
            ? { transferId: record.transferId }
            : { id: record.id }),
        },
      });
      await tx.auditLog.create({
        data: { userId, action: "TRANSACTION_DELETE", resourceId: id },
      });
      return { success: true };
    });
  }
  async transfer(userId: string, body: unknown) {
    const input = validate(
      z.object({ from: uuid, to: uuid, amount, date }).strict(),
      body,
    );
    if (input.from === input.to)
      throw new BadRequestException("Select different accounts");
    await this.account(userId, input.from);
    await this.account(userId, input.to);
    return this.db.$transaction(async (tx) => {
      const transferId = randomUUID();
      const common = {
        userId,
        categoryId: "transfer",
        amount: minor(input.amount),
        date: new Date(input.date),
        transferId,
        merchant: "Account transfer",
      };
      await tx.transaction.createMany({
        data: [
          { ...common, accountId: input.from, kind: "EXPENSE" },
          { ...common, accountId: input.to, kind: "INCOME" },
        ],
      });
      await tx.auditLog.create({
        data: { userId, action: "TRANSFER_CREATE", resourceId: transferId },
      });
      return { transferId };
    }, serializable);
  }
  async importCsv(userId: string, body: unknown) {
    const input = validate(
      z
        .object({ accountId: uuid, csv: z.string().min(1).max(200000) })
        .strict(),
      body,
    );
    await this.account(userId, input.accountId);
    let rows: unknown[];
    try {
      rows = parse(input.csv, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
        bom: true,
      });
    } catch {
      throw new BadRequestException("Invalid CSV");
    }
    if (rows.length > 1000)
      throw new BadRequestException("Maximum 1,000 rows per import");
    const entries = rows.map((row) =>
      validate(
        z
          .object({
            date,
            merchant: text,
            amount,
            kind: z.enum(["INCOME", "EXPENSE"]),
            categoryId: text.optional(),
          })
          .strict(),
        row,
      ),
    );
    const data = entries.map((r) => {
      const normalized = [
        input.accountId,
        r.date,
        r.merchant.toLowerCase(),
        minor(r.amount).toString(),
        r.kind,
      ].join("|");
      return {
        userId,
        accountId: input.accountId,
        categoryId: r.categoryId ?? categorize(r.merchant),
        date: new Date(r.date),
        merchant: r.merchant,
        amount: minor(r.amount),
        kind: r.kind,
        importKey: createHash("sha256").update(normalized).digest("hex"),
      };
    });
    return this.db.$transaction(async (tx) => {
      const result = await tx.transaction.createMany({
        data,
        skipDuplicates: true,
      });
      await tx.auditLog.create({ data: { userId, action: "CSV_IMPORT" } });
      return {
        imported: result.count,
        duplicates: entries.length - result.count,
      };
    });
  }
  async budgets(userId: string, selectedMonth: string) {
    const m = validate(month, selectedMonth);
    const [records, totals] = await Promise.all([
      this.db.budget.findMany({
        where: { userId, month: m },
        include: { category: true },
      }),
      this.db.transaction.groupBy({
        by: ["categoryId"],
        where: {
          userId,
          date: monthRange(m),
          kind: "EXPENSE",
          transferId: null,
        },
        _sum: { amount: true },
      }),
    ]);
    return records.map((b) => ({
      ...b,
      spent:
        totals.find((t) => t.categoryId === b.categoryId)?._sum.amount ?? 0n,
    }));
  }
  async saveBudget(userId: string, body: unknown) {
    const input = validate(
      z.object({ categoryId: text, amount, month }).strict(),
      body,
    );
    if (input.categoryId === "transfer")
      throw new BadRequestException("Transfers cannot have a spending budget");
    return this.db.budget.upsert({
      where: {
        userId_categoryId_month: {
          userId,
          categoryId: input.categoryId,
          month: input.month,
        },
      },
      create: { ...input, userId, amount: minor(input.amount) },
      update: { amount: minor(input.amount) },
    });
  }
  async goals(userId: string) {
    return this.db.goal.findMany({
      where: { userId },
      orderBy: { targetDate: "asc" },
    });
  }
  async saveGoal(userId: string, body: unknown, id?: string) {
    const input = validate(
      z
        .object({
          name: text,
          target: amount,
          saved: nonnegative.default("0"),
          monthlyContribution: nonnegative.default("0"),
          targetDate: date,
        })
        .strict(),
      body,
    );
    const data = {
      ...input,
      target: minor(input.target),
      saved: minor(input.saved),
      monthlyContribution: minor(input.monthlyContribution),
      targetDate: new Date(input.targetDate),
    };
    if (id) {
      const found = await this.db.goal.findFirst({
        where: { id: validate(uuid, id), userId },
      });
      if (!found) throw new NotFoundException("Goal not found");
      return this.db.goal.update({ where: { id }, data });
    }
    return this.db.goal.create({ data: { ...data, userId } });
  }
  async portfolios(userId: string) {
    const portfolios = await this.db.portfolio.findMany({
      where: { userId },
      include: {
        trades: {
          include: { asset: true },
          orderBy: [{ date: "asc" }, { createdAt: "asc" }, { id: "asc" }],
        },
      },
    });
    return portfolios.map((p) => ({
      ...p,
      holdings: [...new Set(p.trades.map((t) => t.assetId))].map((assetId) => {
        const trades = p.trades.filter((t) => t.assetId === assetId);
        return {
          asset: trades[0].asset,
          ...position(trades),
          marketValue: null,
          unrealized: null,
        };
      }),
    }));
  }
  async createPortfolio(userId: string, body: unknown) {
    const input = validate(z.object({ name: text }).strict(), body);
    return this.db.portfolio.create({ data: { userId, ...input } });
  }
  async trade(userId: string, id: string, body: unknown) {
    const input = validate(tradeSchema, body);
    validate(uuid, id);
    return this.db.$transaction(async (tx) => {
      const portfolio = await tx.portfolio.findFirst({ where: { id, userId } });
      if (!portfolio) throw new NotFoundException("Portfolio not found");
      const asset = await tx.asset.upsert({
        where: { symbol: input.symbol },
        create: { symbol: input.symbol, name: input.name },
        update: {},
      });
      const proposed = {
        kind: input.kind,
        quantity: new Prisma.Decimal(input.quantity),
        price: minor(input.price),
        fees: minor(input.fees),
        date: new Date(input.date),
      };
      if (input.kind === "DIVIDEND" && proposed.fees > proposed.price)
        throw new BadRequestException("Fees exceed dividend");
      const trades = await tx.trade.findMany({
        where: { portfolioId: id, assetId: asset.id },
        orderBy: [{ date: "asc" }, { createdAt: "asc" }, { id: "asc" }],
      });
      try {
        position(
          [...trades, proposed].sort(
            (a, b) => a.date.getTime() - b.date.getTime(),
          ),
        );
      } catch {
        throw new BadRequestException(
          "Sale exceeds holdings at its trade date",
        );
      }
      const record = await tx.trade.create({
        data: { portfolioId: id, assetId: asset.id, ...proposed },
      });
      await tx.auditLog.create({
        data: { userId, action: "TRADE_CREATE", resourceId: record.id },
      });
      return record;
    }, serializable);
  }
  async dashboard(userId: string, selectedMonth = currentMonth()) {
    const m = validate(month, selectedMonth);
    const [accounts, transactions, budgets, goals, portfolios, recent] =
      await Promise.all([
        this.accounts(userId),
        this.db.transaction.findMany({
          where: { userId, date: monthRange(m), transferId: null },
          include: { category: true },
          orderBy: { date: "asc" },
        }),
        this.budgets(userId, m),
        this.goals(userId),
        this.portfolios(userId),
        this.transactions(userId, { month: m }),
      ]);
    let income = 0n,
      expenses = 0n;
    const groups: Record<string, bigint> = {};
    const daily: Record<string, { income: bigint; expenses: bigint }> = {};
    for (const t of transactions) {
      const d = t.date.toISOString().slice(0, 10);
      daily[d] ??= { income: 0n, expenses: 0n };
      if (t.kind === "INCOME") {
        income += t.amount;
        daily[d].income += t.amount;
      } else {
        expenses += t.amount;
        daily[d].expenses += t.amount;
        groups[t.category.name] = (groups[t.category.name] ?? 0n) + t.amount;
      }
    }
    const balance = accounts.reduce((sum, a) => sum + a.balance, 0n);
    const invested = portfolios.reduce(
      (sum, p) => sum + p.holdings.reduce((n, h) => n + h.cost, 0n),
      0n,
    );
    return {
      month: m,
      currency: "INR",
      income,
      expenses,
      balance,
      netCashFlow: income - expenses,
      savingsRate:
        income > 0n ? Number(((income - expenses) * 10000n) / income) / 100 : 0,
      investmentCost: invested,
      netWorthAtCost: balance + invested,
      accounts,
      budgets,
      goals,
      recent: recent.items,
      spending: Object.entries(groups).map(([name, value]) => ({
        name,
        value,
      })),
      cashflow: Object.entries(daily).map(([date, v]) => ({ date, ...v })),
      insights: [
        ...(income > 0n
          ? [
              `You retained ${money(income - expenses)} INR of this month's recorded income.`,
            ]
          : ["Add income to calculate your savings rate."]),
        ...budgets
          .filter((b) => b.spent > b.amount)
          .map(
            (b) =>
              `${b.category.name} is over budget by INR ${money(b.spent - b.amount)}.`,
          ),
      ],
      dataNote:
        "Account balances are current. Income, expenses, and charts use the selected month. Investments are shown at recorded cost; no live market prices.",
    };
  }
  async forecast(userId: string, body: unknown) {
    const input = validate(
      z
        .object({
          monthly: nonnegative,
          months: z.number().int().min(1).max(600),
          initial: nonnegative.default("0"),
        })
        .strict(),
      body,
    );
    return {
      method: "Zero-return contribution baseline",
      assumptions: [
        "No investment returns, inflation, taxes or withdrawals included.",
        "Contributions occur at the end of each month.",
      ],
      points: Array.from({ length: input.months + 1 }, (_, month) => ({
        month,
        value: minor(input.initial) + minor(input.monthly) * BigInt(month),
      })),
    };
  }
}
