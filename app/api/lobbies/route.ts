import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getOrCreateIdentity } from "@/lib/auth/identity";
import { generateUniqueLobbyCode } from "@/lib/lobby";
import { lobbySettingsSchema } from "@/lib/lobby-schema";

// COUR-16: liste des lobbys publics affichée à l'accueil.
export async function GET() {
  const lobbies = await db
    .selectFrom("lobbies")
    .where("status", "=", "lobby")
    .where("access", "=", "public")
    .select((eb) => [
      "id",
      "code",
      "name",
      "language",
      "text_mode",
      "max_players",
      eb
        .selectFrom("lobby_players")
        .select((inner) => inner.fn.countAll<number>().as("count"))
        .whereRef("lobby_players.lobby_id", "=", "lobbies.id")
        .where("role", "=", "participant")
        .as("player_count"),
    ])
    .orderBy("created_at", "desc")
    .limit(20)
    .execute();

  return NextResponse.json({
    lobbies: lobbies.map((l) => ({
      code: l.code,
      name: l.name,
      language: l.language,
      textMode: l.text_mode,
      maxPlayers: l.max_players,
      playerCount: Number(l.player_count ?? 0),
    })),
  });
}

// COUR-1: l'hôte crée la course et règle les options.
export async function POST(request: Request) {
  const body = lobbySettingsSchema.safeParse(await request.json().catch(() => ({})));
  if (!body.success) {
    return NextResponse.json({ error: "Réglages invalides" }, { status: 400 });
  }

  const identity = await getOrCreateIdentity();
  const code = await generateUniqueLobbyCode();
  const s = body.data;

  const lobby = await db
    .insertInto("lobbies")
    .values({
      code,
      host_user_id: identity.kind === "user" ? identity.userId : null,
      host_guest_id: identity.kind === "guest" ? identity.guestId : null,
      access: s.access,
      name: s.name,
      language: s.language,
      max_players: s.maxPlayers,
      duration_seconds: s.durationSeconds,
      text_mode: s.textMode,
      text_length: s.textLength,
      error_mode: s.errorMode,
      penalty_seconds: s.penaltySeconds,
      allow_uppercase: s.uppercase,
      allow_punctuation: s.punctuation,
      allow_digits: s.digits,
      allow_symbols: s.symbols,
      target_chars: s.targetChars,
      accent_chars: s.accentChars,
    })
    .returning(["id", "code"])
    .executeTakeFirstOrThrow();

  await db
    .insertInto("lobby_players")
    .values({
      lobby_id: lobby.id,
      user_id: identity.kind === "user" ? identity.userId : null,
      guest_id: identity.kind === "guest" ? identity.guestId : null,
      guest_name: identity.kind === "guest" ? identity.displayName : null,
      role: "participant",
    })
    .execute();

  return NextResponse.json({ code: lobby.code });
}
