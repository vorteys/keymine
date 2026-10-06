import { spawn, type ChildProcess } from "node:child_process";
import { SignJWT } from "jose";
import { Client } from "pg";
import WebSocket from "ws";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

// Test d'intégration du serveur temps réel : vrai processus, vraie base,
// vrais cookies signés (SALLE-01, SALLE-02, SALLE-08, JOIN-01, TECH-07).
const databaseUrl = process.env.DATABASE_URL;
const SECRET = "secret-de-test-realtime";
const PORT = 4100 + Math.floor(Math.random() * 500);
const ORIGIN = "http://localhost:3000";
const client = new Client({ connectionString: databaseUrl });
let server: ChildProcess;

type LobbyMessage = {
  type: string;
  lobby?: { isHost: boolean };
  players?: { name: string; connected: boolean; isHost: boolean; isSelf: boolean }[];
};

async function cookie(name: "km_session" | "km_guest", sub: string, extra: Record<string, string>) {
  const token = await new SignJWT(extra)
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(sub)
    .setExpirationTime("1h")
    .sign(new TextEncoder().encode(SECRET));
  return `${name}=${token}`;
}

function open(path: string, headers: Record<string, string>) {
  const ws = new WebSocket(`ws://127.0.0.1:${PORT}${path}`, { headers });
  const messages: LobbyMessage[] = [];
  ws.on("message", (raw) => messages.push(JSON.parse(String(raw))));
  const closed = new Promise<number>((resolve) => ws.on("close", (code) => resolve(code)));
  return { ws, messages, closed };
}

async function waitFor<T>(check: () => T | undefined | false, ms = 4000): Promise<T> {
  const start = Date.now();
  for (;;) {
    const value = check();
    if (value) return value;
    if (Date.now() - start > ms) throw new Error("délai dépassé");
    await new Promise((r) => setTimeout(r, 25));
  }
}

async function waitForListening() {
  await waitFor(() => (logs.includes("serveur WebSocket") ? true : undefined), 15000);
  await new Promise((r) => setTimeout(r, 300));
}

let logs = "";

beforeAll(async () => {
  if (!databaseUrl) throw new Error("DATABASE_URL manquant pour les tests de base de données");
  await client.connect();
  server = spawn("bun", ["run", "realtime/server.ts"], {
    env: {
      ...process.env,
      REALTIME_PORT: String(PORT),
      SESSION_SECRET: SECRET,
      NEXT_PUBLIC_SITE_URL: ORIGIN,
      NODE_ENV: "test",
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
  server.stdout?.on("data", (d) => (logs += String(d)));
  server.stderr?.on("data", (d) => (logs += String(d)));
  await waitForListening();
}, 30000);

afterAll(async () => {
  server?.kill();
  await client.end();
});

async function seed() {
  const suffix = Math.random().toString(36).slice(2, 8);
  const host = (
    await client.query<{ id: string }>(
      `insert into users (username, password_hash, display_name) values ($1, 'x', 'Hôte') returning id`,
      [`h_${suffix}`],
    )
  ).rows[0].id;
  const friend = (
    await client.query<{ id: string }>(
      `insert into users (username, password_hash, display_name) values ($1, 'x', 'Amie') returning id`,
      [`a_${suffix}`],
    )
  ).rows[0].id;
  const code = `R${suffix.toUpperCase().slice(0, 5)}`;
  const lobby = (
    await client.query<{ id: string }>(
      `insert into lobbies (code, host_user_id, name) values ($1, $2, 'rt') returning id`,
      [code, host],
    )
  ).rows[0].id;
  await client.query(`insert into lobby_players (lobby_id, user_id) values ($1, $2), ($1, $3)`, [
    lobby,
    host,
    friend,
  ]);
  return { host, friend, code, lobby };
}

describe("serveur temps réel", () => {
  it("refuse une connexion sans cookie ou depuis une autre origine", async () => {
    const { code } = await seed();
    const anonymous = open(`/lobby?code=${code}`, { Origin: ORIGIN });
    expect(await anonymous.closed).toBe(4401);

    const evil = open(`/lobby?code=${code}`, { Origin: "https://evil.example" });
    expect(await evil.closed).toBe(4403);
  });

  it("refuse quelqu'un qui n'est pas dans la salle", async () => {
    const { code } = await seed();
    const stranger = open(`/lobby?code=${code}`, {
      Origin: ORIGIN,
      Cookie: await cookie("km_guest", "pas-dans-la-salle", { name: "x" }),
    });
    expect(await stranger.closed).toBe(4403);
  });

  it("diffuse la présence en direct à chaque connexion et déconnexion", async () => {
    const { host, friend, code } = await seed();
    const hostConn = open(`/lobby?code=${code}`, {
      Origin: ORIGIN,
      Cookie: await cookie("km_session", host, { username: "h" }),
    });
    const first = await waitFor(() => hostConn.messages.find((m) => m.type === "lobby"));
    expect(first.lobby?.isHost).toBe(true);
    expect(first.players?.find((p) => p.name === "Amie")?.connected).toBe(false);

    const friendConn = open(`/lobby?code=${code}`, {
      Origin: ORIGIN,
      Cookie: await cookie("km_session", friend, { username: "a" }),
    });
    await waitFor(() =>
      hostConn.messages.find(
        (m) => m.type === "lobby" && m.players?.find((p) => p.name === "Amie")?.connected,
      ),
    );
    const friendView = await waitFor(() => friendConn.messages.find((m) => m.type === "lobby"));
    expect(friendView.lobby?.isHost).toBe(false);
    expect(friendView.players?.find((p) => p.isSelf)?.name).toBe("Amie");

    friendConn.ws.close();
    await waitFor(() => {
      const last = [...hostConn.messages].reverse().find((m) => m.type === "lobby");
      return last?.players?.find((p) => p.name === "Amie")?.connected === false ? last : undefined;
    });
    hostConn.ws.close();
  });

  it("pousse un changement fait en base (nouveau joueur) sans que le client le demande", async () => {
    const { host, code, lobby } = await seed();
    const hostConn = open(`/lobby?code=${code}`, {
      Origin: ORIGIN,
      Cookie: await cookie("km_session", host, { username: "h" }),
    });
    await waitFor(() => hostConn.messages.find((m) => m.type === "lobby"));
    await client.query(
      `insert into lobby_players (lobby_id, guest_id, guest_name) values ($1, 'invite-xyz', 'Invitée')`,
      [lobby],
    );
    await waitFor(() =>
      hostConn.messages.find(
        (m) => m.type === "lobby" && m.players?.some((p) => p.name === "Invitée"),
      ),
    );
    hostConn.ws.close();
  });

  it("annonce la fermeture de la salle", async () => {
    const { host, code, lobby } = await seed();
    const hostConn = open(`/lobby?code=${code}`, {
      Origin: ORIGIN,
      Cookie: await cookie("km_session", host, { username: "h" }),
    });
    await waitFor(() => hostConn.messages.find((m) => m.type === "lobby"));
    await client.query(`update lobbies set status = 'closed' where id = $1`, [lobby]);
    await waitFor(() => hostConn.messages.find((m) => m.type === "closed"));
  });
});
