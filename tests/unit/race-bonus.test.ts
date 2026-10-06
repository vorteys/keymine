import { describe, expect, it } from "vitest";
import {
  appendWords,
  findLaggards,
  findLeader,
  removeUpcomingWords,
  wordsAfterCurrent,
} from "@/lib/race/bonus";

describe("bonus de remontée — règle des retardataires (BONUS-01)", () => {
  const racers = [
    { id: "a", fraction: 0.5 },
    { id: "b", fraction: 0.45 },
    { id: "c", fraction: 0.2 },
    { id: "d", fraction: 0.1 },
  ];

  it("le meneur est celui qui a la plus grande progression", () => {
    expect(findLeader(racers)?.id).toBe("a");
    expect(findLeader([])).toBeNull();
  });

  it("est en retard : le dernier, ou à plus de 25 points du meneur", () => {
    const leader = findLeader(racers)!;
    const laggards = findLaggards(racers, leader).map((r) => r.id);
    expect(laggards).toEqual(["c", "d"]); // c : 30 points, d : dernier et 40 points
    expect(laggards).not.toContain("b"); // 5 points seulement et pas dernier
    expect(laggards).not.toContain("a"); // le meneur n'est jamais en retard
  });

  it("le dernier est toujours en retard, même proche du meneur", () => {
    const close = [
      { id: "a", fraction: 0.5 },
      { id: "b", fraction: 0.45 },
    ];
    expect(findLaggards(close, findLeader(close)!).map((r) => r.id)).toEqual(["b"]);
  });

  it("exactement 25 points n'est pas « plus de 25 % »", () => {
    const edge = [
      { id: "a", fraction: 0.6 },
      { id: "b", fraction: 0.35 },
      { id: "c", fraction: 0.1 },
    ];
    const ids = findLaggards(edge, findLeader(edge)!).map((r) => r.id);
    expect(ids).toEqual(["c"]);
  });

  it("personne n'est en retard quand on est seul", () => {
    expect(findLaggards([{ id: "a", fraction: 0.3 }], { id: "a", fraction: 0.3 })).toEqual([]);
  });
});

describe("modification du texte par un bonus (BONUS-02, BONUS-04)", () => {
  const text = "un deux trois quatre cinq six sept huit";

  it("-3 mots retire les 3 mots qui suivent le mot courant", () => {
    // le joueur est au milieu de « deux » : trois, quatre, cinq disparaissent
    expect(removeUpcomingWords(text, 5)).toBe("un deux six sept huit");
  });

  it("garde toujours le texte déjà tapé et au moins un mot à taper", () => {
    const out = removeUpcomingWords(text, 5);
    expect(out.startsWith("un deux ")).toBe(true);
    expect(removeUpcomingWords("un deux trois", 0)).toBe("un deux trois"); // pas assez de mots
  });

  it("+3 mots ajoute des mots à la fin", () => {
    expect(appendWords("un deux", ["a", "b", "c"])).toBe("un deux a b c");
    expect(appendWords("un deux", [])).toBe("un deux");
  });

  it("compte les mots restants après le mot courant", () => {
    expect(wordsAfterCurrent(text, 0)).toBe(7);
    expect(wordsAfterCurrent(text, text.length - 1)).toBe(0);
  });
});
