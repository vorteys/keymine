import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { Client } from "pg";
import { joinLobby } from "@/lib/lobby";
import { sweepLobbies } from "@/lib/lobby-sweep";
import type { Identity } from "@/lib/auth/identity";

// SALLE-05, SALLE-06, SALLE-01 : règles d'entrée en salle, vérifiées sur la vraie base.
const client = new Client({ connectionString: process.env.DATABASE_URL });
beforeAll(async () => {
  await client.connect();
});
afterAll(async () => {
  await client.end();
});

async function makeUser(name: string): Promise<Identity & { kind: "user" }> {
  const { rows } = await client.query<{ id: string }>(
    `insert into users (username, password_hash, display_name) values ($1, 'x', $1) returning id`,
    [`${name}_${Math.random().toString(36).slice(2, 7)}`],
  );
  return { kind: "user", userId: rows[0].id, username: name, displayName: name };
}

async function makeLobby(hostId: string, max = 30) {
  const { rows } = await client.query<{ id: string }>(
    `insert into lobbies (code, host_user_id, name, max_players) values ($1, $2, 'j', $3) returning id`,
    [`J${Math.random().toString(36).slice(2, 7).toUpperCase()}`, hostId, max],
  );
  return { id: rows[0].id, max_players: max };
}

describe("entrée en salle", () => {
  it("refuse quand la salle est pleine mais accepte les spectateurs (SALLE-05)", async () => {
    const host = await makeUser("hote");
    const a = await makeUser("a");
    const b = await makeUser("b");
    const lobby = await makeLobby(host.userId, 2);
    expect(await joinLobby(lobby, host, "participant")).toEqual({ ok: true });
    expect(await joinLobby(lobby, a, "participant")).toEqual({ ok: true });
    expect(await joinLobby(lobby, b, "participant")).toEqual({ ok: false, reason: "full" });
    expect(await joinLobby(lobby, b, "spectator")).toEqual({ ok: true });
  });

  it("un membre existant garde son rôle quand il revient sans le préciser (SALLE-01)", async () => {
    const host = await makeUser("hote");
    const lobby = await makeLobby(host.userId);
    await joinLobby(lobby, host, "spectator");
    await joinLobby(lobby, host);
    const { rows } = await client.query(`select role from lobby_players where lobby_id = $1`, [lobby.id]);
    expect(rows[0].role).toBe("spectator");
  });

  it("réactive une personne libérée par le balayage au lieu d'échouer", async () => {
    const host = await makeUser("hote");
    const lobby = await makeLobby(host.userId);
    await joinLobby(lobby, host, "participant");
    await client.query(
      `update lobbies set last_host_seen_at = now() where id = $1`, [lobby.id]);
    await client.query(
      `update lobby_players set last_seen_at = now() - interval '5 minutes' where lobby_id = $1`, [lobby.id]);
    await sweepLobbies();
    const released = await client.query(`select active from lobby_players where lobby_id = $1`, [lobby.id]);
    expect(released.rows[0].active).toBe(false);
    expect(await joinLobby(lobby, host)).toEqual({ ok: true });
    const back = await client.query(`select active from lobby_players where lobby_id = $1`, [lobby.id]);
    expect(back.rows[0].active).toBe(true);
  });

  it("refuse une deuxième salle (SALLE-06)", async () => {
    const host = await makeUser("hote");
    const player = await makeUser("joueur");
    const one = await makeLobby(host.userId);
    const two = await makeLobby(host.userId);
    await joinLobby(one, player);
    expect(await joinLobby(two, player)).toMatchObject({ ok: false, reason: "already_in_room" });
  });
});
