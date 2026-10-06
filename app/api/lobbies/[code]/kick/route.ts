import { NextResponse } from "next/server";
import { z } from "zod";
import { getIdentity } from "@/lib/auth/identity";
import { kickPlayer } from "@/lib/bans";
import { getLobbyByCode, isHost } from "@/lib/lobby";

const schema = z.object({ playerId: z.string().uuid() });

// SALLE-07 : l'hôte expulse un participant ou un spectateur.
export async function POST(request: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const lobby = await getLobbyByCode(code);
  if (!lobby) return NextResponse.json({ error: "Salle introuvable" }, { status: 404 });

  const identity = await getIdentity();
  if (!identity || !isHost(identity, lobby)) {
    return NextResponse.json({ error: "Seul l'hôte peut expulser" }, { status: 403 });
  }
  const body = schema.safeParse(await request.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "Joueur invalide" }, { status: 400 });

  const result = await kickPlayer(lobby, body.data.playerId);
  if (result.ok) return NextResponse.json({ ok: true });
  const messages = {
    not_found: ["Joueur introuvable", 404],
    is_bot: ["Un bot se retire, il ne s'expulse pas", 400],
    is_host: ["L'hôte ne peut pas s'expulser lui-même", 400],
    bad_state: ["On ne peut pas expulser pendant le décompte ou la course", 409],
  } as const;
  const [error, status] = messages[result.reason];
  return NextResponse.json({ error, code: result.reason }, { status });
}
