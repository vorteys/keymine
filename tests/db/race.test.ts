import { Client } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  cookie,
  ORIGIN,
  open,
  startServer,
  waitFor,
  waitForAsync,
  type Message,
  type TestServer,
} from "./realtime-helpers";

// Course complète de bout en bout : démarrage par notification Postgres,
// rejet des progressions impossibles, bots, fin, classement et persistance
// (COURSE-01, COURSE-06, COURSE-09, COURSE-10, BOT-04).
const client = new Client({ connectionString: process.env.DATABASE_URL });
let server: TestServer;

beforeAll(async () => {
  await client.connect();
  server = await startServer();
}, 30_000);
afterAll(async () => {
  server?.stop();
  await client.end();
});

const TEXT = "un petit texte pour la course de test";

async function seedRace(startsInMs = 1_000) {
  const suffix = Math.random().toString(36).slice(2, 8);
  const user = (
    await client.query<{ id: string }>(
      `insert into users (username, password_hash, display_name) values ($1, 'x', 'Joueuse') returning id`,
      [`c_${suffix}`],
    )
  ).rows[0].id;
  const lobby = (
    await client.query<{ id: string }>(
      `insert into lobbies (code, host_user_id, name, status) values ($1, $2, 'course', 'countdown') returning id`,
      [`K${suffix.toUpperCase().slice(0, 5)}`, user],
    )
  ).rows[0].id;

  const raceId = await (async () => {
    await client.query("begin");
    const race = await client.query<{ id: string }>(
      `insert into races (lobby_id, text_content, language, status, starts_at, duration_seconds, seed, comeback_bonus)
       values ($1, $2, 'fr', 'countdown', now() + ($3 || ' milliseconds')::interval, 30, 7, false) returning id`,
      [lobby, TEXT, String(startsInMs)],
    );
    const id = race.rows[0].id;
    await client.query(
      `insert into race_participants (race_id, user_id, display_name) values ($1, $2, 'Joueuse')`,
      [id, user],
    );
    await client.query(
      `insert into race_participants (race_id, display_name, is_bot, bot_level) values ($1, 'Bot Impossible', true, 'impossible')`,
      [id],
    );
    await client.query("commit");
    return id;
  })();
  return { user, lobby, raceId };
}

const state = (m?: Message) =>
  m as
    | (Message & {
        phase: string;
        participants: {
          id: string;
          name: string;
          progress: number;
          isBot: boolean;
          status: string;
          rank: number;
        }[];
      })
    | undefined;

describe("course de bout en bout", () => {
  it("refuse une connexion de quelqu'un qui ne participe pas à la course", async () => {
    const { raceId } = await seedRace();
    const stranger = open(server.port, `/?race=${raceId}`, {
      Origin: ORIGIN,
      Cookie: await cookie("km_guest", "inconnu", { name: "x" }),
    });
    expect(await stranger.closed).toBe(4403);
  });

  it("déroule décompte, course, rejet d'un saut, abandon et classement", async () => {
    const { user, lobby, raceId } = await seedRace(1_000);
    await client.query(`insert into lobby_players (lobby_id, user_id) values ($1, $2)`, [
      lobby,
      user,
    ]);
    const conn = open(server.port, `/?race=${raceId}`, {
      Origin: ORIGIN,
      Cookie: await cookie("km_session", user, { username: "c" }),
    });

    // Le texte est envoyé dès la connexion ; la course est d'abord en décompte.
    const text = await waitFor(() => conn.messages.find((m) => m.type === "text"));
    expect(text.text).toBe(TEXT);
    const first = await waitFor(() => state(conn.last("state")));
    expect(first.phase).toBe("countdown");
    expect(first.participants.find((p) => p.isBot)?.name).toBe("Bot Impossible");

    // La course démarre sur l'horloge du serveur.
    await waitFor(() => state(conn.last("state"))?.phase === "racing", 6_000);

    // Un saut impossible est ignoré (COURSE-06).
    conn.ws.send(
      JSON.stringify({ type: "progress", progressChars: TEXT.length - 1, errorCount: 0 }),
    );
    // Un message invalide aussi (TECH-07).
    conn.ws.send("n'importe quoi");
    conn.ws.send(JSON.stringify({ type: "progress", progressChars: "beaucoup" }));
    await new Promise((r) => setTimeout(r, 600));
    const me = state(conn.last("state"))!.participants.find((p) => !p.isBot)!;
    expect(me.progress).toBe(0);

    // Une progression plausible est acceptée.
    conn.ws.send(JSON.stringify({ type: "progress", progressChars: 6, errorCount: 1 }));
    await waitFor(
      () => state(conn.last("state"))?.participants.find((p) => !p.isBot)?.progress === 6,
    );

    // Abandon : tout le monde a fini (le bot arrive tout seul) → résultats.
    conn.ws.send(JSON.stringify({ type: "abandon" }));
    // Le joueur qui abandonne quitte la salle : il peut aller ailleurs et ne revient pas dans cette course.
    await waitForAsync(async () => {
      const { rows } = await client.query(
        `select active from lobby_players where lobby_id = $1 and user_id = $2`,
        [lobby, user],
      );
      return rows[0]?.active === false ? true : null;
    });
    await waitFor(() => state(conn.last("state"))?.phase === "finished", 15_000);

    const rows = await waitForAsync(async () => {
      const { rows } = await client.query(
        `select display_name, status, rank, wpm, raw_wpm, text_length from race_participants where race_id = $1 order by rank`,
        [raceId],
      );
      return rows[0]?.rank ? rows : null;
    });
    expect(rows[0]).toMatchObject({ display_name: "Bot Impossible", status: "finished", rank: 1 });
    expect(rows[1]).toMatchObject({ display_name: "Joueuse", status: "abandoned", rank: 2 });
    expect(rows[1].text_length).toBe(TEXT.length);

    // Les statuts de la salle et de la course sont écrits après les lignes des joueurs.
    const statuses = await waitForAsync(async () => {
      const lobbyRow = await client.query(`select status from lobbies where id = $1`, [lobby]);
      const raceRow = await client.query(`select status from races where id = $1`, [raceId]);
      return lobbyRow.rows[0].status === "finished" && raceRow.rows[0].status === "finished"
        ? true
        : null;
    });
    expect(statuses).toBe(true);
    conn.ws.close();
  }, 40_000);

  it("démarre tout seul à l'heure prévue même si personne n'est connecté", async () => {
    const { lobby, raceId } = await seedRace(500);
    await waitForAsync(async () => {
      const { rows } = await client.query(`select status from lobbies where id = $1`, [lobby]);
      return rows[0].status === "racing";
    }, 6_000);
    expect(raceId).toBeTruthy();
  }, 20_000);
});
