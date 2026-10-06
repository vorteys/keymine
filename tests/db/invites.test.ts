import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { Client } from "pg";
import { isBanned, kickPlayer } from "@/lib/bans";
import { createInvite, listInvites, redeemInvite, revokeAllInvites, revokeInvite } from "@/lib/invites";
import { isJoinRateLimited, JOIN_ATTEMPT_LIMIT, recordFailedJoin } from "@/lib/join-limit";
import { joinLobby } from "@/lib/lobby";
import { needsInvite } from "@/lib/lobby-access";
import type { Identity } from "@/lib/auth/identity";

// SALLE-03, SALLE-04, SALLE-07, SALLE-10 contre PostgreSQL.
const client = new Client({ connectionString: process.env.DATABASE_URL });

beforeAll(async () => {
  await client.connect();
});
afterAll(async () => {
  await client.end();
});

const suffix = () => Math.random().toString(36).slice(2, 8);
type Guest = Extract<Identity, { kind: "guest" }>;
const guest = (name = "Invité"): Guest => ({ kind: "guest", guestId: `g-${suffix()}`, displayName: name });

async function room(access: "public" | "unlisted" | "private" = "private", status = "lobby") {
  const host = (
    await client.query<{ id: string }>(
      `insert into users (username, password_hash, display_name) values ($1, 'x', 'Hote') returning id`,
      [`i_${suffix()}`],
    )
  ).rows[0].id;
  const lobby = (
    await client.query(
      `insert into lobbies (code, host_user_id, name, access, status) values ($1, $2, 'inv', $3, $4) returning *`,
      [`I${suffix().toUpperCase().slice(0, 5)}`, host, access, status],
    )
  ).rows[0];
  await client.query(`insert into lobby_players (lobby_id, user_id) values ($1, $2)`, [lobby.id, host]);
  const hostIdentity: Identity = { kind: "user", userId: host, username: "h", displayName: "Hote" };
  return { lobby, host: hostIdentity };
}

describe("visibilité (SALLE-03)", () => {
  it("le code suffit pour une salle publique ou « sur code », pas pour une salle privée", async () => {
    const stranger = guest();
    for (const access of ["public", "unlisted"] as const) {
      const { lobby } = await room(access);
      expect(await needsInvite(lobby, stranger)).toBe(false);
    }
    const { lobby, host } = await room("private");
    expect(await needsInvite(lobby, stranger)).toBe(true);
    expect(await needsInvite(lobby, host)).toBe(false); // l'hôte rentre toujours
  });

  it("une personne déjà présente peut recharger la page d'une salle privée", async () => {
    const { lobby } = await room("private");
    const member = guest();
    expect(await joinLobby(lobby, member)).toEqual({ ok: true });
    expect(await needsInvite(lobby, member)).toBe(false);
  });
});

describe("liens d'invitation (SALLE-04)", () => {
  it("génère plusieurs liens distincts avec leur statut", async () => {
    const { lobby } = await room();
    const a = await createInvite(lobby.id, "Alice");
    const b = await createInvite(lobby.id);
    expect(a?.token).not.toBe(b?.token);
    const list = await listInvites(lobby.id);
    expect(list.map((i) => i.status)).toEqual(["unused", "unused"]);
    expect(list[0].label).toBe("Alice");
  });

  it("le premier usage associe le lien à la personne et à son IP ; la même IP peut se reconnecter", async () => {
    const { lobby } = await room();
    const invite = (await createInvite(lobby.id))!;
    const alice = guest("Alice");

    const first = await redeemInvite(invite.token, alice, "203.0.113.1");
    expect(first).toMatchObject({ ok: true, lobbyCode: lobby.code });
    const [view] = await listInvites(lobby.id);
    expect(view).toMatchObject({ status: "used", usedBy: "Alice" });

    // Reconnexion depuis la même adresse (même après avoir changé de navigateur).
    expect(await redeemInvite(invite.token, guest("Alice"), "203.0.113.1")).toMatchObject({ ok: true });
  });

  it("refuse une autre adresse IP", async () => {
    const { lobby } = await room();
    const invite = (await createInvite(lobby.id))!;
    await redeemInvite(invite.token, guest("Alice"), "203.0.113.1");
    expect(await redeemInvite(invite.token, guest("Bob"), "198.51.100.2")).toEqual({ ok: false, reason: "wrong_ip" });
  });

  it("un seul gagnant quand deux personnes utilisent un lien neuf en même temps", async () => {
    const { lobby } = await room();
    const invite = (await createInvite(lobby.id))!;
    const results = await Promise.all([
      redeemInvite(invite.token, guest("A"), "192.0.2.1"),
      redeemInvite(invite.token, guest("B"), "192.0.2.2"),
    ]);
    expect(results.filter((r) => r.ok)).toHaveLength(1);
  });

  it("refuse un jeton inconnu, un lien révoqué et une salle fermée", async () => {
    const { lobby } = await room();
    expect(await redeemInvite("jeton-inexistant", guest(), "192.0.2.1")).toEqual({ ok: false, reason: "invalid" });

    const invite = (await createInvite(lobby.id))!;
    expect(await revokeInvite(lobby.id, invite.id)).toBe(true);
    expect(await redeemInvite(invite.token, guest(), "192.0.2.1")).toEqual({ ok: false, reason: "revoked" });

    const other = (await createInvite(lobby.id))!;
    await client.query(`update lobbies set status = 'closed' where id = $1`, [lobby.id]);
    expect(await redeemInvite(other.token, guest(), "192.0.2.1")).toEqual({ ok: false, reason: "closed" });
  });

  it("la fermeture de la salle révoque tous les liens", async () => {
    const { lobby } = await room();
    await createInvite(lobby.id);
    await createInvite(lobby.id);
    await revokeAllInvites(lobby.id);
    expect((await listInvites(lobby.id)).map((i) => i.status)).toEqual(["revoked", "revoked"]);
  });
});

