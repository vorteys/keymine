import { describe, expect, it } from "vitest";
import { compactRows, rowsThatFit } from "@/components/race/track-rows";

const players = (n: number) => Array.from({ length: n }, (_, i) => ({ id: `p${i + 1}` }));

describe("piste repliée (COURSE-05)", () => {
  it("affiche tout le monde quand tout tient", () => {
    expect(compactRows(players(4), "p2", 6).map((p) => p.id)).toEqual(["p1", "p2", "p3", "p4"]);
  });

  it("garde les premiers du classement quand le joueur local en fait partie", () => {
    expect(compactRows(players(10), "p2", 4).map((p) => p.id)).toEqual(["p1", "p2", "p3", "p4"]);
  });

  it("montre toujours la ligne du joueur local, même loin derrière", () => {
    expect(compactRows(players(10), "p9", 4).map((p) => p.id)).toEqual(["p1", "p2", "p3", "p9"]);
  });

  it("spectateur : simplement les premiers", () => {
    expect(compactRows(players(10), null, 3).map((p) => p.id)).toEqual(["p1", "p2", "p3"]);
  });

  it("le nombre de lignes dépend de la hauteur de l'écran, entre 3 et 12", () => {
    expect(rowsThatFit(400)).toBe(3);
    expect(rowsThatFit(900)).toBeGreaterThan(rowsThatFit(700));
    expect(rowsThatFit(5000)).toBe(12);
  });
});
