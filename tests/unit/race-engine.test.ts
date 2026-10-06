import { describe, expect, it } from "vitest";
import { RaceEngine, type EngineConfig, type RacerInit } from "@/lib/race/engine";
import { accuracy, netWpm, rawWpm } from "@/lib/race/metrics";

const START = 1_000_000;
const TEXT = Array.from({ length: 60 }, (_, i) => `mot${i % 10}`).join(" ");

function engine(inits: RacerInit[], overrides: Partial<EngineConfig> = {}) {
  const config: EngineConfig = {
    seed: 11,
    startsAtMs: START,
    durationMs: 120_000,
    errorMode: "accumuler",
    comebackBonus: false,
    language: "fr",
    wordPool: ["alpha", "beta", "gamma"],
    ...overrides,
  };
  return new RaceEngine(config, inits);
}

const human = (id: string, text = TEXT): RacerInit => ({ id, name: id, text });

describe("calcul du MPM et de la précision", () => {
  it("MPM net = caractères corrects / 5 / minutes", () => {
    expect(netWpm(300, 0, "accumuler", 60_000)).toBe(60);
    expect(netWpm(300, 30, "accumuler", 60_000)).toBe(54); // erreurs laissées dans le texte
    expect(netWpm(300, 30, "bloquer", 60_000)).toBe(60); // les erreurs ont été corrigées
    expect(netWpm(100, 0, "accumuler", 0)).toBe(0);
  });

  it("MPM brut compte toutes les frappes", () => {
    expect(rawWpm(300, 30, "bloquer", 60_000)).toBe(66);
    expect(rawWpm(300, 30, "accumuler", 60_000)).toBe(60);
  });

  it("précision", () => {
    expect(accuracy(100, 10, "accumuler")).toBe(90);
    expect(accuracy(100, 25, "bloquer")).toBe(80);
    expect(accuracy(0, 0, "accumuler")).toBe(100);
  });
});

describe("serveur autoritaire : rejet des progressions impossibles (COURSE-06)", () => {
  it("accepte une progression plausible", () => {
    const e = engine([human("a"), human("b")]);
    expect(e.applyProgress("a", { progressChars: 40, errorCount: 1 }, START + 3_000)).toEqual({ ok: true });
  });

  it("refuse avant le départ", () => {
    const e = engine([human("a"), human("b")]);
    expect(e.applyProgress("a", { progressChars: 1, errorCount: 0 }, START - 1)).toEqual({ ok: false, reason: "not_started" });
  });

  it("refuse un saut de progression", () => {
    const e = engine([human("a"), human("b")]);
    const r = e.applyProgress("a", { progressChars: 250, errorCount: 0 }, START + 2_000);
    expect(r).toEqual({ ok: false, reason: "impossible_jump" });
    expect(e.racers.get("a")!.progress).toBe(0);
  });

  it("refuse une vitesse irréaliste soutenue", () => {
    const e = engine([human("a"), human("b")]);
    let now = START;
    let progress = 0;
    let rejected = false;
    for (let i = 0; i < 20; i++) {
      now += 1_000;
      progress += 40; // 40 car./s = 480 MPM
      const r = e.applyProgress("a", { progressChars: progress, errorCount: 0 }, now);
      if (!r.ok) {
        rejected = true;
        break;
      }
    }
    expect(rejected).toBe(true);
  });

  it("refuse un retour en arrière et un dépassement du texte", () => {
    const e = engine([human("a"), human("b")]);
    e.applyProgress("a", { progressChars: 30, errorCount: 0 }, START + 5_000);
    expect(e.applyProgress("a", { progressChars: 10, errorCount: 0 }, START + 6_000)).toEqual({ ok: false, reason: "backwards" });
    expect(e.applyProgress("a", { progressChars: TEXT.length + 5, errorCount: 0 }, START + 60_000)).toEqual({ ok: false, reason: "too_long" });
  });

  it("ne lit jamais un MPM fourni par le client", () => {
    const e = engine([human("a"), human("b")]);
    e.applyProgress("a", { progressChars: 50, errorCount: 0, ...({ wpm: 999 } as object) }, START + 6_000);
    const view = e.snapshot(START + 6_000).find((v) => v.id === "a")!;
    expect(view.wpm).toBe(100); // 50 car. / 5 / 0,1 min
  });

  it("refuse les actions sur un joueur inconnu ou un bot", () => {
    const e = engine([human("a"), { id: "bot", name: "Bot", text: TEXT, isBot: true, botLevel: "expert" }]);
    expect(e.applyProgress("zzz", { progressChars: 1, errorCount: 0 }, START + 1_000)).toMatchObject({ ok: false });
    expect(e.applyProgress("bot", { progressChars: 1, errorCount: 0 }, START + 1_000)).toMatchObject({ ok: false });
  });
});

