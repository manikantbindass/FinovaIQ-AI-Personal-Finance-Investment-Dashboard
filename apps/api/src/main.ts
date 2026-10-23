import { createApp } from "./app";
void createApp()
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
