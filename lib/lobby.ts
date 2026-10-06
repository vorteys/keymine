import { customAlphabet } from "nanoid";
import { db } from "@/lib/db";
import type { Identity } from "@/lib/auth/identity";

// Alphabet sans caractères ambigus (0/O, 1/I/l) pour un code "à la Kahoot"
// facile à lire et à retaper (COUR-2).
const nanoLobbyCode = customAlphabet("ABCDEFGHJKMNPQRSTUVWXYZ23456789", 6);

export async function generateUniqueLobbyCode(): Promise<string> {
  for (let i = 0; i < 20; i++) {
    const code = nanoLobbyCode();
    const existing = await db
      .selectFrom("lobbies")
      .select("id")
      .where("code", "=", code)
      .where("status", "in", ["lobby", "countdown", "racing"])
      .executeTakeFirst();
    if (!existing) return code;
  }
  throw new Error("Impossible de générer un code de salle unique");
}

export const HOST_INACTIVITY_MS = 60_000; // H16

/** COUR-13: si l'hôte est inactif, le rôle passe au joueur présent depuis le plus longtemps. */
export async function maybeTransferHost(lobbyId: string) {
  const lobby = await db
    .selectFrom("lobbies")
    .select(["id", "host_user_id", "host_guest_id", "last_host_seen_at"])
    .where("id", "=", lobbyId)
    .executeTakeFirst();
  if (!lobby) return;

  const inactiveFor = Date.now() - new Date(lobby.last_host_seen_at).getTime();
  if (inactiveFor < HOST_INACTIVITY_MS) return;

  const nextHost = await db
    .selectFrom("lobby_players")
    .select(["user_id", "guest_id"])
    .where("lobby_id", "=", lobbyId)
    .where("is_bot", "=", false)
    .where("active", "=", true)
    // Seuls les comptes peuvent être hôtes (AUTH-03: un invité ne crée ni ne gère de salle).
    .where("user_id", "is not", null)
    .where("user_id", "!=", lobby.host_user_id ?? "")
    .orderBy("joined_at", "asc")
    .executeTakeFirst();

  if (!nextHost) return;

  await db
    .updateTable("lobbies")
    .set({
      host_user_id: nextHost.user_id,
      host_guest_id: nextHost.guest_id,
      last_host_seen_at: new Date(),
    })
    .where("id", "=", lobbyId)
    .execute();
}

export function isHost(
  identity: Identity,
  lobby: { host_user_id: string | null; host_guest_id: string | null },
): boolean {
  if (identity.kind === "user") return lobby.host_user_id === identity.userId;
  return lobby.host_guest_id === identity.guestId;
}

export async function getLobbyByCode(code: string) {
  return db
    .selectFrom("lobbies")
    .selectAll()
    .where("code", "=", code.toUpperCase())
    .executeTakeFirst();
}

type PlayerRole = "participant" | "spectator";

export type JoinResult =
  | { ok: true }
  | { ok: false; reason: "full" }
  | { ok: false; reason: "already_in_room"; currentCode: string };

/** Salle active (non fermée) où cette personne se trouve déjà, s'il y en a une (SALLE-06). */
export async function findActiveRoom(identity: Identity) {
  return db
    .selectFrom("lobby_players")
    .innerJoin("lobbies", "lobbies.id", "lobby_players.lobby_id")
    .select(["lobbies.id", "lobbies.code"])
    .where("lobby_players.active", "=", true)
    .where((eb) =>
      identity.kind === "user"
        ? eb("lobby_players.user_id", "=", identity.userId)
        : eb("lobby_players.guest_id", "=", identity.guestId),
    )
    .executeTakeFirst();
}

/**
 * Ajoute la personne à la salle (ou met à jour son rôle). Refuse si elle est
 * déjà dans une autre salle (SALLE-06, aussi garanti par un index unique) ou
 * si la salle est pleine (spectateurs exclus de la capacité, SALLE-05).
 */
export async function joinLobby(
  lobby: { id: string; max_players: number },
  identity: Identity,
  role: PlayerRole,
): Promise<JoinResult> {
  const current = await findActiveRoom(identity);
  if (current && current.id !== lobby.id) {
    return { ok: false, reason: "already_in_room", currentCode: current.code };
  }

  if (current) {
    await db
      .updateTable("lobby_players")
      .set({ role, last_seen_at: new Date() })
      .where("lobby_id", "=", lobby.id)
      .where((eb) =>
        identity.kind === "user"
          ? eb("user_id", "=", identity.userId)
          : eb("guest_id", "=", identity.guestId),
      )
      .execute();
    return { ok: true };
  }

  if (role === "participant") {
    const count = await db
      .selectFrom("lobby_players")
      .select((eb) => eb.fn.countAll<number>().as("n"))
      .where("lobby_id", "=", lobby.id)
      .where("role", "=", "participant")
      .where("active", "=", true)
      .executeTakeFirst();
    if (Number(count?.n ?? 0) >= lobby.max_players) return { ok: false, reason: "full" };
  }

  try {
    await db
      .insertInto("lobby_players")
      .values({
        lobby_id: lobby.id,
        user_id: identity.kind === "user" ? identity.userId : null,
        guest_id: identity.kind === "guest" ? identity.guestId : null,
        guest_name: identity.kind === "guest" ? identity.displayName : null,
        role,
      })
      .execute();
  } catch (error) {
    // Course entre deux onglets: l'index unique de SALLE-06 a refusé le doublon.
    if (typeof error === "object" && error !== null && "code" in error && error.code === "23505") {
      const other = await findActiveRoom(identity);
      if (other && other.id === lobby.id) return { ok: true };
      if (other) return { ok: false, reason: "already_in_room", currentCode: other.code };
    }
    throw error;
  }
  return { ok: true };
}
