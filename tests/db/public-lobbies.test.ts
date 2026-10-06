import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { Client } from "pg";
import { listPublicLobbies, publicLobbyFilters } from "@/lib/public-lobbies";

// JOIN-02 : l'explorateur ne liste que les salles publiques, avec filtres.
const client = new Client({ connectionString: process.env.DATABASE_URL });

beforeAll(async () => {
  await client.connect();
});
afterAll(async () => {
  await client.end();
});

const suffix = () => Math.random().toString(36).slice(2, 8);

async function lobby(opts: { access?: string; language?: string; complexity?: string; status?: string; max?: number; name: string }) {
  const host = (
    await client.query<{ id: string }>(
      `insert into users (username, password_hash, display_name) values ($1, 'x', $2) returning id`,
      [`p_${suffix()}`, `Hote ${opts.name}`],
    )
  ).rows[0].id;
  const row = (
    await client.query<{ id: string; code: string }>(
      `insert into lobbies (code, host_user_id, name, access, language, complexity, status, max_players)
       values ($1, $2, $3, $4, $5, $6, $7, $8) returning id, code`,
      [
        `P${suffix().toUpperCase().slice(0, 5)}`,
        host,
        opts.name,
        opts.access ?? "public",
        opts.language ?? "fr",
        opts.complexity ?? "easy",
        opts.status ?? "lobby",
        opts.max ?? 10,
      ],
    )
  ).rows[0];
  await client.query(`insert into lobby_players (lobby_id, user_id) values ($1, $2)`, [row.id, host]);
  return row;
}

describe("explorateur de salles publiques (JOIN-02)", () => {
  it("ne liste que les salles publiques non fermées, avec hôte, effectif et état", async () => {
    const tag = suffix();
    const open = await lobby({ name: `ouverte-${tag}` });
    await lobby({ name: `privee-${tag}`, access: "private" });
    await lobby({ name: `surcode-${tag}`, access: "unlisted" });
    await lobby({ name: `fermee-${tag}`, status: "closed" });
    await lobby({ name: `course-${tag}`, status: "racing" });
    // un spectateur et un joueur inactif ne comptent pas dans l'effectif
    await client.query(`insert into lobby_players (lobby_id, guest_id, guest_name, role) values ($1, $2, 'S', 'spectator')`, [open.id, `g-${suffix()}`]);
    await client.query(`insert into lobby_players (lobby_id, guest_id, guest_name, active) values ($1, $2, 'X', false)`, [open.id, `g-${suffix()}`]);

    const list = (await listPublicLobbies()).filter((l) => l.name.endsWith(tag));
    expect(list.map((l) => l.name).sort()).toEqual([`course-${tag}`, `ouverte-${tag}`]);

    const found = list.find((l) => l.code === open.code)!;
    expect(found).toMatchObject({ players: 1, capacity: 10, status: "lobby", joinable: true, hostName: `Hote ouverte-${tag}` });
    expect(list.find((l) => l.name === `course-${tag}`)).toMatchObject({ status: "racing", joinable: false });
  });

  it("filtre par langue et par complexité", async () => {
    const tag = suffix();
    await lobby({ name: `fr-facile-${tag}`, language: "fr", complexity: "easy" });
    await lobby({ name: `en-facile-${tag}`, language: "en", complexity: "easy" });
    await lobby({ name: `en-dur-${tag}`, language: "en", complexity: "hard" });
    const names = async (f: Parameters<typeof listPublicLobbies>[0]) =>
      (await listPublicLobbies(f)).filter((l) => l.name.endsWith(tag)).map((l) => l.name).sort();

    expect(await names({ language: "en" })).toEqual([`en-dur-${tag}`, `en-facile-${tag}`]);
    expect(await names({ complexity: "easy" })).toEqual([`en-facile-${tag}`, `fr-facile-${tag}`]);
    expect(await names({ language: "en", complexity: "hard" })).toEqual([`en-dur-${tag}`]);
  });

  it("une salle pleine n'est pas joignable", async () => {
    const tag = suffix();
    const full = await lobby({ name: `pleine-${tag}`, max: 2 });
    await client.query(`insert into lobby_players (lobby_id, guest_id, guest_name) values ($1, $2, 'B')`, [full.id, `g-${suffix()}`]);
    const found = (await listPublicLobbies()).find((l) => l.code === full.code)!;
    expect(found).toMatchObject({ players: 2, capacity: 2, joinable: false });
  });

  it("le schéma de filtres refuse les valeurs inconnues", () => {
    expect(publicLobbyFilters.safeParse({ language: "de" }).success).toBe(false);
    expect(publicLobbyFilters.safeParse({ complexity: "extreme" }).success).toBe(false);
    expect(publicLobbyFilters.safeParse({}).success).toBe(true);
  });
});
