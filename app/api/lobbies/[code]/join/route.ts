import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getOrCreateIdentity } from "@/lib/auth/identity";
import { getLobbyByCode } from "@/lib/lobby";

const schema = z.object({ role: z.enum(["participant", "spectator"]).default("participant") });

// COUR-2/COUR-8: rejoindre une salle avant le départ, comme participant ou spectateur.
export async function POST(request: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const lobby = await getLobbyByCode(code);
  if (!lobby) return NextResponse.json({ error: "Salle introuvable" }, { status: 404 });
  if (lobby.status !== "lobby") {
    return NextResponse.json(
      { error: "La course a déjà commencé, tu peux rejoindre en spectateur" },
      { status: 409 },
    );
  }

  const body = schema.safeParse(await request.json().catch(() => ({})));
  const role = body.success ? body.data.role : "participant";

  const identity = await getOrCreateIdentity();

  const existing = await db
    .selectFrom("lobby_players")
    .select("id")
    .where("lobby_id", "=", lobby.id)
    .where((eb) =>
      identity.kind === "user"
        ? eb("user_id", "=", identity.userId)
        : eb("guest_id", "=", identity.guestId),
    )
    .executeTakeFirst();

  if (existing) {
    await db
      .updateTable("lobby_players")
      .set({ role, last_seen_at: new Date() })
      .where("id", "=", existing.id)
      .execute();
    return NextResponse.json({ ok: true });
  }

  if (role === "participant") {
    // COUR-7: un lobby plein refuse les nouveaux joueurs.
    const count = await db
      .selectFrom("lobby_players")
      .select((eb) => eb.fn.countAll<number>().as("n"))
      .where("lobby_id", "=", lobby.id)
      .where("role", "=", "participant")
      .executeTakeFirst();
    if (Number(count?.n ?? 0) >= lobby.max_players) {
      return NextResponse.json({ error: "La salle est pleine" }, { status: 409 });
    }
  }

  await db
    .insertInto("lobby_players")
    .values({
      lobby_id: lobby.id,
      user_id: identity.kind === "user" ? identity.userId : null,
      guest_id: identity.kind === "guest" ? identity.guestId : null,
      guest_name: identity.kind === "guest" ? identity.displayName : null,
      role,
    })
    .execute();

  return NextResponse.json({ ok: true });
}
