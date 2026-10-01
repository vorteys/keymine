#!/usr/bin/env bun
// Utilitaire de vérification: démarre Postgres, migre, puis lance une
// commande (ex: next build) avec DATABASE_URL déjà en place. Pas utilisé en
// production — juste pour valider localement que tout se construit avec une
// vraie base.
import EmbeddedPostgres from "embedded-postgres";
import path from "node:path";

const dataDir = path.join(import.meta.dirname, "..", ".data", "pgdata");
const port = 54329;
const url = `postgresql://keymine:keymine@127.0.0.1:${port}/keymine`;

const pg = new EmbeddedPostgres({
  databaseDir: dataDir,
  user: "keymine",
  password: "keymine",
  port,
  persistent: true,
});

await pg.initialise();
await pg.start();
try {
  await pg.createDatabase("keymine");
} catch {
  // déjà créée
}

const migrate = Bun.spawn(["bun", "run", "db/migrate.ts"], {
  env: { ...process.env, DATABASE_URL: url },
  stdout: "inherit",
  stderr: "inherit",
});
if ((await migrate.exited) !== 0) {
  await pg.stop();
  process.exit(1);
}

const cmd = process.argv.slice(2);
const child = Bun.spawn(cmd, {
  env: { ...process.env, DATABASE_URL: url, SESSION_SECRET: "dev-smoke-test-secret" },
  stdout: "inherit",
  stderr: "inherit",
});
const code = await child.exited;
await pg.stop();
process.exit(code);
