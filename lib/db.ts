import { Kysely, PostgresDialect } from "kysely";
import { Pool } from "pg";
import type { Database } from "@/db/types";

declare global {
  var __keymineDb: Kysely<Database> | undefined;
}

function createDb() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error(
      "DATABASE_URL manquant. Copie .env.example vers .env et démarre Postgres (bun run db:dev).",
    );
  }

  return new Kysely<Database>({
    dialect: new PostgresDialect({
      pool: new Pool({ connectionString, max: 10 }),
    }),
  });
}

// En dev, Next.js recharge les modules à chaud: on garde une seule instance
// du pool de connexions sur `globalThis` pour ne pas en ouvrir un nouveau à
// chaque rechargement.
export const db = globalThis.__keymineDb ?? createDb();

if (process.env.NODE_ENV !== "production") {
  globalThis.__keymineDb = db;
}
