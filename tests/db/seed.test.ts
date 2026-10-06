import { spawnSync } from "node:child_process";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { Client } from "pg";
import { generateTextForRace } from "@/lib/text/service";

// TECH-04 : le script de seed crée corpus, utilisateurs et historique, et
// peut être relancé sans doublons. CONF-03 : le texte vient de la base.
const client = new Client({ connectionString: process.env.DATABASE_URL });

function runSeed() {
  const result = spawnSync("bun", ["run", "db/seed.ts"], { env: process.env, encoding: "utf8" });
  if (result.status !== 0) throw new Error(`seed en échec : ${result.stdout}\n${result.stderr}`);
}

async function counts() {
  const { rows } = await client.query(
    `select (select count(*) from corpus_texts)::int as texts, (select count(*) from corpus_words)::int as words,
            (select count(*) from users where username in ('alice','bruno','camille','dani','eloi'))::int as users,
            (select count(*) from race_participants where user_id is not null)::int as history`,
  );
  return rows[0] as { texts: number; words: number; users: number; history: number };
}

beforeAll(async () => {
  await client.connect();
  runSeed();
}, 60_000);
afterAll(async () => {
  await client.end();
});

describe("script de seed", () => {
  it("crée le corpus, les comptes de démonstration et leur historique", async () => {
    const c = await counts();
    expect(c.texts).toBeGreaterThanOrEqual(20);
    expect(c.words).toBeGreaterThan(300);
    expect(c.users).toBe(5);
    expect(c.history).toBeGreaterThanOrEqual(5 * 14);
    const { rows } = await client.query(`select total_races, best_wpm from users where username = 'camille'`);
    expect(rows[0].total_races).toBe(14);
    expect(rows[0].best_wpm).toBeGreaterThan(50);
  }, 60_000);

  it("est idempotent", async () => {
    const before = await counts();
    runSeed();
    expect(await counts()).toEqual(before);
  }, 60_000);

  it("fournit les textes de course depuis la base (CONF-03)", async () => {
    const text = await generateTextForRace({
      type: "coherent",
      language: "fr",
      length: 30,
      complexity: "easy",
      uppercase: true,
      punctuation: true,
      digits: false,
      accents: true,
      includeChars: [],
      excludeChars: [],
    });
    expect(text.split(" ")).toHaveLength(30);
  });
});
