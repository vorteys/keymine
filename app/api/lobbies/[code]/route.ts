import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getIdentity } from "@/lib/auth/identity";
import { getLobbyByCode, isHost, maybeTransferHost } from "@/lib/lobby";

export async function GET(_request: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const lobby = await getLobbyByCode(code);
  if (!lobby) return NextResponse.json({ error: "Salle introuvable" }, { status: 404 });

  await maybeTransferHost(lobby.id);
  const fresh = (await getLobbyByCode(code))!;

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
      "users.username",
      "users.display_name",
    ])
    .where("lobby_id", "=", fresh.id)
    .orderBy("lobby_players.joined_at", "asc")
    .execute();

  const identity = await getIdentity();

  const activeRace = await db
    .selectFrom("races")
    .select(["id", "status", "starts_at"])
    .where("lobby_id", "=", fresh.id)
    .where("status", "in", ["countdown", "racing"])
    .orderBy("created_at", "desc")
    .executeTakeFirst();

  return NextResponse.json({
    lobby: {
      code: fresh.code,
      name: fresh.name,
      access: fresh.access,
      language: fresh.language,
      maxPlayers: fresh.max_players,
      durationSeconds: fresh.duration_seconds,
      textMode: fresh.text_mode,
      errorMode: fresh.error_mode,
      status: fresh.status,
      isHost: identity ? isHost(identity, fresh) : false,
    },
    players: players.map((p) => ({
      id: p.id,
      name: p.is_bot
        ? `Bot ${p.bot_level}`
        : (p.display_name ?? p.guest_name ?? "Joueur"),
      role: p.role,
      isBot: p.is_bot,
      botLevel: p.bot_level,
      isSelf:
        (identity?.kind === "user" && p.user_id === identity.userId) ||
        (identity?.kind === "guest" && p.guest_id === identity.guestId),
    })),
    activeRace: activeRace
      ? { id: activeRace.id, status: activeRace.status, startsAt: activeRace.starts_at }
      : null,
  });
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

  await db
    .updateTable("lobbies")
    .set({ status: "closed", closed_at: new Date() })
    .where("id", "=", lobby.id)
    .execute();

  return NextResponse.json({ ok: true });
}