describe("fin de course et classement (COURSE-09, COURSE-10)", () => {
  function race() {
    const e = engine([human("a"), human("b"), human("c"), human("d")], { durationMs: 60_000 });
    // a arrive en premier, b ensuite
    for (let s = 1; s <= 15; s++) {
      e.applyProgress("a", { progressChars: Math.min(TEXT.length, s * 20), errorCount: 0 }, START + s * 1_000);
    }
    for (let s = 1; s <= 17; s++) {
      e.applyProgress("b", { progressChars: Math.min(TEXT.length, s * 18), errorCount: 0 }, START + s * 1_000);
    }
    return e;
  }

  it("classe : arrivés par temps, puis temps écoulé par progression, puis abandons par progression", () => {
    const e = race();
    e.applyProgress("c", { progressChars: 100, errorCount: 0 }, START + 10_000);
    e.applyProgress("d", { progressChars: 200, errorCount: 0 }, START + 12_000);
    e.abandon("d", START + 15_000); // d a plus de progression que c mais a abandonné
    e.tick(START + 60_000); // temps écoulé
    const results = e.results(START + 60_000);
    expect(results.map((r) => [r.id, r.status])).toEqual([
      ["a", "finished"],
      ["b", "finished"],
      ["c", "timeout"],
      ["d", "abandoned"],
    ]);
    expect(results.map((r) => r.rank)).toEqual([1, 2, 3, 4]);
  });

  it("se termine quand tous ont terminé ou abandonné", () => {
    const e = engine([human("a"), human("b")]);
    e.applyProgress("a", { progressChars: 20, errorCount: 0 }, START + 1_000);
    e.abandon("b", START + 2_000);
    for (let s = 2; s <= 5; s++) e.applyProgress("a", { progressChars: Math.min(TEXT.length, s * 20), errorCount: 0 }, START + s * 1_000);
    e.applyProgress("a", { progressChars: TEXT.length, errorCount: 0 }, START + 18_000);
    e.tick(START + 18_000);
    expect(e.isFinalized).toBe(true);
  });

  it("se termine à la fin du temps maximal", () => {
    const e = engine([human("a"), human("b")], { durationMs: 10_000 });
    e.tick(START + 9_999);
    expect(e.isFinalized).toBe(false);
    e.tick(START + 10_000);
    expect(e.isFinalized).toBe(true);
    expect(e.results(START + 10_000).every((r) => r.status === "timeout")).toBe(true);
  });

  it("l'abandon est confirmé côté serveur et figé", () => {
    const e = engine([human("a"), human("b")]);
    e.applyProgress("a", { progressChars: 40, errorCount: 0 }, START + 5_000);
    expect(e.abandon("a", START + 6_000)).toEqual([{ type: "abandoned", racerId: "a", reason: "player" }]);
    expect(e.applyProgress("a", { progressChars: 60, errorCount: 0 }, START + 8_000)).toEqual({ ok: false, reason: "not_racing" });
    expect(e.abandon("a", START + 9_000)).toEqual([]);
  });
});

