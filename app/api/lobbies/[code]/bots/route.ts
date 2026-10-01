import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getOrCreateIdentity } from "@/lib/auth/identity";
import { getLobbyByCode, isHost } from "@/lib/lobby";

const schema = z.object({
  level: z.enum(["debutant", "intermediaire", "expert", "impossible"]),
});

// BOT-1: l'hôte ajoute des bots à une course.
export async function POST(request: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const lobby = await getLobbyByCode(code);
  if (!lobby) return NextResponse.json({ error: "Salle introuvable" }, { status: 404 });

  const identity = await getOrCreateIdentity();
  if (!isHost(identity, lobby)) {
    return NextResponse.json({ error: "Seul l'hôte peut ajouter des bots" }, { status: 403 });
  }

  const body = schema.safeParse(await request.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "Niveau invalide" }, { status: 400 });

  await db
    .insertInto("lobby_players")
    .values({
      lobby_id: lobby.id,
      is_bot: true,
      bot_level: body.data.level,
      role: "participant",
    })
    .execute();

  return NextResponse.json({ ok: true });
}
