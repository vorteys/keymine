import { NextResponse } from "next/server";
import { z } from "zod";
import { getIdentity } from "@/lib/auth/identity";
import { getLobbyByCode, joinLobby } from "@/lib/lobby";

const schema = z.object({ role: z.enum(["participant", "spectator"]).optional() });

// SALLE-09 / SALLE-05 / SALLE-06: on ne rejoint une salle qu'en attente ou sur
// l'écran des résultats, sans dépasser la capacité, et jamais depuis une autre salle.
export async function POST(request: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const lobby = await getLobbyByCode(code);
  if (!lobby || lobby.status === "closed") {
    return NextResponse.json({ error: "Salle introuvable" }, { status: 404 });
  }

  const identity = await getIdentity();
  if (!identity) {
    return NextResponse.json({ error: "Pseudo requis", code: "pseudo_required" }, { status: 401 });
  }

  if (lobby.status === "countdown" || lobby.status === "racing") {
    return NextResponse.json(
      { error: "La course est en cours", code: "race_in_progress" },
      { status: 409 },
    );
  }

  const body = schema.safeParse(await request.json().catch(() => ({})));
  const role = body.success ? body.data.role : undefined;

  const result = await joinLobby(lobby, identity, role);
  if (!result.ok) {
    if (result.reason === "already_in_room") {
      return NextResponse.json(
        { error: "Tu es déjà dans une autre salle", code: "already_in_room", currentCode: result.currentCode },
        { status: 409 },
      );
    }
    return NextResponse.json({ error: "La salle est pleine", code: "full" }, { status: 409 });
  }
  return NextResponse.json({ ok: true });
}
