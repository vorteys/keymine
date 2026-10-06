import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getIdentity } from "@/lib/auth/identity";
import { getLobbyByCode, isHost } from "@/lib/lobby";
import { sweepLobbies } from "@/lib/lobby-sweep";
import { lobbyUpdateSchema } from "@/lib/lobby-schema";
import { assertTransition } from "@/lib/race/state";
import { loadLobbySnapshot, viewLobby, type Viewer } from "@/lib/lobby-snapshot";

// Lecture HTTP de l'état d'une salle (repli si le WebSocket est indisponible).
export async function GET(_request: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const lobby = await getLobbyByCode(code);
  if (!lobby) return NextResponse.json({ error: "Salle introuvable" }, { status: 404 });

  await sweepLobbies();
  const raw = await loadLobbySnapshot(code);
  if (!raw) return NextResponse.json({ error: "Salle introuvable" }, { status: 404 });

  const identity = await getIdentity();
  const viewer: Viewer | null = identity
    ? {
        userId: identity.kind === "user" ? identity.userId : null,
        guestId: identity.kind === "guest" ? identity.guestId : null,
      }
    : null;
  return NextResponse.json(viewLobby(raw, viewer));
}

// COUR-13: l'hôte peut fermer la course et le lobby.
export async function DELETE(_request: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const lobby = await getLobbyByCode(code);
  if (!lobby) return NextResponse.json({ error: "Salle introuvable" }, { status: 404 });

  const identity = await getIdentity();
  if (!identity || !isHost(identity, lobby)) {
    return NextResponse.json({ error: "Seul l'hôte peut fermer la salle" }, { status: 403 });
  }

  if (lobby.status !== "closed") {
    assertTransition(lobby.status, "closed");
    await db
      .updateTable("lobbies")
      .set({ status: "closed", closed_at: new Date() })
      .where("id", "=", lobby.id)
      .execute();
  }

  return NextResponse.json({ ok: true });
}

// CONF-12 : l'hôte modifie la configuration en salle d'attente ; tous les
// présents la voient en direct (le changement déclenche une notification Postgres).
export async function PATCH(request: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const lobby = await getLobbyByCode(code);
  if (!lobby) return NextResponse.json({ error: "Salle introuvable" }, { status: 404 });

  const identity = await getIdentity();
  if (!identity || !isHost(identity, lobby)) {
    return NextResponse.json({ error: "Seul l'hôte peut modifier les réglages" }, { status: 403 });
  }
  if (lobby.status !== "lobby") {
    return NextResponse.json({ error: "Les réglages ne se modifient qu'en salle d'attente", code: "not_waiting" }, { status: 409 });
  }

  const body = lobbyUpdateSchema.safeParse(await request.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "Réglages invalides" }, { status: 400 });
  const s = body.data;

  // Réduire la capacité sous le nombre de participants actuel n'a pas de sens.
  if (s.maxPlayers !== undefined) {
    const count = await db
      .selectFrom("lobby_players")
      .select((eb) => eb.fn.countAll<number>().as("n"))
      .where("lobby_id", "=", lobby.id)
      .where("role", "=", "participant")
      .where("active", "=", true)
      .executeTakeFirst();
    if (s.maxPlayers < Number(count?.n ?? 0)) {
      return NextResponse.json({ error: "Capacité inférieure au nombre de participants", code: "capacity_too_low" }, { status: 409 });
    }
  }

  const merged = {
    include: s.includeChars ?? lobby.include_chars,
    exclude: s.excludeChars ?? lobby.exclude_chars,
  };
  if (merged.include.some((c) => merged.exclude.includes(c))) {
    return NextResponse.json({ error: "Un caractère ne peut pas être à la fois inclus et exclu" }, { status: 400 });
  }

  await db
    .updateTable("lobbies")
    .set({
      ...(s.name !== undefined && { name: s.name }),
      ...(s.access !== undefined && { access: s.access }),
      ...(s.maxPlayers !== undefined && { max_players: s.maxPlayers }),
      ...(s.durationSeconds !== undefined && { duration_seconds: s.durationSeconds }),
      ...(s.language !== undefined && { language: s.language }),
      ...(s.textType !== undefined && { text_type: s.textType }),
      ...(s.textLength !== undefined && { text_length: s.textLength }),
      ...(s.complexity !== undefined && { complexity: s.complexity }),
      ...(s.uppercase !== undefined && { allow_uppercase: s.uppercase }),
      ...(s.punctuation !== undefined && { allow_punctuation: s.punctuation }),
      ...(s.digits !== undefined && { allow_digits: s.digits }),
      ...(s.accents !== undefined && { allow_accents: s.accents }),
      ...(s.includeChars !== undefined && { include_chars: s.includeChars }),
      ...(s.excludeChars !== undefined && { exclude_chars: s.excludeChars }),
      ...(s.errorMode !== undefined && { error_mode: s.errorMode }),
      ...(s.penaltySeconds !== undefined && { penalty_seconds: s.penaltySeconds }),
      ...(s.comebackBonus !== undefined && { comeback_bonus: s.comebackBonus }),
    })
    .where("id", "=", lobby.id)
    .where("status", "=", "lobby")
    .execute();

  return NextResponse.json({ ok: true });
}
