import { NextResponse } from "next/server";
import { z } from "zod";
import { createGuestSession } from "@/lib/auth/guest";
import { zodMessage } from "@/lib/api-messages";
import { guestPseudoSchema } from "@/lib/auth/pseudo";

// AUTH-02: l'invité choisit son pseudonyme avant de rejoindre une salle.
const schema = z.object({ pseudo: guestPseudoSchema });

export async function POST(request: Request) {
  const body = schema.safeParse(await request.json().catch(() => null));
  if (!body.success) {
    return NextResponse.json({ error: await zodMessage(body.error, "bad_pseudo") }, { status: 400 });
  }
  const guest = await createGuestSession(body.data.pseudo);
  return NextResponse.json({ guest: { name: guest.name } });
}
