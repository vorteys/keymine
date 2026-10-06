import { NextResponse } from "next/server";
import { z } from "zod";
import { getIdentity } from "@/lib/auth/identity";
import { kickPlayer } from "@/lib/bans";
import { getLobbyByCode, isHost } from "@/lib/lobby";
import { msg } from "@/lib/api-messages";

const schema = z.object({ playerId: z.string().uuid() });

// SALLE-07 : l'hôte expulse un participant ou un spectateur.
export async function POST(request: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const lobby = await getLobbyByCode(code);
  if (!lobby) return NextResponse.json({ error: await msg("lobby_not_found") }, { status: 404 });

  const identity = await getIdentity();
  if (!identity || !isHost(identity, lobby)) {
    return NextResponse.json({ error: await msg("host_only_kick") }, { status: 403 });
  }
  const body = schema.safeParse(await request.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: await msg("bad_player") }, { status: 400 });

  const result = await kickPlayer(lobby, body.data.playerId);
  if (result.ok) return NextResponse.json({ ok: true });
  const table = {
    not_found: ["player_not_found", 404],
    is_bot: ["kick_is_bot", 400],
    is_host: ["kick_is_host", 400],
    bad_state: ["kick_bad_state", 409],
  } as const;
  const [key, status] = table[result.reason];
  return NextResponse.json({ error: await msg(key), code: result.reason }, { status });
}
