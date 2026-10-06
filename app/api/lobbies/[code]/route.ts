import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getIdentity } from "@/lib/auth/identity";
import { getLobbyByCode, isHost } from "@/lib/lobby";
import { sweepLobbies } from "@/lib/lobby-sweep";
import { loadLobbySnapshot, viewLobby, type Viewer } from "@/lib/lobby-snapshot";

// Lecture HTTP de l'état d'une salle (repli si le WebSocket est indisponible).
export async function GET(_request: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const lobby = await getLobbyByCode(code);
  if (!lobby) return NextResponse.json({ error: "Salle introuvable" }, { status: 404 });

  await sweepLobbies();
  const raw = await loadLobbySnapshot(code);
  if (!raw) return NextResponse.json({ error: "Salle introuvable" }, { status: 404 });

  const identity = await getIdentity();
  const viewer: Viewer | null = identity
    ? {
        userId: identity.kind === "user" ? identity.userId : null,
        guestId: identity.kind === "guest" ? identity.guestId : null,
      }
    : null;
  return NextResponse.json(viewLobby(raw, viewer));
}

// COUR-13: l'hôte peut fermer la course et le lobby.
export async function DELETE(_request: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const lobby = await getLobbyByCode(code);
  if (!lobby) return NextResponse.json({ error: "Salle introuvable" }, { status: 404 });

  const identity = await getIdentity();
  if (!identity || !isHost(identity, lobby)) {
    return NextResponse.json({ error: "Seul l'hôte peut fermer la salle" }, { status: 403 });
  }

  await db
    .updateTable("lobbies")
    .set({ status: "closed", closed_at: new Date() })
    .where("id", "=", lobby.id)
    .execute();

  return NextResponse.json({ ok: true });
}
