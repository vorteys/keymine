import "server-only";
import { cookies } from "next/headers";
import { randomUUID } from "node:crypto";

const COOKIE_NAME = "km_guest";
const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

/**
 * Identifiant d'invité (AUTH-7): pas de compte, juste un cookie pour
 * relier ses courses de la session. Contrairement à la session utilisateur,
 * celui-ci n'a pas besoin d'être signé: ce n'est pas un droit d'accès, juste
 * une étiquette pour retrouver "ses" lignes pendant la session.
 */
export async function getOrCreateGuestId(): Promise<string> {
  const store = await cookies();
  const existing = store.get(COOKIE_NAME)?.value;
  if (existing) return existing;

  const guestId = randomUUID();
  store.set(COOKIE_NAME, guestId, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: ONE_YEAR_SECONDS,
  });
  return guestId;
}

export async function readGuestId(): Promise<string | null> {
  const store = await cookies();
  return store.get(COOKIE_NAME)?.value ?? null;
}

export function guestDisplayName(guestId: string): string {
  // 4 chiffres stables dérivés de l'id, juste pour avoir un nom lisible
  // ("Invité 4821") plutôt que l'UUID complet.
  let hash = 0;
  for (let i = 0; i < guestId.length; i++) {
    hash = (hash * 31 + guestId.charCodeAt(i)) >>> 0;
  }
  return `Invité ${1000 + (hash % 9000)}`;
}