describe("déconnexion (COURSE-08)", () => {
  it("reprend là où on en était s'il revient dans les 30 secondes", () => {
    const e = engine([human("a"), human("b")]);
    e.applyProgress("a", { progressChars: 40, errorCount: 0 }, START + 5_000);
    e.setConnected("a", false, START + 6_000);
    e.tick(START + 35_000); // 29 s plus tard
    expect(e.racers.get("a")!.status).toBe("racing");
    e.setConnected("a", true, START + 35_500);
    e.tick(START + 70_000);
    expect(e.racers.get("a")!.status).toBe("racing");
    expect(e.racers.get("a")!.progress).toBe(40);
  });

  it("est considéré comme ayant abandonné après 30 secondes", () => {
    const e = engine([human("a"), human("b")]);
    e.applyProgress("a", { progressChars: 40, errorCount: 0 }, START + 5_000);
    e.setConnected("a", false, START + 6_000);
    const events = e.tick(START + 36_000);
    expect(e.racers.get("a")!.status).toBe("abandoned");
    expect(events).toContainEqual({ type: "abandoned", racerId: "a", reason: "disconnected" });
    expect(e.racers.get("a")!.endedAtMs).toBe(START + 36_000);
  });
});

describe("bots dans le moteur (BOT-04, BOT-05)", () => {
  it("un bot avance selon sa chronologie et finit à l'instant exact calculé", () => {
    const inits: RacerInit[] = [
      human("a"),
      { id: "bot1", name: "Bot expert", text: TEXT, isBot: true, botLevel: "expert" },
    ];
    const run = (step: number) => {
      const e = engine(inits, { durationMs: 600_000 });
      for (let t = step; t <= 300_000; t += step) e.tick(START + t);
      return e.racers.get("bot1")!;
    };
    const coarse = run(2_000);
    const fine = run(250);
    expect(coarse.status).toBe("finished");
    expect(coarse.endedAtMs).toBe(fine.endedAtMs); // indépendant de la cadence du tick
  });

  it("la course complète est reproductible avec la même graine", () => {
    const make = () => {
      const e = engine(
        [
          { id: "b1", name: "B1", text: TEXT, isBot: true, botLevel: "intermediaire" },
          { id: "b2", name: "B2", text: TEXT, isBot: true, botLevel: "debutant" },
          human("a"),
        ],
        { durationMs: 30_000 },
      );
      for (let t = 500; t <= 30_000; t += 500) e.tick(START + t);
      return e.results(START + 30_000).map((r) => [r.id, r.progress, r.rank]);
    };
    expect(make()).toEqual(make());
  });

  it("les bots sont identifiés dans la vue", () => {
    const e = engine([human("a"), { id: "bot1", name: "Bot", text: TEXT, isBot: true, botLevel: "noob" }]);
    expect(e.snapshot(START).find((v) => v.id === "bot1")).toMatchObject({ isBot: true, botLevel: "noob" });
  });
});

