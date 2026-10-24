import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { AppModule, configureApp } from "./application";

// Vercel identifies NestJS through the executable entrypoint's direct import.
void NestFactory.create(AppModule, { logger: ["error", "warn", "log"] })
  .then(configureApp)
  .then((app) =>
    app.listen(
      Number(process.env.PORT ?? 4000),
      process.env.HOST ?? "127.0.0.1",
    ),
  )
  .catch(() => {
    console.error("API startup failed; check environment and database");
    process.exitCode = 1;
  });
