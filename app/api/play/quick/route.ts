import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getOrCreateIdentity } from "@/lib/auth/identity";
import { generateUniqueLobbyCode } from "@/lib/lobby";

// COUR-16/H16: "Partie rapide" — rejoint un lobby public en attente s'il y en
// a un, sinon en crée un (publique, mode Texte, langue du site, 5 min) et le
// joueur devient le Chef.
export async function POST() {
  const identity = await getOrCreateIdentity();

  const open = await db
    .selectFrom("lobbies")
    .select(["id", "code", "max_players"])
    .where("status", "=", "lobby")
    .where("access", "=", "public")
    .where("is_quick", "=", true)
    .orderBy("created_at", "desc")
    .execute();

  for (const lobby of open) {
    const count = await db
      .selectFrom("lobby_players")
      .select((eb) => eb.fn.countAll<number>().as("n"))
      .where("lobby_id", "=", lobby.id)
      .where("role", "=", "participant")
      .executeTakeFirst();
    if (Number(count?.n ?? 0) < lobby.max_players) {
      await db
        .insertInto("lobby_players")
        .values({
          lobby_id: lobby.id,
          user_id: identity.kind === "user" ? identity.userId : null,
          guest_id: identity.kind === "guest" ? identity.guestId : null,
          guest_name: identity.kind === "guest" ? identity.displayName : null,
          role: "participant",
        })
        .onConflict((oc) => oc.doNothing())
        .execute();
      return NextResponse.json({ code: lobby.code });
    }
  }

  const code = await generateUniqueLobbyCode();
  const created = await db
    .insertInto("lobbies")
    .values({
      code,
      host_user_id: identity.kind === "user" ? identity.userId : null,
      host_guest_id: identity.kind === "guest" ? identity.guestId : null,
      access: "public",
      name: "Partie rapide",
      language: "fr",
      text_mode: "texte",
      is_quick: true,
    })
    .returning(["id", "code"])
    .executeTakeFirstOrThrow();

  await db
    .insertInto("lobby_players")
    .values({
      lobby_id: created.id,
      user_id: identity.kind === "user" ? identity.userId : null,
      guest_id: identity.kind === "guest" ? identity.guestId : null,
      guest_name: identity.kind === "guest" ? identity.displayName : null,
      role: "participant",
    })
    .execute();

  return NextResponse.json({ code: created.code });
}
