import { z } from "zod";
import { db } from "@/lib/db";

// JOIN-02 : explorateur des salles publiques (filtres langue et complexité).
export const publicLobbyFilters = z.object({
  language: z.enum(["fr", "en"]).optional(),
  complexity: z.enum(["easy", "medium", "hard"]).optional(),
});
export type PublicLobbyFilters = z.infer<typeof publicLobbyFilters>;

export type PublicLobby = {
  code: string;
  name: string;
  language: "fr" | "en";
  complexity: "easy" | "medium" | "hard";
  textType: "coherent" | "aleatoire";
  hostName: string | null;
  players: number;
  capacity: number;
  /** « lobby » : en attente ; « finished » : sur l'écran des résultats ; sinon course en cours. */
  status: "lobby" | "countdown" | "racing" | "finished";
  /** On peut rejoindre (SALLE-09) et il reste de la place (spectateur toujours possible, voir la salle). */
  joinable: boolean;
};

export async function listPublicLobbies(filters: PublicLobbyFilters = {}, limit = 50): Promise<PublicLobby[]> {
  let query = db
    .selectFrom("lobbies")
    .leftJoin("users", "users.id", "lobbies.host_user_id")
    .where("lobbies.access", "=", "public")
    .where("lobbies.status", "in", ["lobby", "countdown", "racing", "finished"])
    .select((eb) => [
      "lobbies.code",
      "lobbies.name",
      "lobbies.language",
      "lobbies.complexity",
      "lobbies.text_type",
      "lobbies.max_players",
      "lobbies.status",
      "users.display_name as host_name",
      eb
        .selectFrom("lobby_players")
        .select((inner) => inner.fn.countAll<string>().as("n"))
        .whereRef("lobby_players.lobby_id", "=", "lobbies.id")
        .where("lobby_players.role", "=", "participant")
        .where("lobby_players.active", "=", true)
        .as("player_count"),
    ]);
  if (filters.language) query = query.where("lobbies.language", "=", filters.language);
  if (filters.complexity) query = query.where("lobbies.complexity", "=", filters.complexity);

  const rows = await query.orderBy("lobbies.created_at", "desc").limit(limit).execute();
  return rows.map((r) => {
    const players = Number(r.player_count ?? 0);
    return {
      code: r.code,
      name: r.name,
      language: r.language,
      complexity: r.complexity,
      textType: r.text_type,
      hostName: r.host_name,
      players,
      capacity: r.max_players,
      status: r.status as PublicLobby["status"],
      joinable: (r.status === "lobby" || r.status === "finished") && players < r.max_players,
    };
  });
}
