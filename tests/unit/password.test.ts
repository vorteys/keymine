import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "@/lib/auth/password";

// SEC-03 : mots de passe hachés (bcrypt), jamais stockés en clair.
describe("mots de passe", () => {
  it("ne conserve pas le mot de passe en clair et le vérifie", async () => {
    const hash = await hashPassword("un-mot-de-passe-solide");
    expect(hash).not.toContain("un-mot-de-passe-solide");
    expect(hash).toMatch(/^\$2[aby]\$12\$/); // bcrypt, coût 12
    expect(await verifyPassword("un-mot-de-passe-solide", hash)).toBe(true);
    expect(await verifyPassword("autre-mot-de-passe", hash)).toBe(false);
  });

  it("produit un hachage différent à chaque appel (sel aléatoire)", async () => {
    const [a, b] = await Promise.all([hashPassword("identique"), hashPassword("identique")]);
    expect(a).not.toBe(b);
  });
});
