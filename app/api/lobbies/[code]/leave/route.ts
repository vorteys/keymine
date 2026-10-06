import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getIdentity } from "@/lib/auth/identity";
import { getLobbyByCode } from "@/lib/lobby";

export async function POST(_request: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const lobby = await getLobbyByCode(code);
  if (!lobby) return NextResponse.json({ error: "Salle introuvable" }, { status: 404 });

  const identity = await getIdentity();
  if (!identity) {
    return NextResponse.json({ error: "Pseudo requis", code: "pseudo_required" }, { status: 401 });
  }
  await db
    .deleteFrom("lobby_players")
    .where("lobby_id", "=", lobby.id)
    .where((eb) =>
      identity.kind === "user"
        ? eb("user_id", "=", identity.userId)
        : eb("guest_id", "=", identity.guestId),
    )
    .execute();

  return NextResponse.json({ ok: true });
}
