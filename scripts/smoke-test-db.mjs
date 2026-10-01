#!/usr/bin/env bun
// Validation ponctuelle du schéma: démarre Postgres, joue les migrations,
// fait quelques requêtes de base, puis arrête. Pas un test automatisé du
// projet (voir tests/), juste un outil de vérification pendant le dev.
import EmbeddedPostgres from "embedded-postgres";
import path from "node:path";
import { Client } from "pg";

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
const code = await migrate.exited;
if (code !== 0) throw new Error("migration échouée");

const client = new Client({ connectionString: url });
await client.connect();
const tables = await client.query(
  `select table_name from information_schema.tables where table_schema = 'public' order by 1`,
);
console.log(
  "[smoke] tables:",
  tables.rows.map((r) => r.table_name),
);

const user = await client.query(
  `insert into users (username, password_hash, display_name) values ($1, $2, $3) returning id, username`,
  ["alexy_test", "x".repeat(60), "Alexy"],
);
console.log("[smoke] user inséré:", user.rows[0]);

const lobby = await client.query(
  `insert into lobbies (code, host_user_id, name) values ($1, $2, $3) returning id, code`,
  ["smoke01", user.rows[0].id, "Lobby de test"],
);
console.log("[smoke] lobby inséré:", lobby.rows[0]);

await client.end();
await pg.stop();
console.log("[smoke] OK");
