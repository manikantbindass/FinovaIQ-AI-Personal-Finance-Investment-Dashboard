import EmbeddedPostgres from "embedded-postgres";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
const databaseDir = resolve(".local/postgres");
const pg = new EmbeddedPostgres({
  databaseDir,
  user: "finovaiq",
  password: "local-development-only",
  port: 5432,
  persistent: true,
  authMethod: "scram-sha-256",
  postgresFlags: ["-h", "127.0.0.1"],
  onLog: () => {},
  onError: (message) => console.error(String(message)),
});
if (!existsSync(resolve(databaseDir, "PG_VERSION"))) await pg.initialise();
await pg.start();
const client = pg.getPgClient();
await client.connect();
const exists = await client.query(
  "SELECT 1 FROM pg_database WHERE datname = 'finovaiq'",
);
await client.end();
if (!exists.rowCount) await pg.createDatabase("finovaiq");
console.log(
  "FinovaIQ local PostgreSQL ready on 127.0.0.1:5432. Data: .local/postgres. Ctrl+C stops it.",
);
const timer = setInterval(() => {}, 60000);
for (const signal of ["SIGINT", "SIGTERM"])
  process.on(signal, async () => {
    clearInterval(timer);
    await pg.stop();
    process.exit(0);
  });
