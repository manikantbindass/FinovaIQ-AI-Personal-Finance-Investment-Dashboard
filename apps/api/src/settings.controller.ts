import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Inject,
  Param,
  Patch,
  Req,
  UseGuards,
} from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { z } from "zod";
import { Db } from "./db";
import { AuthedRequest, SessionGuard } from "./auth";
import { text, uuid, validate } from "./validation";
@ApiTags("Settings")
@UseGuards(SessionGuard)
@Controller()
export class SettingsController {
  constructor(@Inject(Db) private readonly db: Db) {}
  @Patch("users/me") profile(@Req() r: AuthedRequest, @Body() b: unknown) {
    const input = validate(z.object({ name: text }).strict(), b);
    return this.db.user.update({
      where: { id: r.userId },
      data: input,
      select: { id: true, name: true, email: true },
    });
  }
  @Get("notifications") notifications(@Req() r: AuthedRequest) {
    return this.db.notification.findMany({
      where: { userId: r.userId },
      take: 50,
      orderBy: { createdAt: "desc" },
    });
  }
  @Patch("notifications/:id") async read(
    @Req() r: AuthedRequest,
    @Param("id") id: string,
  ) {
    return this.db.notification.updateMany({
      where: { userId: r.userId, id: validate(uuid, id) },
      data: { read: true },
    });
  }
  @Get("subscriptions/me") subscription(@Req() r: AuthedRequest) {
    return this.db.subscription.findUnique({ where: { userId: r.userId } });
  }
  @Get("admin/usage") async admin(@Req() r: AuthedRequest) {
    if (r.role !== "ADMIN") throw new ForbiddenException();
    const [users, transactions, usage] = await Promise.all([
      this.db.user.count(),
      this.db.transaction.count(),
      this.db.subscription.aggregate({ _sum: { aiUsage: true } }),
    ]);
    return { users, transactions, aiUsage: usage._sum.aiUsage ?? 0 };
  }
}
