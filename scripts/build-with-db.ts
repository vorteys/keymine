// Utilitaire de vérification: démarre Postgres, migre, puis lance une
// commande (ex: next build) avec DATABASE_URL déjà en place. Pas utilisé en
// production — juste pour valider localement ou en CI qu'on peut construire
// avec une vraie base. Usage: bun run scripts/build-with-db.ts <commande...>
import EmbeddedPostgres from "embedded-postgres";
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
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

if (!existsSync(path.join(dataDir, "PG_VERSION"))) {
  await pg.initialise();
}
await pg.start();
try {
  await pg.createDatabase("keymine");
} catch {
  // déjà créée
}

function run(cmd: string[], extraEnv: Record<string, string>): number {
  const [bin, ...args] = cmd;
  const result = spawnSync(bin, args, {
    stdio: "inherit",
    env: { ...process.env, DATABASE_URL: url, ...extraEnv },
  });
  return result.status ?? 1;
}

let code = run(["bun", "run", "db/migrate.ts"], {});
if (code === 0) {
  code = run(process.argv.slice(2), { SESSION_SECRET: "dev-smoke-test-secret" });
}
await pg.stop();
process.exit(code);
