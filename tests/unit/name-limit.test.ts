import { describe, expect, it } from "vitest";
import { isNameChangeLimited, NAME_CHANGES_PER_MINUTE } from "@/lib/name-limit";

describe("limite de renommage d'une salle", () => {
  it("refuse au-delà de la limite dans la minute, puis réautorise", () => {
    const start = 1_000_000;
    for (let i = 0; i < NAME_CHANGES_PER_MINUTE; i++) {
      expect(isNameChangeLimited("salle-a", start + i)).toBe(false);
    }
    expect(isNameChangeLimited("salle-a", start + 1_000)).toBe(true);
    expect(isNameChangeLimited("salle-b", start + 1_000)).toBe(false); // une autre salle n'est pas touchée
    expect(isNameChangeLimited("salle-a", start + 61_000)).toBe(false);
  });
});
