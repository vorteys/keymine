import { describe, expect, it } from "vitest";
import { clientIpFrom } from "@/lib/client-ip";
import { generateInviteToken } from "@/lib/invite-token";

const headers = (init: Record<string, string>) => new Headers(init);

describe("adresse IP du client (SALLE-04, SALLE-10)", () => {
  it("prend la dernière entrée de X-Forwarded-For (ajoutée par le proxy de confiance)", () => {
    expect(clientIpFrom(headers({ "x-forwarded-for": "6.6.6.6, 203.0.113.9" }))).toBe("203.0.113.9");
    expect(clientIpFrom(headers({ "x-forwarded-for": "203.0.113.9" }))).toBe("203.0.113.9");
  });

  it("se replie sur X-Real-IP puis sur une valeur fixe", () => {
    expect(clientIpFrom(headers({ "x-real-ip": "198.51.100.4" }))).toBe("198.51.100.4");
    expect(clientIpFrom(headers({}))).toBe("inconnue");
  });
});

describe("jeton d'invitation (SALLE-04)", () => {
  it("contient au moins 128 bits d'entropie et n'est jamais répété", () => {
    const token = generateInviteToken();
    // base64url : 6 bits par caractère ; 43 caractères = 256 bits.
    expect(token).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(token.length * 6).toBeGreaterThanOrEqual(128);
    const many = new Set(Array.from({ length: 500 }, () => generateInviteToken()));
    expect(many.size).toBe(500);
  });
});
