import "server-only";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

const COOKIE_NAME = "km_session";
const REMEMBER_ME_SECONDS = 60 * 60 * 24 * 30; // 30 jours (H8)

function secretKey() {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error("SESSION_SECRET manquant (voir .env.example).");
  }
  return new TextEncoder().encode(secret);
}

export type SessionPayload = {
  userId: string;
  username: string;
};

export async function createSession(payload: SessionPayload, rememberMe: boolean) {
  const jwt = new SignJWT({ username: payload.username })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.userId)
    .setIssuedAt();

  const token = rememberMe
    ? await jwt.setExpirationTime(`${REMEMBER_ME_SECONDS}s`).sign(secretKey())
    : await jwt.sign(secretKey());

  const store = await cookies();
  store.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    // Sans maxAge: cookie de session, effacé à la fermeture du navigateur.
    ...(rememberMe ? { maxAge: REMEMBER_ME_SECONDS } : {}),
  });
}

export async function destroySession() {
  const store = await cookies();
  store.delete(COOKIE_NAME);
}

export async function readSession(): Promise<SessionPayload | null> {
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, secretKey());
    if (typeof payload.sub !== "string" || typeof payload.username !== "string") return null;
    return { userId: payload.sub, username: payload.username };
  } catch {
    return null;
  }
}
