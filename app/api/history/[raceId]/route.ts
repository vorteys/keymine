import { NextResponse } from "next/server";
import { z } from "zod";
import { msg } from "@/lib/api-messages";
import { getIdentity } from "@/lib/auth/identity";
import { hideFromHistory } from "@/lib/history";

const paramsSchema = z.object({ raceId: z.uuid() });

// HIST-01 : retirer une course de son propre historique (comptes seulement).
// Seule la ligne du joueur est masquée : les autres joueurs et les statistiques ne changent pas.
export async function DELETE(_request: Request, ctx: RouteContext<"/api/history/[raceId]">) {
  const identity = await getIdentity();
  if (!identity || identity.kind !== "user") {
    return NextResponse.json(
      { error: await msg("login_required"), code: "account_required" },
      { status: 401 },
    );
  }
  const parsed = paramsSchema.safeParse(await ctx.params);
  if (!parsed.success)
    return NextResponse.json({ error: await msg("generic"), code: "bad_request" }, { status: 400 });

  const hidden = await hideFromHistory(identity.userId, parsed.data.raceId);
  if (!hidden)
    return NextResponse.json({ error: await msg("generic"), code: "not_found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
