import { db } from "@/lib/db";

// Présence en salle d'attente (SALLE-08) : l'hôte est considéré parti s'il
// n'a donné aucun signe de vie (WebSocket ou battement HTTP) depuis
// HOST_ABSENCE_MS. Le rôle passe alors à la personne humaine connectée
// (compte) présente depuis le plus longtemps ; s'il n'en reste aucune, la
// salle est fermée. Fonction sans dépendance à Next.js : appelée par le
// serveur temps réel et par la route HTTP de repli.
export const HOST_ABSENCE_MS = 30_000;
export const PLAYER_ABSENCE_MS = 60_000;

export type SweepResult = { transferred: number; closed: number; released: number };

export async function sweepLobbies(now: Date = new Date()): Promise<SweepResult> {
  const hostCutoff = new Date(now.getTime() - HOST_ABSENCE_MS);
  const playerCutoff = new Date(now.getTime() - PLAYER_ABSENCE_MS);
  const result: SweepResult = { transferred: 0, closed: 0, released: 0 };

  // Joueurs disparus d'une salle en attente : on libère leur place.
  const released = await db
    .updateTable("lobby_players")
    .set({ active: false })
    .where("active", "=", true)
    .where("is_bot", "=", false)
    .where("last_seen_at", "<", playerCutoff)
    .where("lobby_id", "in", db.selectFrom("lobbies").select("id").where("status", "=", "lobby"))
    .executeTakeFirst();
  result.released = Number(released.numUpdatedRows ?? 0);

  const stale = await db
    .selectFrom("lobbies")
    .select(["id", "host_user_id"])
    .where("status", "=", "lobby")
    .where("last_host_seen_at", "<", hostCutoff)
    .execute();

  for (const lobby of stale) {
    const next = await db
      .selectFrom("lobby_players")
      .select("user_id")
      .where("lobby_id", "=", lobby.id)
      .where("is_bot", "=", false)
      .where("active", "=", true)
      .where("user_id", "is not", null) // seuls les comptes peuvent être hôtes (AUTH-03)
      .where("user_id", "!=", lobby.host_user_id ?? "00000000-0000-0000-0000-000000000000")
      .where("last_seen_at", ">=", hostCutoff)
      .orderBy("joined_at", "asc")
      .executeTakeFirst();

    if (next?.user_id) {
      await db
        .updateTable("lobbies")
        .set({ host_user_id: next.user_id, host_guest_id: null, last_host_seen_at: now })
        .where("id", "=", lobby.id)
        .where("status", "=", "lobby")
        .execute();
      result.transferred++;
    } else {
      await db
        .updateTable("lobbies")
        .set({ status: "closed", closed_at: now })
        .where("id", "=", lobby.id)
        .where("status", "=", "lobby")
        .execute();
      result.closed++;
    }
  }
  return result;
}
