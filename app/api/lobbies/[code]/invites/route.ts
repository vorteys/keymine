import { NextResponse } from "next/server";
import { z } from "zod";
import { getIdentity } from "@/lib/auth/identity";
import { createInvite, listInvites, revokeInvite } from "@/lib/invites";
import { getLobbyByCode, isHost } from "@/lib/lobby";
import { msg } from "@/lib/api-messages";

// SALLE-04 : l'hôte génère, consulte et révoque les liens d'invitation de sa salle.
async function hostLobby(code: string) {
  const lobby = await getLobbyByCode(code);
  if (!lobby) return { error: NextResponse.json({ error: await msg("lobby_not_found") }, { status: 404 }) } as const;
  const identity = await getIdentity();
  if (!identity || !isHost(identity, lobby)) {
    return { error: NextResponse.json({ error: await msg("host_only_invites") }, { status: 403 }) } as const;
  }
  if (lobby.status === "closed") {
    return { error: NextResponse.json({ error: await msg("lobby_closed") }, { status: 410 }) } as const;
  }
  return { lobby } as const;
}

export async function GET(_request: Request, { params }: { params: Promise<{ code: string }> }) {
  const found = await hostLobby((await params).code);
  if ("error" in found) return found.error;
  return NextResponse.json({ invites: await listInvites(found.lobby.id) });
}

const createSchema = z.object({ label: z.string().trim().max(40).optional() });

export async function POST(request: Request, { params }: { params: Promise<{ code: string }> }) {
  const found = await hostLobby((await params).code);
  if ("error" in found) return found.error;
  const body = createSchema.safeParse(await request.json().catch(() => ({})));
  if (!body.success) return NextResponse.json({ error: await msg("bad_label") }, { status: 400 });
  const invite = await createInvite(found.lobby.id, body.data.label);
  if (!invite) return NextResponse.json({ error: await msg("too_many_invites"), code: "too_many" }, { status: 409 });
  return NextResponse.json({ invite });
}

const revokeSchema = z.object({ inviteId: z.string().uuid() });

export async function DELETE(request: Request, { params }: { params: Promise<{ code: string }> }) {
  const found = await hostLobby((await params).code);
  if ("error" in found) return found.error;
  const body = revokeSchema.safeParse(await request.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: await msg("bad_invite") }, { status: 400 });
  const ok = await revokeInvite(found.lobby.id, body.data.inviteId);
  return ok ? NextResponse.json({ ok: true }) : NextResponse.json({ error: await msg("invite_not_found") }, { status: 404 });
}
