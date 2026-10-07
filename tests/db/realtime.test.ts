import { Client } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { cookie, ORIGIN, open as openSocket, startServer, waitFor, type Message, type TestServer } from "./realtime-helpers";

// Test d'intégration du serveur temps réel : vrai processus, vraie base,
// vrais cookies signés (SALLE-01, SALLE-02, SALLE-08, JOIN-01, TECH-07).
const databaseUrl = process.env.DATABASE_URL;
const client = new Client({ connectionString: databaseUrl });
let server: TestServer;

type LobbyMessage = Message & {
  lobby?: { isHost: boolean };
  players?: { name: string; connected: boolean; isHost: boolean; isSelf: boolean }[];
};

const open = (path: string, headers: Record<string, string>) => {
  const conn = openSocket(server.port, path, headers);
  return { ...conn, messages: conn.messages as LobbyMessage[] };
};

beforeAll(async () => {
  if (!databaseUrl) throw new Error("DATABASE_URL manquant pour les tests de base de données");
  await client.connect();
  server = await startServer();
}, 30_000);

afterAll(async () => {
  server?.stop();
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
      `insert into lobby_players (lobby_id, guest_id, guest_name) values ($1, $2, 'Invitée')`,
      [lobby, `invite-${Math.random().toString(36).slice(2, 8)}`],
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
