// Petit serveur TypeScript séparé pour le temps réel (H17): positions des
// joueurs en direct, bots simulés serveur, classement final calculé ici
// plutôt que fait confiance au client (JEU-8/JEU-9). Next.js ne gère que le
// HTTP (création de lobby, résultats, stats); ce process ne gère que les
// courses en cours, en mémoire, avec quelques écritures Postgres.
import { WebSocketServer, type WebSocket } from "ws";
import { db } from "@/lib/db";
import { mergeKeyStats, recomputeUserStats } from "@/lib/stats";
import { botCharsAt, botShouldError } from "./bots";
import { allowedOrigins, identityFromCookies, isAllowedOrigin, type RealtimeIdentity } from "./auth";
import { attachLobbySocket, startLobbyChannel } from "./lobby-channel";
import {
  createRateLimiter,
  lobbyConnectionQuery,
  parseMessage,
  raceClientMessage,
  raceConnectionQuery,
} from "./protocol";
import type { BotLevel, ParticipantStatus } from "@/db/types";

const PORT = Number(process.env.REALTIME_PORT ?? 4001);
const CHECKPOINT_MS = 2_000; // persistance périodique pour la reconnexion (COUR-15)
const BOT_TICK_MS = 350;
const MAX_WPM = 250; // H20: vitesses impossibles rejetées

type ParticipantState = {
  id: string;
  displayName: string;
  isBot: boolean;
  botLevel: BotLevel | null;
  userId: string | null;
  guestId: string | null;
  role: "participant" | "spectator";
  progressChars: number;
  errorCount: number;
  status: ParticipantStatus;
  wpm: number;
  accuracy: number;
  finishedAtMs: number | null;
  rank: number | null;
  keyCorrect: Record<string, number>;
  keyErrors: Record<string, number>;
  socket: WebSocket | null;
  botSeed: number;
};

type RaceRoom = {
  raceId: string;
  textLength: number;
  durationSeconds: number;
  startsAtMs: number;
  participants: Map<string, ParticipantState>;
  spectators: Set<WebSocket>;
  finalized: boolean;
  startTimer: ReturnType<typeof setTimeout> | null;
  endTimer: ReturnType<typeof setTimeout> | null;
  botTimer: ReturnType<typeof setInterval> | null;
  checkpointTimer: ReturnType<typeof setInterval> | null;
};

const rooms = new Map<string, RaceRoom>();

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function computeWpm(correctChars: number, elapsedMs: number): number {
  if (elapsedMs <= 0) return 0;
  const minutes = elapsedMs / 60_000;
  return correctChars / 5 / minutes;
}

function snapshot(room: RaceRoom) {
  const list = [...room.participants.values()]
    .filter((p) => p.role === "participant")
    .map((p) => ({
      id: p.id,
      name: p.displayName,
      isBot: p.isBot,
      progressChars: p.progressChars,
      errorCount: p.errorCount,
      status: p.status,
      wpm: Math.round(p.wpm),
      accuracy: Math.round(p.accuracy),
      rank: p.rank,
    }))
    .sort((a, b) => b.progressChars - a.progressChars);

  const now = Date.now();
  return {
    type: "state" as const,
    raceId: room.raceId,
    phase: now < room.startsAtMs ? "countdown" : room.finalized ? "finished" : "racing",
    startsAt: room.startsAtMs,
    serverNow: now,
    participants: list,
  };
}

function broadcast(room: RaceRoom) {
  const payload = JSON.stringify(snapshot(room));
  for (const p of room.participants.values()) {
    if (p.socket && p.socket.readyState === p.socket.OPEN) p.socket.send(payload);
  }
  for (const s of room.spectators) {
    if (s.readyState === s.OPEN) s.send(payload);
  }
}

async function checkpoint(room: RaceRoom) {
  for (const p of room.participants.values()) {
    if (p.role !== "participant" || p.status !== "racing") continue;
    await db
      .updateTable("race_participants")
      .set({ progress_chars: p.progressChars, error_count: p.errorCount })
      .where("id", "=", p.id)
      .execute();
  }
}

