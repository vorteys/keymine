import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getIdentity } from "@/lib/auth/identity";
import { getLobbyByCode, isHost } from "@/lib/lobby";
import { assertTransition, canTransition } from "@/lib/race/state";

// COURSE-11 : sur l'écran des résultats, l'hôte relance une course avec les
// mêmes participants (RÉSULTATS → EN_ATTENTE) ; il peut ensuite modifier la
// configuration dans la salle d'attente avant de démarrer.
export async function POST(_request: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const lobby = await getLobbyByCode(code);
  if (!lobby) return NextResponse.json({ error: "Salle introuvable" }, { status: 404 });

  const identity = await getIdentity();
  if (!identity) {
    return NextResponse.json({ error: "Pseudo requis", code: "pseudo_required" }, { status: 401 });
  }
  if (!isHost(identity, lobby)) {
    return NextResponse.json({ error: "Seul l'hôte peut relancer une course" }, { status: 403 });
  }
  if (lobby.status === "lobby") return NextResponse.json({ ok: true }); // déjà en attente
  if (!canTransition(lobby.status, "lobby")) {
    return NextResponse.json({ error: "La course n'est pas terminée", code: "not_finished" }, { status: 409 });
  }

  assertTransition(lobby.status, "lobby");
  await db
    .updateTable("lobbies")
    .set({ status: "lobby", last_host_seen_at: new Date() })
    .where("id", "=", lobby.id)
    .where("status", "=", "finished")
    .execute();
  return NextResponse.json({ ok: true });
}
