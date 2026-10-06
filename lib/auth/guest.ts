import "server-only";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { randomUUID } from "node:crypto";

// AUTH-02: un invité choisit un pseudonyme (3 à 20 caractères) avant de
// rejoindre une salle. Sa session est conservée dans un cookie signé.
const COOKIE_NAME = "km_guest";
const SEVEN_DAYS_SECONDS = 60 * 60 * 24 * 7;

function secretKey() {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error("SESSION_SECRET manquant (voir .env.example).");
  }
  return new TextEncoder().encode(secret);
}

export type GuestSession = { guestId: string; name: string };

/** Crée (ou renomme) la session d'invité et dépose le cookie signé. */
export async function createGuestSession(pseudo: string): Promise<GuestSession> {
  const existing = await readGuest();
  const guestId = existing?.guestId ?? randomUUID();
  const token = await new SignJWT({ name: pseudo })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(guestId)
    .setIssuedAt()
    .setExpirationTime(`${SEVEN_DAYS_SECONDS}s`)
    .sign(secretKey());

  const store = await cookies();
  store.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SEVEN_DAYS_SECONDS,
  });
  return { guestId, name: pseudo };
}

/** Lit la session d'invité si le cookie est présent et correctement signé. */
export async function readGuest(): Promise<GuestSession | null> {
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secretKey());
    if (typeof payload.sub !== "string" || typeof payload.name !== "string") return null;
    return { guestId: payload.sub, name: payload.name };
  } catch {
    return null;
  }
}

export async function readGuestId(): Promise<string | null> {
  return (await readGuest())?.guestId ?? null;
}