/** JEU-8: le classement final est calculé par le serveur, pas par le client. */
async function finalizeRace(room: RaceRoom) {
  if (room.finalized) return;
  room.finalized = true;

  if (room.botTimer) clearInterval(room.botTimer);
  if (room.checkpointTimer) clearInterval(room.checkpointTimer);
  if (room.endTimer) clearTimeout(room.endTimer);

  const now = Date.now();
  const participants = [...room.participants.values()].filter((p) => p.role === "participant");

  for (const p of participants) {
    if (p.status === "racing") {
      // COUR-12: le temps est écoulé, les non-finalistes sont classés au
      // pourcentage du texte tapé (H6), sans record.
      p.status = "abandoned";
      p.finishedAtMs = now;
    }
  }

  const ranked = [...participants].sort((a, b) => {
    if (a.status === "finished" && b.status !== "finished") return -1;
    if (b.status === "finished" && a.status !== "finished") return 1;
    if (a.status === "finished" && b.status === "finished") {
      return (a.finishedAtMs ?? 0) - (b.finishedAtMs ?? 0);
    }
    return b.progressChars - a.progressChars;
  });
  ranked.forEach((p, i) => (p.rank = i + 1));

  for (const p of participants) {
    await db
      .updateTable("race_participants")
      .set({
        status: p.status,
        progress_chars: p.progressChars,
        error_count: p.errorCount,
        wpm: p.wpm,
        accuracy: p.accuracy,
        rank: p.rank,
        finished_at: p.finishedAtMs ? new Date(p.finishedAtMs) : null,
        key_correct: JSON.stringify(p.keyCorrect),
        key_errors: JSON.stringify(p.keyErrors),
      })
      .where("id", "=", p.id)
      .execute();

    if (p.userId) {
      await mergeKeyStats(p.userId, p.keyCorrect, p.keyErrors);
      await recomputeUserStats(p.userId);
    }
  }

  await db
    .updateTable("races")
    .set({ status: "finished", ends_at: new Date(now) })
    .where("id", "=", room.raceId)
    .execute();

  const race = await db.selectFrom("races").select("lobby_id").where("id", "=", room.raceId).executeTakeFirst();
  if (race) {
    await db.updateTable("lobbies").set({ status: "finished" }).where("id", "=", race.lobby_id).execute();
  }

  broadcast(room);
}

function finishParticipant(room: RaceRoom, p: ParticipantState) {
  if (p.status !== "racing") return;
  p.status = "finished";
  p.finishedAtMs = Date.now();
  p.wpm = clamp(computeWpm(p.progressChars, p.finishedAtMs - room.startsAtMs), 0, MAX_WPM);

  const everyoneDone = [...room.participants.values()]
    .filter((x) => x.role === "participant")
    .every((x) => x.status !== "racing");
  if (everyoneDone) void finalizeRace(room);
}

function tickBots(room: RaceRoom) {
  const now = Date.now();
  if (now < room.startsAtMs) return;
  const elapsed = now - room.startsAtMs;

  for (const p of room.participants.values()) {
    if (!p.isBot || p.status !== "racing") continue;
    const target = clamp(botCharsAt(p.botLevel ?? "intermediaire", elapsed, p.botSeed), 0, room.textLength);
    if (target > p.progressChars) {
      const delta = target - p.progressChars;
      for (let i = 0; i < delta; i++) {
        if (botShouldError(p.botLevel ?? "intermediaire")) p.errorCount += 1;
      }
      p.progressChars = target;
      p.accuracy = clamp(
        100 * (1 - p.errorCount / Math.max(1, p.progressChars + p.errorCount)),
        0,
        100,
      );
      p.wpm = computeWpm(p.progressChars, elapsed);
    }
    if (p.progressChars >= room.textLength) finishParticipant(room, p);
  }

  broadcast(room);
}

function scheduleRoom(room: RaceRoom) {
  const now = Date.now();
  const untilStart = Math.max(0, room.startsAtMs - now);

  room.startTimer = setTimeout(() => {
    broadcast(room);
    room.botTimer = setInterval(() => tickBots(room), BOT_TICK_MS);
    room.checkpointTimer = setInterval(() => void checkpoint(room), CHECKPOINT_MS);
  }, untilStart);

  room.endTimer = setTimeout(
    () => void finalizeRace(room),
    untilStart + room.durationSeconds * 1000,
  );
}

async function loadRoom(raceId: string): Promise<RaceRoom | null> {
  const existing = rooms.get(raceId);
  if (existing) return existing;

  const race = await db.selectFrom("races").selectAll().where("id", "=", raceId).executeTakeFirst();
  if (!race) return null;

  const rows = await db
    .selectFrom("race_participants")
    .selectAll()
    .where("race_id", "=", raceId)
    .execute();

  const participants = new Map<string, ParticipantState>();
  let seed = 1;
  for (const p of rows) {
    participants.set(p.id, {
      id: p.id,
      displayName: p.display_name,
      isBot: p.is_bot,
      botLevel: p.bot_level,
      userId: p.user_id,
      guestId: p.guest_id,
      role: p.role,
      progressChars: p.progress_chars,
      errorCount: p.error_count,
      status: p.status,
      wpm: p.wpm ?? 0,
      accuracy: p.accuracy ?? 100,
      finishedAtMs: p.finished_at ? new Date(p.finished_at).getTime() : null,
      rank: p.rank,
      keyCorrect: (p.key_correct as Record<string, number> | null) ?? {},
      keyErrors: (p.key_errors as Record<string, number> | null) ?? {},
      socket: null,
      botSeed: seed++,
    });
  }

  const room: RaceRoom = {
    raceId,
    textLength: race.text_content.length,
    durationSeconds: race.duration_seconds,
    startsAtMs: new Date(race.starts_at).getTime(),
    participants,
    spectators: new Set(),
    finalized: race.status === "finished",
    startTimer: null,
    endTimer: null,
    botTimer: null,
    checkpointTimer: null,
  };
  rooms.set(raceId, room);
  if (!room.finalized) scheduleRoom(room);
  return room;
}

