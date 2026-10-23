import {
  BadRequestException,
  Body,
  CanActivate,
  Controller,
  ExecutionContext,
  Get,
  Inject,
  Injectable,
  Post,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { randomBytes, createHash } from "node:crypto";
import { compare, hash } from "bcryptjs";
import type { Request, Response } from "express";
import { z } from "zod";
import nodemailer from "nodemailer";
import { Db } from "./db";
import { validate, text } from "./validation";
import { currentMonth } from "./finance";
export interface AuthedRequest extends Request {
  userId: string;
  role: string;
}
const digest = (value: string) =>
  createHash("sha256").update(value).digest("hex");
const password = z
  .string()
  .min(12)
  .max(72)
  .refine(
    (value) => Buffer.byteLength(value, "utf8") <= 72,
    "Password must fit within 72 UTF-8 bytes",
  )
  .regex(/[A-Za-z]/)
  .regex(/[0-9]/);
const email = z
  .email()
  .max(254)
  .transform((v) => v.toLowerCase());
const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
};
@Injectable()
export class AuthService {
  constructor(@Inject(Db) private readonly db: Db) {}
  async session(userId: string, res: Response) {
    const token = randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 7 * 86400000);
    await this.db.session.create({
      data: { userId, tokenHash: digest(token), expiresAt },
    });
    res.cookie("finovaiq_session", token, {
      ...cookieOptions,
      expires: expiresAt,
    });
  }
  async sendToken(userId: string, address: string, kind: "verify" | "reset") {
    const token = randomBytes(32).toString("hex");
    await this.db.authToken.create({
      data: {
        userId,
        tokenHash: digest(token),
        kind,
        expiresAt: new Date(Date.now() + 3600000),
      },
    });
    const link = `${process.env.WEB_ORIGIN ?? "http://localhost:3000"}/?action=${kind}&token=${token}`;
    if (process.env.SMTP_URL) {
      await nodemailer.createTransport(process.env.SMTP_URL).sendMail({
        from: process.env.MAIL_FROM,
        to: address,
        subject: `FinovaIQ: ${kind === "verify" ? "verify your email" : "reset password"}`,
        text: `Open this link within one hour: ${link}`,
      });
    } else if (process.env.NODE_ENV !== "production") return link;
    else throw new BadRequestException("Email delivery is not configured");
  }
}
@Injectable()
export class SessionGuard implements CanActivate {
  constructor(@Inject(Db) private readonly db: Db) {}
  async canActivate(context: ExecutionContext) {
    const req = context.switchToHttp().getRequest<AuthedRequest>();
    const token = (req.cookies as Record<string, unknown> | undefined)
      ?.finovaiq_session;
    if (typeof token !== "string")
      throw new UnauthorizedException("Sign in to continue");
    const session = await this.db.session.findUnique({
      where: { tokenHash: digest(token) },
      include: { user: true },
    });
    if (!session || session.expiresAt.getTime() <= Date.now())
      throw new UnauthorizedException("Session expired");
    req.userId = session.userId;
    req.role = session.user.role;
    return true;
  }
}
@ApiTags("Authentication")
@Controller("auth")
export class AuthController {
  constructor(
    @Inject(Db) private readonly db: Db,
    @Inject(AuthService) private readonly auth: AuthService,
  ) {}
  @Post("register") async register(
    @Body() body: unknown,
    @Res({ passthrough: true }) res: Response,
  ) {
    const input = validate(
      z.object({ email, password, name: text }).strict(),
      body,
    );
    if (process.env.NODE_ENV === "production" && !process.env.SMTP_URL)
      throw new BadRequestException(
        "Registration requires configured email delivery",
      );
    const passwordHash = await hash(input.password, 12);
    const user = await this.db.user.create({
      data: {
        email: input.email,
        name: input.name,
        passwordHash,
        subscription: { create: { usageMonth: currentMonth() } },
      },
    });
    const verificationLink = await this.auth.sendToken(
      user.id,
      user.email,
      "verify",
    );
    await this.auth.session(user.id, res);
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      verified: user.verified,
      verificationLink,
    };
  }
  @Post("login") async login(
    @Body() body: unknown,
    @Res({ passthrough: true }) res: Response,
  ) {
    const input = validate(
      z.object({ email, password: z.string().min(1).max(72) }).strict(),
      body,
    );
    const user = await this.db.user.findUnique({
      where: { email: input.email },
    });
    // Run a comparison even for missing users to reduce account-enumeration timing differences.
    const valid = await compare(
      input.password,
      user?.passwordHash ??
        "$2b$12$vFKt0TXlVQ43cKLOniXfqehYxHtX7QJK5OuSwdnkVcyYELOtV.4vi",
    );
    if (!user || !valid)
      throw new UnauthorizedException("Invalid email or password");
    if (process.env.NODE_ENV === "production" && !user.verified)
      throw new UnauthorizedException("Verify your email before signing in");
    await this.auth.session(user.id, res);
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      verified: user.verified,
    };
  }
  @Get("me") @UseGuards(SessionGuard) async me(@Req() req: AuthedRequest) {
    return this.db.user.findUnique({
      where: { id: req.userId },
      select: { id: true, name: true, email: true, verified: true, role: true },
    });
  }
  @Post("logout") @UseGuards(SessionGuard) async logout(
    @Req() req: AuthedRequest,
    @Res({ passthrough: true }) res: Response,
  ) {
    const token = (req.cookies as Record<string, string>).finovaiq_session;
    await this.db.session.deleteMany({ where: { tokenHash: digest(token) } });
    res.clearCookie("finovaiq_session", cookieOptions);
    return { success: true };
  }
  @Post("forgot-password") async forgot(@Body() body: unknown) {
    const input = validate(z.object({ email }).strict(), body);
    const user = await this.db.user.findUnique({
      where: { email: input.email },
    });
    const resetLink = user
      ? await this.auth.sendToken(user.id, user.email, "reset")
      : undefined;
    return {
      message: "If that address is registered, a reset link has been sent.",
      resetLink,
    };
  }
  @Post("verify") async verify(@Body() body: unknown) {
    return this.consume(body, "verify");
  }
  @Post("reset-password") async reset(@Body() body: unknown) {
    return this.consume(body, "reset");
  }
  private async consume(body: unknown, kind: "verify" | "reset") {
    const input = validate(
      z
        .object({
          token: z.string().regex(/^[a-f0-9]{64}$/),
          password: kind === "reset" ? password : password.optional(),
        })
        .strict(),
      body,
    );
    const passwordHash = input.password
      ? await hash(input.password, 12)
      : undefined;
    await this.db.$transaction(async (tx) => {
      const token = await tx.authToken.findUnique({
        where: { tokenHash: digest(input.token) },
      });
      if (
        !token ||
        token.kind !== kind ||
        token.expiresAt.getTime() < Date.now()
      )
        throw new BadRequestException("Invalid or expired link");
      // deleteMany gates one-time use even when two requests race.
      const consumed = await tx.authToken.deleteMany({
        where: { id: token.id },
      });
      if (!consumed.count) throw new BadRequestException("Link already used");
      await tx.user.update({
        where: { id: token.userId },
        data: kind === "verify" ? { verified: true } : { passwordHash },
      });
      if (kind === "reset") {
        await tx.session.deleteMany({ where: { userId: token.userId } });
        await tx.authToken.deleteMany({
          where: { userId: token.userId, kind: "reset" },
        });
      }
    });
    return { success: true };
  }
}
