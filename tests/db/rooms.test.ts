import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { Client } from "pg";

// SALLE-06 : la règle « une seule salle à la fois » est garantie par la base.
const databaseUrl = process.env.DATABASE_URL;
const client = new Client({ connectionString: databaseUrl });

async function createUser(name: string): Promise<string> {
  const { rows } = await client.query<{ id: string }>(
    `insert into users (username, password_hash, display_name) values ($1, 'x', $1) returning id`,
    [`${name}_${Math.random().toString(36).slice(2, 8)}`],
  );
  return rows[0].id;
}

async function createLobby(hostId: string, code: string): Promise<string> {
  const { rows } = await client.query<{ id: string }>(
    `insert into lobbies (code, host_user_id, name) values ($1, $2, 'test') returning id`,
    [code, hostId],
  );
  return rows[0].id;
}

function join(lobbyId: string, userId: string) {
  return client.query(`insert into lobby_players (lobby_id, user_id) values ($1, $2)`, [
    lobbyId,
    userId,
  ]);
}

beforeAll(async () => {
  if (!databaseUrl) throw new Error("DATABASE_URL manquant pour les tests de base de données");
  await client.connect();
});

afterAll(async () => {
  await client.end();
});

describe("une personne ne peut être que dans une seule salle (SALLE-06)", () => {
  it("refuse de rejoindre une deuxième salle active", async () => {
    const host = await createUser("hote");
    const player = await createUser("joueur");
    const a = await createLobby(host, `A${Math.random().toString(36).slice(2, 7).toUpperCase()}`);
    const b = await createLobby(host, `B${Math.random().toString(36).slice(2, 7).toUpperCase()}`);

    await join(a, player);
    await expect(join(b, player)).rejects.toMatchObject({ code: "23505" });
  });

  it("libère automatiquement les joueurs quand la salle est fermée", async () => {
    const host = await createUser("hote");
    const player = await createUser("joueur");
    const a = await createLobby(host, `C${Math.random().toString(36).slice(2, 7).toUpperCase()}`);
    const b = await createLobby(host, `D${Math.random().toString(36).slice(2, 7).toUpperCase()}`);

    await join(a, player);
    await client.query(`update lobbies set status = 'closed' where id = $1`, [a]);
    await expect(join(b, player)).resolves.toBeDefined();
  });

  it("refuse aussi un invité présent dans deux salles", async () => {
    const host = await createUser("hote");
    const a = await createLobby(host, `E${Math.random().toString(36).slice(2, 7).toUpperCase()}`);
    const b = await createLobby(host, `F${Math.random().toString(36).slice(2, 7).toUpperCase()}`);
    const guestId = `guest-${Math.random().toString(36).slice(2)}`;

    await client.query(`insert into lobby_players (lobby_id, guest_id, guest_name) values ($1, $2, 'Invité')`, [a, guestId]);
    await expect(
      client.query(`insert into lobby_players (lobby_id, guest_id, guest_name) values ($1, $2, 'Invité')`, [b, guestId]),
    ).rejects.toMatchObject({ code: "23505" });
  });
});

describe("notifications temps réel de la salle (SALLE-01, JOIN-01)", () => {
  it("émet lobby_changed quand un joueur rejoint une salle", async () => {
    const listener = new Client({ connectionString: databaseUrl });
    await listener.connect();
    const received: string[] = [];
    listener.on("notification", (msg) => {
      if (msg.channel === "lobby_changed" && msg.payload) received.push(msg.payload);
    });
    await listener.query("listen lobby_changed");

    const host = await createUser("hote");
    const player = await createUser("joueur");
    const code = `N${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
    const lobby = await createLobby(host, code);
    await join(lobby, player);

    await new Promise((resolve) => setTimeout(resolve, 150));
    await listener.end();
    expect(received).toContain(code);
    expect(received.filter((c) => c === code).length).toBeGreaterThanOrEqual(2);
  });
});
