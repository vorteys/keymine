import { describe, expect, it } from "vitest";
import { guestPseudoSchema } from "@/lib/auth/pseudo";

describe("guestPseudoSchema (AUTH-02)", () => {
  it("accepte un pseudonyme de 3 à 20 caractères", () => {
    expect(guestPseudoSchema.safeParse("Zoé_42").success).toBe(true);
    expect(guestPseudoSchema.safeParse("abc").success).toBe(true);
    expect(guestPseudoSchema.safeParse("a".repeat(20)).success).toBe(true);
  });

  it("refuse trop court, trop long et vide", () => {
    expect(guestPseudoSchema.safeParse("ab").success).toBe(false);
    expect(guestPseudoSchema.safeParse("a".repeat(21)).success).toBe(false);
    expect(guestPseudoSchema.safeParse("   ").success).toBe(false);
  });

  it("refuse les caractères non autorisés", () => {
    expect(guestPseudoSchema.safeParse("<script>").success).toBe(false);
    expect(guestPseudoSchema.safeParse("a/b\\c").success).toBe(false);
  });

  it("ignore les espaces autour avant de compter la longueur", () => {
    const parsed = guestPseudoSchema.safeParse("  Léo  ");
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data).toBe("Léo");
  });
});
