import { NextResponse } from "next/server";
import { getIdentity } from "@/lib/auth/identity";
import { isBanned } from "@/lib/bans";
import { clientIpFrom } from "@/lib/client-ip";
import { redeemInvite } from "@/lib/invites";
import { isJoinRateLimited, recordFailedJoin } from "@/lib/join-limit";
import { joinLobby } from "@/lib/lobby";
import { db } from "@/lib/db";

const REFUSALS = {
  invalid: ["Ce lien d'invitation n'existe pas.", 404],
  revoked: ["Ce lien d'invitation a été révoqué.", 410],
  closed: ["Cette salle est fermée.", 410],
  wrong_ip: ["Ce lien a déjà été utilisé par une autre personne.", 403],
} as const;

// SALLE-04 : utilisation d'un lien d'invitation (usage unique, lié à l'IP).
export async function POST(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const ip = clientIpFrom(request.headers);

  if (await isJoinRateLimited(ip)) {
    return NextResponse.json(
      { error: "Trop de tentatives, réessaie dans une minute.", code: "rate_limited" },
      { status: 429, headers: { "Retry-After": "60" } },
    );
  }

  const identity = await getIdentity();
  if (!identity) {
    return NextResponse.json({ error: "Pseudo requis", code: "pseudo_required" }, { status: 401 });
  }

  const invite = await db
    .selectFrom("lobby_invites")
    .select("lobby_id")
    .where("token", "=", token)
    .executeTakeFirst();
  if (invite && (await isBanned(invite.lobby_id, identity))) {
    return NextResponse.json({ error: "Tu as été expulsé de cette salle.", code: "banned" }, { status: 403 });
  }

  const redeemed = await redeemInvite(token, identity, ip);
  if (!redeemed.ok) {
    await recordFailedJoin(ip);
    const [error, status] = REFUSALS[redeemed.reason];
    return NextResponse.json({ error, code: redeemed.reason }, { status });
  }

  const lobby = await db.selectFrom("lobbies").selectAll().where("id", "=", redeemed.lobbyId).executeTakeFirstOrThrow();
  if (lobby.status === "countdown" || lobby.status === "racing") {
    return NextResponse.json({ error: "La course est en cours", code: "race_in_progress" }, { status: 409 });
  }
  const result = await joinLobby(lobby, identity);
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
  return NextResponse.json({ ok: true, code: redeemed.lobbyCode });
}
