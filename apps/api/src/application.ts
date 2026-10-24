import "reflect-metadata";
// Keep the reusable factory separate from Vercel's executable main.ts entrypoint.
import "dotenv/config";
import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  INestApplication,
  Module,
} from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";
import { NestFactory } from "@nestjs/core";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { Prisma } from "@prisma/client";
import type { Request, Response, NextFunction } from "express";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import { AuthController, AuthService, SessionGuard } from "./auth";
import { Db } from "./db";
import { FinanceService } from "./finance.service";
import { FinanceController } from "./finance.controller";
import { AiController } from "./ai.controller";
import { SettingsController } from "./settings.controller";
@Catch()
class SafeErrors implements ExceptionFilter {
  catch(error: unknown, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse<Response>();
    let status = 500,
      message = "An internal error occurred";
    if (error instanceof HttpException) {
      status = error.getStatus();
      message = error.message;
    } else if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2002") {
        status = 409;
        message = "Record already exists";
      }
      if (error.code === "P2003") {
        status = 400;
        message = "Invalid related record";
      }
      if (error.code === "P2034") {
        status = 409;
        message = "Concurrent update; retry the request";
      }
      if (error.code === "P2025") {
        status = 404;
        message = "Record not found";
      }
    }
    if (status === 500)
      console.error(
        JSON.stringify({
          level: "error",
          event: "request_failed",
          type: error instanceof Error ? error.name : "unknown",
        }),
      );
    response.status(status).json({ error: { status, message } });
  }
}
@Module({
  imports: [ThrottlerModule.forRoot([{ ttl: 60000, limit: 90 }])],
  controllers: [
    AuthController,
    FinanceController,
    AiController,
    SettingsController,
  ],
  providers: [
    Db,
    AuthService,
    SessionGuard,
    FinanceService,
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}
export async function createApp() {
  const app = await NestFactory.create(AppModule, {
    logger: ["error", "warn", "log"],
  });
  return configureApp(app);
}
export function configureApp(app: INestApplication) {
  const origin = process.env.WEB_ORIGIN ?? "http://localhost:3000";
  app.use(helmet());
  app.use(cookieParser());
  app.enableCors({ origin, credentials: true });
  app.use((req: Request, res: Response, next: NextFunction) => {
    if (
      !["GET", "HEAD", "OPTIONS"].includes(req.method) &&
      req.headers.origin !== origin
    ) {
      res.status(403).json({
        error: { status: 403, message: "Trusted Origin header required" },
      });
      return;
    }
    next();
  });
  app.useGlobalFilters(new SafeErrors());
  app.setGlobalPrefix("api/v1");
  const document = SwaggerModule.createDocument(
    app,
    new DocumentBuilder()
      .setTitle("FinovaIQ API")
      .setDescription(
        "Money fields are strings in minor units; create/update inputs are decimal rupee strings. See API.md for schemas.",
      )
      .setVersion("1.0")
      .addCookieAuth("finovaiq_session")
      .build(),
  );
  SwaggerModule.setup("api/docs", app, document);
  const express = app.getHttpAdapter().getInstance();
  express.set("json replacer", (_key: string, value: unknown) =>
    typeof value === "bigint" ? value.toString() : value,
  );
  // Opening the backend deployment should lead visitors to the web application.
  // Use only server configuration, never a request parameter, as the destination.
  express.get("/", (_req: Request, res: Response) => {
    res.set("Cache-Control", "no-store");
    res.redirect(302, origin);
  });
  express.get("/api/v1/health", async (_req: Request, res: Response) => {
    try {
      await app.get(Db).$queryRaw`SELECT 1`;
      res.json({
        status: "ok",
        database: "connected",
        aiMode: process.env.AI_MODE ?? "demo",
      });
    } catch {
      res.status(503).json({ status: "degraded", database: "unavailable" });
    }
  });
  app.enableShutdownHooks();
  return app;
}
