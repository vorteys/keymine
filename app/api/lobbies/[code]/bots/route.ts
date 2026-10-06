import { NextResponse } from "next/server";
import { z } from "zod";
import { getIdentity } from "@/lib/auth/identity";
import { getLobbyByCode, isHost } from "@/lib/lobby";
import { addBot, removeBot } from "@/lib/lobby-bots";

const schema = z.object({
  level: z.enum(["noob", "debutant", "intermediaire", "expert", "impossible"]),
});

const removeSchema = z.object({ playerId: z.string().uuid() });

// BOT-1: l'hôte ajoute des bots à une course.
export async function POST(request: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const lobby = await getLobbyByCode(code);
  if (!lobby) return NextResponse.json({ error: "Salle introuvable" }, { status: 404 });

  const identity = await getIdentity();
  if (!identity) {
    return NextResponse.json({ error: "Pseudo requis", code: "pseudo_required" }, { status: 401 });
  }
  if (!isHost(identity, lobby)) {
    return NextResponse.json({ error: "Seul l'hôte peut ajouter des bots" }, { status: 403 });
  }

  const body = schema.safeParse(await request.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "Niveau invalide" }, { status: 400 });

  const result = await addBot(lobby, body.data.level);
  if (!result.ok) return failure(result.reason);
  return NextResponse.json({ ok: true });
}

// CONF-10 : l'hôte retire un bot de la salle d'attente.
export async function DELETE(request: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const lobby = await getLobbyByCode(code);
  if (!lobby) return NextResponse.json({ error: "Salle introuvable" }, { status: 404 });

  const identity = await getIdentity();
  if (!identity || !isHost(identity, lobby)) {
    return NextResponse.json({ error: "Seul l'hôte peut retirer des bots" }, { status: 403 });
  }
  const body = removeSchema.safeParse(await request.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "Bot invalide" }, { status: 400 });

  const result = await removeBot(lobby, body.data.playerId);
  if (!result.ok) return failure(result.reason);
  return NextResponse.json({ ok: true });
}

function failure(reason: "not_waiting" | "full" | "not_found") {
  const messages = {
    not_waiting: ["Les bots se gèrent en salle d'attente", 409],
    full: ["La salle est pleine", 409],
    not_found: ["Bot introuvable", 404],
  } as const;
  const [error, status] = messages[reason];
  return NextResponse.json({ error, code: reason }, { status });
}
