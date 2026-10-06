import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { Client } from "pg";
import { addBot, removeBot } from "@/lib/lobby-bots";
import { applyLobbySettings } from "@/lib/lobby-settings";
import { lobbyUpdateSchema } from "@/lib/lobby-schema";

// CONF-12 : l'hôte modifie les réglages en salle d'attente, tout le monde est notifié.
const client = new Client({ connectionString: process.env.DATABASE_URL });
const listener = new Client({ connectionString: process.env.DATABASE_URL });
const notified: string[] = [];

beforeAll(async () => {
  await client.connect();
  await listener.connect();
  await listener.query("listen lobby_changed");
  listener.on("notification", (m) => notified.push(m.payload ?? ""));
});
afterAll(async () => {
  await listener.end();
  await client.end();
});

const suffix = () => Math.random().toString(36).slice(2, 8);

async function lobby(status = "lobby") {
  const host = (
    await client.query<{ id: string }>(
      `insert into users (username, password_hash, display_name) values ($1, 'x', 'Hote') returning id`,
      [`s_${suffix()}`],
    )
  ).rows[0].id;
  const row = (
    await client.query<{ id: string; code: string; status: string; include_chars: string[]; exclude_chars: string[] }>(
      `insert into lobbies (code, host_user_id, name, status) values ($1, $2, 's', $3)
       returning id, code, status, include_chars, exclude_chars`,
      [`S${suffix().toUpperCase().slice(0, 5)}`, host, status],
    )
  ).rows[0];
  await client.query(`insert into lobby_players (lobby_id, user_id) values ($1, $2)`, [row.id, host]);
  return row;
}

const read = async (id: string) =>
  (await client.query(`select * from lobbies where id = $1`, [id])).rows[0];

describe("modification des réglages (CONF-12)", () => {
  it("applique une modification partielle et notifie la salle", async () => {
    const l = await lobby();
    notified.length = 0;
    const update = lobbyUpdateSchema.parse({ language: "en", durationSeconds: 60, errorMode: "bloquer" });
    expect(await applyLobbySettings(l, update)).toEqual({ ok: true });

    const after = await read(l.id);
    expect(after).toMatchObject({ language: "en", duration_seconds: 60, error_mode: "bloquer" });
    expect(after.text_type).toBe("coherent"); // le reste est inchangé
    await new Promise((r) => setTimeout(r, 150));
    expect(notified).toContain(l.code);
  });

  it("refuse hors de la salle d'attente", async () => {
    const l = await lobby("racing");
    expect(await applyLobbySettings(l, { language: "en" })).toEqual({ ok: false, reason: "not_waiting" });
    expect((await read(l.id)).language).toBe("fr");
  });

  it("refuse une capacité inférieure au nombre de participants", async () => {
    const l = await lobby(); // l'hôte + 2 invités = 3 participants
    for (let i = 0; i < 2; i++) {
      await client.query(`insert into lobby_players (lobby_id, guest_id, guest_name) values ($1, $2, 'Invité')`, [
        l.id,
        `g-${suffix()}`,
      ]);
    }
    expect(await applyLobbySettings(l, { maxPlayers: 2 })).toEqual({ ok: false, reason: "capacity_too_low" });
    expect(await applyLobbySettings(l, { maxPlayers: 3 })).toEqual({ ok: true });
    expect((await read(l.id)).max_players).toBe(3);
  });

  it("refuse un caractère à la fois inclus et exclu, même si une seule liste change", async () => {
    const l = await lobby();
    expect(await applyLobbySettings(l, { includeChars: ["z"] })).toEqual({ ok: true });
    const current = { ...l, include_chars: ["z"] };
    expect(await applyLobbySettings(current, { excludeChars: ["z"] })).toEqual({
      ok: false,
      reason: "include_exclude_conflict",
    });
    expect((await read(l.id)).exclude_chars).toEqual([]);
  });

  it("le schéma refuse des valeurs hors limites", () => {
    expect(lobbyUpdateSchema.safeParse({ durationSeconds: 5 }).success).toBe(false);
    expect(lobbyUpdateSchema.safeParse({ maxPlayers: 31 }).success).toBe(false);
    expect(lobbyUpdateSchema.safeParse({ includeChars: ["a"], excludeChars: ["a"] }).success).toBe(false);
    expect(lobbyUpdateSchema.safeParse({ hostRole: "spectator" }).success).toBe(true); // clé inconnue ignorée
  });
});

describe("bots de la salle (CONF-10)", () => {
  it("ajoute et retire un bot, refuse hors attente et au-delà de la capacité", async () => {
    const l = await lobby();
    const row = { id: l.id, status: l.status, max_players: 2 };
    expect(await addBot(row, "expert")).toEqual({ ok: true });
    // hôte + 1 bot = capacité atteinte
    expect(await addBot(row, "noob")).toEqual({ ok: false, reason: "full" });

    const bot = (await client.query(`select id from lobby_players where lobby_id = $1 and is_bot`, [l.id])).rows[0];
    expect(await removeBot(row, bot.id)).toEqual({ ok: true });
    expect(await removeBot(row, bot.id)).toEqual({ ok: false, reason: "not_found" });

    expect(await addBot({ ...row, status: "racing" }, "noob")).toEqual({ ok: false, reason: "not_waiting" });
  });

  it("ne retire jamais un joueur humain", async () => {
    const l = await lobby();
    const human = (await client.query(`select id from lobby_players where lobby_id = $1 and not is_bot`, [l.id])).rows[0];
    expect(await removeBot({ id: l.id, status: "lobby" }, human.id)).toEqual({ ok: false, reason: "not_found" });
  });
});
