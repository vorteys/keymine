import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getIdentity } from "@/lib/auth/identity";
import { getLobbyByCode, isHost } from "@/lib/lobby";
import { generateRaceText } from "@/lib/text/generate";

const COUNTDOWN_MS = 5_000; // JEU-1

// COUR-1/JEU-1: l'hôte démarre la course; le serveur génère le texte et fige
// la liste des participants (bots inclus) pour tout le monde.
export async function POST(_request: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const lobby = await getLobbyByCode(code);
  if (!lobby) return NextResponse.json({ error: "Salle introuvable" }, { status: 404 });

  const identity = await getIdentity();
  if (!identity) {
    return NextResponse.json({ error: "Pseudo requis", code: "pseudo_required" }, { status: 401 });
  }
  if (!isHost(identity, lobby)) {
    return NextResponse.json({ error: "Seul l'hôte peut démarrer la course" }, { status: 403 });
  }
  if (lobby.status !== "lobby") {
    return NextResponse.json({ error: "La course est déjà lancée" }, { status: 409 });
  }

  const players = await db
    .selectFrom("lobby_players")
    .leftJoin("users", "users.id", "lobby_players.user_id")
    .select([
      "lobby_players.id",
      "lobby_players.user_id",
      "lobby_players.guest_id",
      "lobby_players.guest_name",
      "lobby_players.role",
      "lobby_players.is_bot",
      "lobby_players.bot_level",
      "users.display_name",
    ])
    .where("lobby_id", "=", lobby.id)
    .execute();

  const participants = players.filter((p) => p.role === "participant");
  // COUR-6: minimum 2 participants, bots inclus.
  if (participants.length < 2) {
    return NextResponse.json(
      { error: "Il faut au moins 2 participants (les bots comptent) pour démarrer" },
      { status: 400 },
    );
  }

  const textContent = generateRaceText({
    mode: lobby.text_mode,
    language: lobby.language,
    length: lobby.text_length,
    uppercase: lobby.allow_uppercase,
    punctuation: lobby.allow_punctuation,
    digits: lobby.allow_digits,
    symbols: lobby.allow_symbols,
    targetChars: lobby.target_chars,
    accentChars: lobby.accent_chars,
  });

  const startsAt = new Date(Date.now() + COUNTDOWN_MS);

  const race = await db
    .insertInto("races")
    .values({
      lobby_id: lobby.id,
      text_content: textContent,
      language: lobby.language,
      settings: JSON.stringify({
        errorMode: lobby.error_mode,
        penaltySeconds: lobby.penalty_seconds,
      }),
      status: "countdown",
      starts_at: startsAt.toISOString(),
      duration_seconds: lobby.duration_seconds,
    })
    .returning(["id"])
    .executeTakeFirstOrThrow();

  await db
    .insertInto("race_participants")
    .values(
      players.map((p) => ({
        race_id: race.id,
        lobby_player_id: p.id,
        user_id: p.user_id,
        guest_id: p.guest_id,
        display_name: p.is_bot
          ? `Bot ${p.bot_level}`
          : (p.display_name ?? p.guest_name ?? "Joueur"),
        is_bot: p.is_bot,
        bot_level: p.bot_level,
        role: p.role,
      })),
    )
    .execute();

  await db.updateTable("lobbies").set({ status: "countdown" }).where("id", "=", lobby.id).execute();

  return NextResponse.json({ raceId: race.id, startsAt: startsAt.toISOString() });
}
