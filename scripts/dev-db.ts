/**
 * Local development database.
 * Starts a real PostgreSQL server from the `embedded-postgres` npm package
 * (no admin install, no Docker). Data lives in ./.pgdata and survives restarts.
 *
 *   npm run db:start      (keep the window open; Ctrl+C to stop)
 *
 * On the university server use docker-compose instead (see docs/DEPLOYMENT.md).
 */
import EmbeddedPostgres from "embedded-postgres";
import { existsSync } from "node:fs";
import path from "node:path";

const PORT = Number(process.env.DEV_DB_PORT ?? 5433);
const DB_NAME = "siam_library";
const dataDir = path.resolve(".pgdata");

async function main() {
  const firstRun = !existsSync(path.join(dataDir, "PG_VERSION"));
  const pg = new EmbeddedPostgres({
    databaseDir: dataDir,
    user: "postgres",
    password: "postgres",
    port: PORT,
    persistent: true,
    autoRehydrateSymlinks: true,
    // Windows defaults to WIN1252, which cannot store Thai — force UTF-8.
    initdbFlags: ["--encoding=UTF8", "--locale=C"],
    onLog: () => {},
  });

  if (firstRun) {
    console.log("Creating local PostgreSQL cluster in .pgdata ...");
    await pg.initialise();
  }
  await pg.start();
  if (firstRun) await pg.createDatabase(DB_NAME);

  console.log(`PostgreSQL running on localhost:${PORT}  (database: ${DB_NAME})`);
  console.log(`DATABASE_URL="postgresql://postgres:postgres@localhost:${PORT}/${DB_NAME}"`);
  console.log("Press Ctrl+C to stop.");

  const stop = async () => {
    console.log("\nStopping PostgreSQL ...");
    await pg.stop();
    process.exit(0);
  };
  process.on("SIGINT", stop);
  process.on("SIGTERM", stop);
  // keep the process alive
  setInterval(() => {}, 1 << 30);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
