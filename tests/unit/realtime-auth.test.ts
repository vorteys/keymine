// @vitest-environment node
import { SignJWT } from "jose";
import { describe, expect, it } from "vitest";
import { allowedOrigins, identityFromCookies, isAllowedOrigin, parseCookies } from "@/realtime/auth";

const SECRET = "secret-de-test";

async function token(sub: string, secret = SECRET) {
  return new SignJWT({ name: "x" })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(sub)
    .setExpirationTime("1h")
    .sign(new TextEncoder().encode(secret));
}

describe("authentification WebSocket", () => {
  it("lit les cookies", () => {
    expect(parseCookies("a=1; km_session=abc%20d")).toEqual({ a: "1", km_session: "abc d" });
    expect(parseCookies(undefined)).toEqual({});
  });

  it("identifie un compte et un invité par leur cookie signé", async () => {
    const user = await identityFromCookies(`km_session=${await token("u1")}`, SECRET);
    expect(user).toEqual({ kind: "user", userId: "u1", key: "u:u1" });
    const guest = await identityFromCookies(`km_guest=${await token("g1")}`, SECRET);
    expect(guest).toEqual({ kind: "guest", guestId: "g1", key: "g:g1" });
  });

  it("refuse un cookie falsifié ou absent", async () => {
    expect(await identityFromCookies(`km_session=${await token("u1", "autre-secret")}`, SECRET)).toBeNull();
    expect(await identityFromCookies("km_session=n-importe-quoi", SECRET)).toBeNull();
    expect(await identityFromCookies(undefined, SECRET)).toBeNull();
  });

  it("n'accepte que les origines autorisées", () => {
    const allowed = allowedOrigins({ NEXT_PUBLIC_SITE_URL: "https://keymine.example/accueil", NODE_ENV: "production" });
    expect(allowed).toEqual(["https://keymine.example"]);
    expect(isAllowedOrigin("https://keymine.example", allowed)).toBe(true);
    expect(isAllowedOrigin("https://evil.example", allowed)).toBe(false);
    expect(isAllowedOrigin(undefined, allowed)).toBe(false);
  });
});
