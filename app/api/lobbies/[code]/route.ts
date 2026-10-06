import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getIdentity } from "@/lib/auth/identity";
import { getLobbyByCode, isHost } from "@/lib/lobby";
import { sweepLobbies } from "@/lib/lobby-sweep";
import { lobbyUpdateSchema } from "@/lib/lobby-schema";
import { revokeAllInvites } from "@/lib/invites";
import { applyLobbySettings } from "@/lib/lobby-settings";
import { assertTransition } from "@/lib/race/state";
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

  if (lobby.status !== "closed") {
    assertTransition(lobby.status, "closed");
    await db
      .updateTable("lobbies")
      .set({ status: "closed", closed_at: new Date() })
      .where("id", "=", lobby.id)
      .execute();
    await revokeAllInvites(lobby.id); // SALLE-04 : plus aucun lien ne fonctionne
  }

  return NextResponse.json({ ok: true });
}

// CONF-12 : l'hôte modifie la configuration en salle d'attente ; tous les
// présents la voient en direct (le changement déclenche une notification Postgres).
export async function PATCH(request: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const lobby = await getLobbyByCode(code);
  if (!lobby) return NextResponse.json({ error: "Salle introuvable" }, { status: 404 });

  const identity = await getIdentity();
  if (!identity || !isHost(identity, lobby)) {
    return NextResponse.json({ error: "Seul l'hôte peut modifier les réglages" }, { status: 403 });
  }
  const body = lobbyUpdateSchema.safeParse(await request.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "Réglages invalides" }, { status: 400 });

  const result = await applyLobbySettings(lobby, body.data);
  if (result.ok) return NextResponse.json({ ok: true });
  switch (result.reason) {
    case "not_waiting":
      return NextResponse.json(
        { error: "Les réglages ne se modifient qu'en salle d'attente", code: "not_waiting" },
        { status: 409 },
      );
    case "capacity_too_low":
      return NextResponse.json(
        { error: "Capacité inférieure au nombre de participants", code: "capacity_too_low" },
        { status: 409 },
      );
    case "include_exclude_conflict":
      return NextResponse.json({ error: "Un caractère ne peut pas être à la fois inclus et exclu" }, { status: 400 });
  }
}
