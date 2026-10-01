#!/usr/bin/env bun
// Lance un vrai PostgreSQL local pour le développement, sans rien installer
// sur la machine (binaire embarqué via le paquet npm "embedded-postgres").
// Usage: bun run db:dev
import EmbeddedPostgres from "embedded-postgres";
import path from "node:path";

const dataDir = path.join(import.meta.dirname, "..", ".data", "pgdata");
const port = Number(process.env.DEV_DB_PORT ?? 54329);
const user = "keymine";
const password = "keymine";
const database = "keymine";

const pg = new EmbeddedPostgres({
  databaseDir: dataDir,
  user,
  password,
  port,
  persistent: true,
});

const url = `postgresql://${user}:${password}@127.0.0.1:${port}/${database}`;

async function main() {
  await pg.initialise();
  await pg.start();

  try {
    await pg.createDatabase(database);
  } catch {
    // La base existe déjà, rien à faire.
  }

  console.log(`\n[db:dev] PostgreSQL prêt sur 127.0.0.1:${port}`);
  console.log(`[db:dev] DATABASE_URL=${url}`);
  console.log("[db:dev] Ctrl+C pour arrêter proprement.\n");

  const shutdown = async () => {
    console.log("\n[db:dev] arrêt de PostgreSQL...");
    await pg.stop();
    process.exit(0);
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