describe("bonus de remontée dans le moteur (BONUS-01 à BONUS-04)", () => {
  /** Fait avancer des joueurs humains à des fractions données en respectant la vitesse maximale. */
  function advance(e: RaceEngine, targets: Record<string, number>, from = 1, to = 40) {
    for (let s = from; s <= to; s++) {
      for (const [id, fraction] of Object.entries(targets)) {
        const racer = e.racers.get(id)!;
        const goal = Math.floor(racer.text.length * fraction);
        const progress = Math.min(goal, racer.progress + 20);
        e.applyProgress(id, { progressChars: progress, errorCount: 0 }, START + s * 1_000);
      }
      e.tick(START + s * 1_000);
    }
  }

  it("ne donne aucun bonus quand ils sont désactivés", () => {
    const e = engine([human("a"), human("b")], { comebackBonus: false });
    advance(e, { a: 0.8, b: 0.1 });
    expect(e.racers.get("b")!.bonuses).toHaveLength(0);
  });

  it("donne un bonus au retardataire quand le meneur passe 25 %, 50 % puis 75 %", () => {
    const e = engine([human("a"), human("b")], { comebackBonus: true });
    advance(e, { a: 0.9, b: 0.05 });
    const bonuses = e.racers.get("b")!.bonuses;
    expect(bonuses.map((b) => b.checkpoint)).toEqual([0.25, 0.5, 0.75]);
    expect(e.racers.get("a")!.bonuses).toHaveLength(0); // le meneur n'en reçoit jamais
  });

  it("n'en donne jamais plus de 3 par course et un seul par point de contrôle", () => {
    const e = engine([human("a"), human("b"), human("c")], { comebackBonus: true });
    advance(e, { a: 0.95, b: 0.05, c: 0.06 });
    for (const id of ["b", "c"]) expect(e.racers.get(id)!.bonuses.length).toBeLessThanOrEqual(3);
    expect(new Set(e.racers.get("b")!.bonuses.map((b) => b.checkpoint)).size).toBe(e.racers.get("b")!.bonuses.length);
  });

  it("n'aide pas un joueur proche du meneur qui n'est pas dernier", () => {
    const e = engine([human("a"), human("b"), human("c")], { comebackBonus: true });
    advance(e, { a: 0.3, b: 0.28, c: 0.05 });
    expect(e.racers.get("b")!.bonuses).toHaveLength(0);
    expect(e.racers.get("c")!.bonuses.length).toBeGreaterThan(0);
  });

  it("applique l'effet du bonus : texte raccourci pour le retardataire, allongé pour le meneur", () => {
    // Plusieurs graines pour couvrir les trois types de bonus
    const seen = new Set<string>();
    for (let seed = 1; seed <= 12; seed++) {
      const e = engine([human("a"), human("b")], { comebackBonus: true, seed });
      const events = [];
      for (let s = 1; s <= 40; s++) {
        for (const [id, f] of Object.entries({ a: 0.9, b: 0.05 })) {
          const r = e.racers.get(id)!;
          e.applyProgress(id, { progressChars: Math.min(Math.floor(r.text.length * f), r.progress + 20), errorCount: 0 }, START + s * 1_000);
        }
        events.push(...e.tick(START + s * 1_000));
      }
      for (const b of e.racers.get("b")!.bonuses) {
        seen.add(b.kind);
        if (b.kind === "minus_words") expect(b.targetId).toBe("b");
        else expect(b.targetId).toBe("a");
      }
      if (e.racers.get("b")!.bonuses.some((b) => b.kind === "minus_words")) {
        expect(e.racers.get("b")!.text.length).toBeLessThan(TEXT.length);
      }
      if (e.racers.get("b")!.bonuses.some((b) => b.kind === "plus_words")) {
        expect(e.racers.get("a")!.text.length).toBeGreaterThan(TEXT.length);
      }
      expect(events.filter((ev) => ev.type === "bonus").length).toBe(e.racers.get("b")!.bonuses.length);
    }
    expect(seen.size).toBe(3); // les trois types existent
  });

  it("garde une progression cohérente quand le texte change (BONUS-04)", () => {
    const e = engine([human("a"), human("b")], { comebackBonus: true, seed: 3 });
    for (let s = 1; s <= 40; s++) {
      for (const [id, f] of Object.entries({ a: 0.9, b: 0.1 })) {
        const r = e.racers.get(id)!;
        e.applyProgress(id, { progressChars: Math.min(Math.floor(r.text.length * f), r.progress + 20), errorCount: 0 }, START + s * 1_000);
      }
      e.tick(START + s * 1_000);
    }
    for (const view of e.snapshot(START + 40_000)) {
      expect(view.fraction).toBeGreaterThanOrEqual(0);
      expect(view.fraction).toBeLessThanOrEqual(1);
      expect(view.progress).toBeLessThanOrEqual(view.textLength);
    }
  });

  it("applique les bonus aux bots comme aux humains (BOT-04)", () => {
    const e = engine(
      [
        { id: "fast", name: "Rapide", text: TEXT, isBot: true, botLevel: "impossible" },
        { id: "slow", name: "Lent", text: TEXT, isBot: true, botLevel: "noob" },
        human("a"),
      ],
      { comebackBonus: true, durationMs: 300_000 },
    );
    for (let t = 500; t <= 120_000; t += 500) e.tick(START + t);
    expect(e.racers.get("slow")!.bonuses.length + e.racers.get("a")!.bonuses.length).toBeGreaterThan(0);
  });
});