describe("expulsion (SALLE-07)", () => {
  it("retire la personne, l'interdit de retour et révoque son lien", async () => {
    const { lobby } = await room("private");
    const invite = (await createInvite(lobby.id))!;
    const bob = guest("Bob");
    await redeemInvite(invite.token, bob, "192.0.2.7");
    await joinLobby(lobby, bob);
    const player = (await client.query(`select id from lobby_players where lobby_id = $1 and guest_id = $2`, [lobby.id, bob.guestId])).rows[0];

    expect(await kickPlayer(lobby, player.id)).toEqual({ ok: true });
    expect((await client.query(`select 1 from lobby_players where id = $1`, [player.id])).rowCount).toBe(0);
    expect(await isBanned(lobby.id, bob)).toBe(true);
    expect(await joinLobby(lobby, bob)).toEqual({ ok: false, reason: "banned" });
    expect((await listInvites(lobby.id))[0].status).toBe("revoked");
    expect(await redeemInvite(invite.token, bob, "192.0.2.7")).toEqual({ ok: false, reason: "revoked" });
  });

  it("peut expulser un spectateur, jamais l'hôte ni un bot, ni pendant la course", async () => {
    const { lobby } = await room("public");
    const watcher = guest("Spectateur");
    await joinLobby(lobby, watcher, "spectator");
    const watcherRow = (await client.query(`select id from lobby_players where guest_id = $1`, [watcher.guestId])).rows[0];
    const hostRow = (await client.query(`select id from lobby_players where lobby_id = $1 and user_id = $2`, [lobby.id, lobby.host_user_id])).rows[0];
    const bot = (await client.query(`insert into lobby_players (lobby_id, is_bot, bot_level) values ($1, true, 'noob') returning id`, [lobby.id])).rows[0];

    expect(await kickPlayer(lobby, hostRow.id)).toEqual({ ok: false, reason: "is_host" });
    expect(await kickPlayer(lobby, bot.id)).toEqual({ ok: false, reason: "is_bot" });
    expect(await kickPlayer({ ...lobby, status: "racing" }, watcherRow.id)).toEqual({ ok: false, reason: "bad_state" });
    expect(await kickPlayer(lobby, watcherRow.id)).toEqual({ ok: true });
    expect(await kickPlayer(lobby, watcherRow.id)).toEqual({ ok: false, reason: "not_found" });
  });

  it("l'interdiction vaut aussi pour un compte, et seulement pour cette salle", async () => {
    const { lobby } = await room("public");
    const { lobby: other } = await room("public");
    const user = (
      await client.query<{ id: string }>(
        `insert into users (username, password_hash, display_name) values ($1, 'x', 'Jo') returning id`,
        [`k_${suffix()}`],
      )
    ).rows[0].id;
    const jo: Identity = { kind: "user", userId: user, username: "jo", displayName: "Jo" };
    await joinLobby(lobby, jo);
    const row = (await client.query(`select id from lobby_players where user_id = $1`, [user])).rows[0];
    await kickPlayer(lobby, row.id);
    expect(await joinLobby(lobby, jo)).toEqual({ ok: false, reason: "banned" });
    expect(await joinLobby(other, jo)).toEqual({ ok: true });
  });
});

describe("limite de tentatives par IP (SALLE-10)", () => {
  it("bloque après 10 essais échoués en une minute, pas avant, pas pour une autre IP", async () => {
    const ip = `10.${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250)}.1`;
    const now = new Date();
    for (let i = 0; i < JOIN_ATTEMPT_LIMIT - 1; i++) await recordFailedJoin(ip, now);
    expect(await isJoinRateLimited(ip, now)).toBe(false);
    await recordFailedJoin(ip, now);
    expect(await isJoinRateLimited(ip, now)).toBe(true);
    expect(await isJoinRateLimited("10.255.255.255", now)).toBe(false);
  });

  it("la limite se relâche après la fenêtre d'une minute", async () => {
    const ip = `172.16.${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250)}`;
    const now = new Date();
    for (let i = 0; i < JOIN_ATTEMPT_LIMIT; i++) await recordFailedJoin(ip, now);
    expect(await isJoinRateLimited(ip, now)).toBe(true);
    expect(await isJoinRateLimited(ip, new Date(now.getTime() + 61_000))).toBe(false);
  });
});
