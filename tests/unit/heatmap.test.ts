import { describe, expect, it } from "vitest";
import { heatmapRowsFromCounts } from "@/lib/heatmap";

describe("heatmapRowsFromCounts", () => {
  it("calcule un pourcentage de réussite par touche", () => {
    const rows = heatmapRowsFromCounts({ z: 2 }, { z: 2 });
    const zKey = rows.flatMap((r) => r.keys).find(([letter]) => letter === "Z");
    expect(zKey?.[1]).toBe(50);
  });

  it("affiche 100% pour une touche jamais tapée (pas de fausse alerte)", () => {
    const rows = heatmapRowsFromCounts({}, {});
    const qKey = rows.flatMap((r) => r.keys).find(([letter]) => letter === "Q");
    expect(qKey?.[1]).toBe(100);
  });

  it("couvre les trois rangées du clavier QWERTY", () => {
    const rows = heatmapRowsFromCounts({}, {});
    expect(rows).toHaveLength(3);
    expect(rows.flatMap((r) => r.keys)).toHaveLength(26);
  });

  it("décale les rangées d'un nombre de touches (0, 0,5, 1) comme un vrai clavier", () => {
    expect(heatmapRowsFromCounts({}, {}).map((r) => r.indent)).toEqual(["0", "0.5", "1"]);
  });
});
