import { NextResponse } from "next/server";
import { z } from "zod";
import { getIdentity } from "@/lib/auth/identity";
import { clientIpFrom } from "@/lib/client-ip";
import { isJoinRateLimited, recordFailedJoin } from "@/lib/join-limit";
import { getLobbyByCode, joinLobby } from "@/lib/lobby";
import { needsInvite } from "@/lib/lobby-access";

const schema = z.object({ role: z.enum(["participant", "spectator"]).optional() });

// SALLE-09 / SALLE-05 / SALLE-06 / SALLE-03 / SALLE-07 / SALLE-10 : on ne rejoint
// une salle qu'en attente ou sur l'écran des résultats, sans dépasser la
// capacité, jamais depuis une autre salle, jamais si on a été expulsé, et une
// salle privée exige un lien d'invitation. Les essais échoués sont limités par IP.
export async function POST(request: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const ip = clientIpFrom(request.headers);

  if (await isJoinRateLimited(ip)) {
    return NextResponse.json(
      { error: "Trop de tentatives, réessaie dans une minute.", code: "rate_limited" },
      { status: 429, headers: { "Retry-After": "60" } },
    );
  }

  const lobby = await getLobbyByCode(code);
  if (!lobby || lobby.status === "closed") {
    await recordFailedJoin(ip);
    return NextResponse.json({ error: "Salle introuvable" }, { status: 404 });
  }

  const identity = await getIdentity();
  if (!identity) {
    return NextResponse.json({ error: "Pseudo requis", code: "pseudo_required" }, { status: 401 });
  }

  if (await needsInvite(lobby, identity)) {
    await recordFailedJoin(ip);
    return NextResponse.json(
      { error: "Cette salle est privée : il faut un lien d'invitation.", code: "invite_required" },
      { status: 403 },
    );
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
    if (result.reason === "banned") {
      return NextResponse.json({ error: "Tu as été expulsé de cette salle.", code: "banned" }, { status: 403 });
    }
    return NextResponse.json({ error: "La salle est pleine", code: "full" }, { status: 409 });
  }
  return NextResponse.json({ ok: true });
}
