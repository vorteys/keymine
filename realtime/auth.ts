import { jwtVerify } from "jose";

// Authentification d'une connexion WebSocket à partir des cookies posés par
// l'application web (km_session pour un compte, km_guest pour un invité),
// vérifiés avec le même secret que côté Next.js. Aucune dépendance à Next.

export type RealtimeIdentity =
  | { kind: "user"; userId: string; key: string }
  | { kind: "guest"; guestId: string; key: string };

export function parseCookies(header: string | undefined): Record<string, string> {
  const out: Record<string, string> = {};
  if (!header) return out;
  for (const part of header.split(";")) {
    const index = part.indexOf("=");
    if (index < 0) continue;
    const name = part.slice(0, index).trim();
    const value = part.slice(index + 1).trim();
    if (name) out[name] = decodeURIComponent(value);
  }
  return out;
}

async function subjectOf(token: string | undefined, secret: Uint8Array): Promise<string | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret);
    return typeof payload.sub === "string" ? payload.sub : null;
  } catch {
    return null;
  }
}

export async function identityFromCookies(
  cookieHeader: string | undefined,
  secretValue: string,
): Promise<RealtimeIdentity | null> {
  const secret = new TextEncoder().encode(secretValue);
  const cookies = parseCookies(cookieHeader);
  const userId = await subjectOf(cookies.km_session, secret);
  if (userId) return { kind: "user", userId, key: `u:${userId}` };
  const guestId = await subjectOf(cookies.km_guest, secret);
  if (guestId) return { kind: "guest", guestId, key: `g:${guestId}` };
  return null;
}

/**
 * Contrôle de l'en-tête Origin (anti détournement de WebSocket entre sites).
 * Une origine absente (client non navigateur) est refusée.
 */
export function isAllowedOrigin(origin: string | undefined, allowed: readonly string[]): boolean {
  if (!origin) return false;
  return allowed.includes(origin);
}

export function allowedOrigins(env: NodeJS.ProcessEnv = process.env): string[] {
  const list = new Set<string>();
  const site = env.NEXT_PUBLIC_SITE_URL;
  if (site) list.add(new URL(site).origin);
  for (const extra of (env.REALTIME_ALLOWED_ORIGINS ?? "").split(",")) {
    if (extra.trim()) list.add(extra.trim());
  }
  if (env.NODE_ENV !== "production") {
    list.add("http://localhost:3000");
    list.add("http://127.0.0.1:3000");
  }
  return [...list];
}
