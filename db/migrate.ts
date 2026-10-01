// Petit lanceur de migrations SQL "fait maison" (pas d'outil externe type Prisma):
// applique dans l'ordre les fichiers db/migrations/*.sql qui n'ont pas encore été
// joués, et garde la trace dans la table _migrations.
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { Client } from "pg";

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL manquant (voir .env.example).");
  }

  const client = new Client({ connectionString: databaseUrl });
  await client.connect();

  try {
    await client.query(
      `create table if not exists _migrations (
         name text primary key,
         applied_at timestamptz not null default now()
       )`,
    );

    const dir = path.join(import.meta.dirname, "migrations");
    const files = readdirSync(dir)
      .filter((f) => f.endsWith(".sql"))
      .sort();

    const { rows } = await client.query<{ name: string }>("select name from _migrations");
    const applied = new Set(rows.map((r) => r.name));

    for (const file of files) {
      if (applied.has(file)) {
        console.log(`[migrate] déjà appliquée: ${file}`);
        continue;
      }
      const sql = readFileSync(path.join(dir, file), "utf8");
      console.log(`[migrate] application de ${file} ...`);
      await client.query("begin");
      try {
        await client.query(sql);
        await client.query("insert into _migrations (name) values ($1)", [file]);
        await client.query("commit");
        console.log(`[migrate] ok: ${file}`);
      } catch (err) {
        await client.query("rollback");
        throw err;
      }
    }
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
