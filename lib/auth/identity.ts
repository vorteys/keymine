import "server-only";
import { db } from "@/lib/db";
import { readSession } from "./session";
import { getOrCreateGuestId, guestDisplayName, readGuestId } from "./guest";

export type Identity =
  | { kind: "user"; userId: string; username: string; displayName: string }
  | { kind: "guest"; guestId: string; displayName: string };

/** Qui agit sur cette requête: un compte connecté, ou un invité (créé au besoin). */
export async function getOrCreateIdentity(): Promise<Identity> {
  const session = await readSession();
  if (session) {
    const user = await db
      .selectFrom("users")
      .select(["id", "username", "display_name"])
      .where("id", "=", session.userId)
      .executeTakeFirst();
    if (user) {
      return { kind: "user", userId: user.id, username: user.username, displayName: user.display_name };
    }
  }

  const guestId = await getOrCreateGuestId();
  return { kind: "guest", guestId, displayName: guestDisplayName(guestId) };
}

/** Comme getOrCreateIdentity, mais ne crée jamais de cookie invité (lectures seules). */
export async function peekIdentity(): Promise<Identity | null> {
  const session = await readSession();
  if (session) {
    const user = await db
      .selectFrom("users")
      .select(["id", "username", "display_name"])
      .where("id", "=", session.userId)
      .executeTakeFirst();
    if (user) {
      return { kind: "user", userId: user.id, username: user.username, displayName: user.display_name };
    }
  }

  const guestId = await readGuestId();
  if (!guestId) return null;
  return { kind: "guest", guestId, displayName: guestDisplayName(guestId) };
}