const SESSION_SECRET = process.env.SESSION_SECRET;
if (!SESSION_SECRET) throw new Error("SESSION_SECRET manquant (voir .env.example).");
const ORIGINS = allowedOrigins();

const wss = new WebSocketServer({ port: PORT, maxPayload: 16 * 1024 });
console.log(`[realtime] serveur WebSocket KeyMine sur le port ${PORT}`);

// Détection des connexions mortes : un client qui ne répond pas au ping est coupé.
const alive = new WeakMap<WebSocket, boolean>();
setInterval(() => {
  for (const client of wss.clients) {
    if (alive.get(client) === false) {
      client.terminate();
      continue;
    }
    alive.set(client, false);
    client.ping();
  }
}, 20_000);

function ownsParticipant(identity: RealtimeIdentity, p: ParticipantState): boolean {
  if (p.isBot) return false;
  return identity.kind === "user" ? p.userId === identity.userId : p.guestId === identity.guestId;
}

async function attachRaceSocket(
  socket: WebSocket,
  identity: RealtimeIdentity,
  query: URLSearchParams,
) {
  const parsed = raceConnectionQuery.safeParse({
    race: query.get("race") ?? undefined,
    participant: query.get("participant") ?? undefined,
  });
  if (!parsed.success) {
    socket.close(1008, "paramètres invalides");
    return;
  }
  const { race: raceId, participant: participantId } = parsed.data;

  const room = await loadRoom(raceId);
  if (!room) {
    socket.close(1008, "course introuvable");
    return;
  }

  let me: ParticipantState | null = null;
  if (participantId) {
    const candidate = room.participants.get(participantId) ?? null;
    // On ne peut jouer que sous sa propre identité (TECH-07, COURSE-06).
    if (!candidate || !ownsParticipant(identity, candidate)) {
      socket.close(4403, "participant non autorisé");
      return;
    }
    me = candidate;
    me.socket = socket;
  } else {
    room.spectators.add(socket);
  }

  socket.send(JSON.stringify(snapshot(room)));

  const limiter = createRateLimiter(120, 1_000); // PERF-02
  socket.on("message", (raw) => {
    if (!me || me.status !== "racing" || me.isBot) return;
    if (!limiter.allow()) return;
    const m = parseMessage(raceClientMessage, raw);
    if (!m) return;

    if (m.type === "progress") {
      const progressChars = clamp(m.progressChars, 0, room.textLength);
      if (progressChars < me.progressChars) return; // pas de retour en arrière
      me.progressChars = progressChars;
      me.errorCount = m.errorCount;
      me.keyCorrect = m.keyCorrect;
      me.keyErrors = m.keyErrors;
      const elapsed = Date.now() - room.startsAtMs;
      // COURSE-06: le serveur recalcule le MPM lui-même, le client ne fait
      // qu'indiquer son avancement — jamais de MPM fourni par le client.
      me.wpm = clamp(computeWpm(me.progressChars, elapsed), 0, MAX_WPM);
      me.accuracy = clamp(
        100 * (1 - me.errorCount / Math.max(1, me.progressChars + me.errorCount)),
        0,
        100,
      );
      if (me.progressChars >= room.textLength) finishParticipant(room, me);
      broadcast(room);
    } else {
      // COUR-14: gros bouton Abandonner — classé dernier (H6).
      me.status = "abandoned";
      me.finishedAtMs = Date.now();
      const everyoneDone = [...room.participants.values()]
        .filter((x) => x.role === "participant")
        .every((x) => x.status !== "racing");
      if (everyoneDone) void finalizeRace(room);
      else broadcast(room);
    }
  });

  socket.on("close", () => {
    // COUR-15: on ne retire pas le participant, juste le socket — il peut
    // revenir (reconnexion) et retrouver sa progression enregistrée.
    if (me) {
      if (me.socket === socket) me.socket = null;
    } else {
      room.spectators.delete(socket);
    }
  });
}

wss.on("connection", (socket, request) => {
  alive.set(socket, true);
  socket.on("pong", () => alive.set(socket, true));
  socket.on("error", () => socket.terminate());

  if (!isAllowedOrigin(request.headers.origin, ORIGINS)) {
    socket.close(4403, "origine refusée");
    return;
  }

  void (async () => {
    const identity = await identityFromCookies(request.headers.cookie, SESSION_SECRET);
    if (!identity) {
      socket.close(4401, "non authentifié");
      return;
    }
    const url = new URL(request.url ?? "/", "http://localhost");
    if (url.pathname === "/lobby") {
      const q = lobbyConnectionQuery.safeParse({ code: url.searchParams.get("code") ?? "" });
      if (!q.success) {
        socket.close(1008, "code invalide");
        return;
      }
      await attachLobbySocket(socket, identity, q.data.code);
    } else {
      await attachRaceSocket(socket, identity, url.searchParams);
    }
  })().catch((error) => {
    console.error("[realtime] connexion", error);
    socket.close(1011, "erreur interne");
  });
});

void startLobbyChannel();
