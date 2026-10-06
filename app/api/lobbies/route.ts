import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getIdentity } from "@/lib/auth/identity";
import { findActiveRoom, generateUniqueLobbyCode } from "@/lib/lobby";
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
      "text_type",
      "complexity",
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
      textType: l.text_type,
      complexity: l.complexity,
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

  const identity = await getIdentity();
  if (!identity) {
    return NextResponse.json({ error: "Connexion requise", code: "account_required" }, { status: 401 });
  }
  // AUTH-03: un invité ne peut pas créer de salle.
  if (identity.kind !== "user") {
    return NextResponse.json(
      { error: "Crée un compte pour créer une salle", code: "account_required" },
      { status: 403 },
    );
  }
  // SALLE-06: on ne peut pas créer une salle si on est déjà dans une autre.
  const current = await findActiveRoom(identity);
  if (current) {
    return NextResponse.json(
      { error: "Tu es déjà dans une autre salle", code: "already_in_room", currentCode: current.code },
      { status: 409 },
    );
  }
  const code = await generateUniqueLobbyCode();
  const s = body.data;

  const lobby = await db
    .insertInto("lobbies")
    .values({
      code,
      host_user_id: identity.userId,
      host_guest_id: null,
      access: s.access,
      name: s.name,
      language: s.language,
      max_players: s.maxPlayers,
      duration_seconds: s.durationSeconds,
      text_type: s.textType,
      text_length: s.textLength,
      complexity: s.complexity,
      error_mode: s.errorMode,
      penalty_seconds: s.penaltySeconds,
      allow_uppercase: s.uppercase,
      allow_punctuation: s.punctuation,
      allow_digits: s.digits,
      allow_accents: s.accents,
      include_chars: s.includeChars,
      exclude_chars: s.excludeChars,
      comeback_bonus: s.comebackBonus,
    })
    .returning(["id", "code"])
    .executeTakeFirstOrThrow();

  await db
    .insertInto("lobby_players")
    .values({
      lobby_id: lobby.id,
      user_id: identity.userId,
      role: s.hostRole,
    })
    .execute();

  return NextResponse.json({ code: lobby.code });
}
