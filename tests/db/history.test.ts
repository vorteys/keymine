import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { Client } from "pg";
import { HISTORY_PAGE_SIZE, loadHistory, parsePage } from "@/lib/history";
import { isPersonalRecord, latestFinishedRaceId, loadRaceResults } from "@/lib/results";

// HIST-01 (pagination), HIST-02 (résultats d'une course passée), RES-04 (record).
const client = new Client({ connectionString: process.env.DATABASE_URL });

beforeAll(async () => {
  await client.connect();
});
afterAll(async () => {
  await client.end();
});

const suffix = () => Math.random().toString(36).slice(2, 8);

async function newUser() {
  const { rows } = await client.query<{ id: string }>(
    `insert into users (username, password_hash, display_name) values ($1, 'x', 'Test') returning id`,
    [`h_${suffix()}`],
  );
  return rows[0].id;
}

async function newLobby(host: string) {
  const { rows } = await client.query<{ id: string; code: string }>(
    `insert into lobbies (code, host_user_id, name, status) values ($1, $2, 'h', 'finished') returning id, code`,
    [`H${suffix().toUpperCase().slice(0, 5)}`, host],
  );
  return rows[0];
}

/** Course terminée (ou non) avec le joueur à un MPM donné + un bot adverse. */
async function race(lobbyId: string, userId: string, wpm: number, minutesAgo: number, status = "finished") {
  const { rows } = await client.query<{ id: string }>(
    `insert into races (lobby_id, text_content, language, status, starts_at, duration_seconds, created_at)
     values ($1, 'abc def', 'fr', $2, now(), 30, now() - ($3 || ' minutes')::interval) returning id`,
    [lobbyId, status, String(minutesAgo)],
  );
  const raceId = rows[0].id;
  await client.query(
    `insert into race_participants (race_id, user_id, display_name, status, wpm, accuracy, rank, finish_ms, text_length, wpm_series)
     values ($1, $2, 'Test', 'finished', $3, 97, 1, 12000, 7, '[{"t":1000,"wpm":40}]')`,
    [raceId, userId, wpm],
  );
  await client.query(
    `insert into race_participants (race_id, display_name, is_bot, bot_level, status, wpm, rank)
     values ($1, 'Bot', true, 'noob', 'finished', 20, 2)`,
    [raceId],
  );
  return raceId;
}

describe("parsePage", () => {
  it("ramène toute entrée à un entier ≥ 1", () => {
    expect(parsePage(undefined)).toBe(1);
    expect(parsePage("0")).toBe(1);
    expect(parsePage("-4")).toBe(1);
    expect(parsePage("abc")).toBe(1);
    expect(parsePage("3")).toBe(3);
    expect(parsePage(["2", "5"])).toBe(2);
  });
});

describe("historique paginé (HIST-01)", () => {
  it("n'affiche que les courses terminées du compte, de la plus récente à la plus ancienne", async () => {
    const user = await newUser();
    const lobby = await newLobby(user);
    const total = HISTORY_PAGE_SIZE + 3;
    for (let i = 0; i < total; i++) await race(lobby.id, user, 30 + i, total - i);
    await race(lobby.id, user, 99, 0, "racing"); // en cours : exclue

    const first = await loadHistory(user, 1);
    expect(first.total).toBe(total);
    expect(first.pages).toBe(2);
    expect(first.rows).toHaveLength(HISTORY_PAGE_SIZE);
    expect(first.rows[0].wpm).toBe(30 + total - 1); // la plus récente en premier
    expect(first.rows[0].participantCount).toBe(2);
    expect(first.rows[0].lobbyCode).toBe(lobby.code);

    const second = await loadHistory(user, 2);
    expect(second.rows).toHaveLength(3);
    expect(second.rows.at(-1)?.wpm).toBe(30);

    const beyond = await loadHistory(user, 99);
    expect(beyond.page).toBe(2); // page hors limites ramenée à la dernière
  });

  it("ne montre pas les courses des autres comptes", async () => {
    const a = await newUser();
    const b = await newUser();
    const lobby = await newLobby(a);
    await race(lobby.id, a, 50, 5);
    expect((await loadHistory(b, 1)).total).toBe(0);
    expect((await loadHistory(b, 1)).rows).toEqual([]);
  });
});

describe("résultats d'une course passée (HIST-02, RES-04)", () => {
  it("recharge classement, courbe MPM et identités", async () => {
    const user = await newUser();
    const lobby = await newLobby(user);
    const raceId = await race(lobby.id, user, 55, 3);
    expect(await latestFinishedRaceId(lobby.id)).toBe(raceId);

    const results = await loadRaceResults(raceId);
    expect(results?.race.status).toBe("finished");
    expect(results?.rows.map((r) => r.rank)).toEqual([1, 2]);
    expect(results?.rows[0].ownerKey).toBe(`u:${user}`);
    expect(results?.rows[0].series).toEqual([{ t: 1000, wpm: 40 }]);
    expect(results?.rows[1].ownerKey).toBeNull(); // bot
  });

  it("détecte un record personnel seulement s'il dépasse les courses précédentes", async () => {
    const user = await newUser();
    const lobby = await newLobby(user);
    const first = await race(lobby.id, user, 40, 30);
    const second = await race(lobby.id, user, 60, 20);
    const third = await race(lobby.id, user, 50, 10);
    expect(await isPersonalRecord(user, first, 40)).toBe(false); // première course : rien à battre
    expect(await isPersonalRecord(user, second, 60)).toBe(true);
    expect(await isPersonalRecord(user, third, 50)).toBe(false);
  });
});

describe("statistiques du profil (AUTH-06)", () => {
  it("compte victoires, courses, moyennes et meilleur MPM sur les courses terminées seulement", async () => {
    const { loadProfileStats } = await import("@/lib/stats");
    const user = await newUser();
    const lobby = await newLobby(user);
    await race(lobby.id, user, 40, 30); // rang 1
    await race(lobby.id, user, 60, 20); // rang 1
    const lost = await race(lobby.id, user, 50, 10);
    await client.query(`update race_participants set rank = 2 where race_id = $1 and user_id = $2`, [lost, user]);
    const quit = await race(lobby.id, user, 10, 5);
    await client.query(`update race_participants set status = 'abandoned', rank = 2 where race_id = $1 and user_id = $2`, [quit, user]);

    const stats = await loadProfileStats(user);
    expect(stats).toMatchObject({ bestWpm: 60, races: 3, wins: 2 });
    expect(stats.avgWpm).toBeCloseTo(50, 5);
    expect(stats.avgAccuracy).toBeCloseTo(97, 5);

    const none = await loadProfileStats(await newUser());
    expect(none).toEqual({ bestWpm: 0, avgWpm: null, avgAccuracy: null, races: 0, wins: 0 });
  });
});
