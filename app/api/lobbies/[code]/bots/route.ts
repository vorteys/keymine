import { NextResponse } from "next/server";
import { z } from "zod";
import { getIdentity } from "@/lib/auth/identity";
import { getLobbyByCode, isHost } from "@/lib/lobby";
import { addBot, removeBot } from "@/lib/lobby-bots";
import { msg } from "@/lib/api-messages";

const schema = z.object({
  level: z.enum(["noob", "debutant", "intermediaire", "expert", "impossible"]),
});

const removeSchema = z.object({ playerId: z.string().uuid() });

// BOT-1: l'hôte ajoute des bots à une course.
export async function POST(request: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const lobby = await getLobbyByCode(code);
  if (!lobby) return NextResponse.json({ error: await msg("lobby_not_found") }, { status: 404 });

  const identity = await getIdentity();
  if (!identity) {
    return NextResponse.json({ error: await msg("pseudo_required"), code: "pseudo_required" }, { status: 401 });
  }
  if (!isHost(identity, lobby)) {
    return NextResponse.json({ error: await msg("host_only_add_bots") }, { status: 403 });
  }

  const body = schema.safeParse(await request.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: await msg("bad_level") }, { status: 400 });

  const result = await addBot(lobby, body.data.level);
  if (!result.ok) return await failure(result.reason);
  return NextResponse.json({ ok: true });
}

// CONF-10 : l'hôte retire un bot de la salle d'attente.
export async function DELETE(request: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const lobby = await getLobbyByCode(code);
  if (!lobby) return NextResponse.json({ error: await msg("lobby_not_found") }, { status: 404 });

  const identity = await getIdentity();
  if (!identity || !isHost(identity, lobby)) {
    return NextResponse.json({ error: await msg("host_only_remove_bots") }, { status: 403 });
  }
  const body = removeSchema.safeParse(await request.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: await msg("bad_bot") }, { status: 400 });

  const result = await removeBot(lobby, body.data.playerId);
  if (!result.ok) return await failure(result.reason);
  return NextResponse.json({ ok: true });
}

async function failure(reason: "not_waiting" | "full" | "not_found") {
  const table = {
    not_waiting: ["bots_not_waiting", 409],
    full: ["full", 409],
    not_found: ["bot_not_found", 404],
  } as const;
  const [key, status] = table[reason];
  return NextResponse.json({ error: await msg(key), code: reason }, { status });
}
