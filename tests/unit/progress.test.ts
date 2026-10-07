import { describe, expect, it } from "vitest";
import { layoutProgress, niceCeiling } from "@/lib/progress";

const day = (n: number) => new Date(2026, 9, n);

describe("progression du MPM (AUTH-06)", () => {
  it("l'axe vertical monte au prochain multiple de 20", () => {
    expect(niceCeiling(0)).toBe(20);
    expect(niceCeiling(55)).toBe(60);
    expect(niceCeiling(60)).toBe(60);
    expect(niceCeiling(61)).toBe(80);
  });

  it("place les points de gauche à droite, le meilleur MPM le plus haut", () => {
    const layout = layoutProgress([
      { wpm: 30, at: day(1) },
      { wpm: 60, at: day(2) },
      { wpm: 45, at: day(3) },
    ]);
    const [a, b, c] = layout.points;
    expect(a!.x).toBeLessThan(b!.x);
    expect(b!.x).toBeLessThan(c!.x);
    expect(b!.y).toBeLessThan(c!.y);
    expect(c!.y).toBeLessThan(a!.y); // plus petit y = plus haut
    expect(a!.x).toBe(layout.left);
    expect(c!.x).toBe(layout.right);
    expect(layout.yTicks.map((t) => t.value)).toEqual([0, 15, 30, 45, 60]);
    expect(layout.average?.value).toBe(45);
  });

  it("un seul point est centré, sans courbe", () => {
    const layout = layoutProgress([{ wpm: 40, at: day(1) }]);
    expect(layout.points).toHaveLength(1);
    expect(layout.points[0]!.x).toBeGreaterThan(layout.left);
    expect(layout.points[0]!.x).toBeLessThan(layout.right);
  });

  it("aucune course : pas de points ni de moyenne", () => {
    const layout = layoutProgress([]);
    expect(layout.points).toEqual([]);
    expect(layout.average).toBeNull();
  });
});
