import "server-only";
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
    .where((eb) =>
      eb.or([
        eb("user_id", "is not", null).and("user_id", "!=", lobby.host_user_id ?? ""),
        eb("guest_id", "is not", null).and("guest_id", "!=", lobby.host_guest_id ?? ""),
      ]),
    )
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
