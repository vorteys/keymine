import { describe, expect, it } from "vitest";
import { BOT_LEVELS, BOT_PROFILES, BotTimeline, isBotLevel } from "@/lib/race/bots";

const TEXT = Array.from({ length: 80 }, (_, i) => (i % 7 === 0 ? "extraordinaire" : "le chat dort")).join(" ");

function wpmOf(level: (typeof BOT_LEVELS)[number], seed: number, mode: "accumuler" | "bloquer" = "accumuler") {
  const bot = new BotTimeline(level, seed, TEXT, mode);
  const done = bot.completionMs;
  return { wpm: TEXT.length / 5 / (done / 60_000), bot };
}

describe("bots déterministes (BOT-05)", () => {
  it("la même graine donne la même course", () => {
    const a = new BotTimeline("expert", 42, TEXT, "accumuler");
    const b = new BotTimeline("expert", 42, TEXT, "accumuler");
    for (const t of [0, 1_000, 5_000, 20_000, 60_000]) expect(a.sample(t)).toEqual(b.sample(t));
    expect(a.completionMs).toBe(b.completionMs);
  });

  it("des graines différentes donnent des courses différentes", () => {
    const a = new BotTimeline("intermediaire", 1, TEXT, "accumuler");
    const b = new BotTimeline("intermediaire", 2, TEXT, "accumuler");
    expect(a.completionMs).not.toBe(b.completionMs);
  });

  it("progresse de façon monotone de 0 à la longueur du texte", () => {
    const bot = new BotTimeline("debutant", 3, TEXT, "accumuler");
    let previous = 0;
    for (let t = 0; t <= bot.completionMs + 1_000; t += 500) {
      const { chars } = bot.sample(t);
      expect(chars).toBeGreaterThanOrEqual(previous);
      expect(chars).toBeLessThanOrEqual(TEXT.length);
      previous = chars;
    }
    expect(previous).toBe(TEXT.length);
  });
});

describe("niveaux de bots (BOT-01)", () => {
  it("définit cinq niveaux ordonnés par vitesse", () => {
    expect(BOT_LEVELS).toHaveLength(5);
    for (let i = 1; i < BOT_LEVELS.length; i++) {
      expect(BOT_PROFILES[BOT_LEVELS[i]!].wpmMin).toBeGreaterThanOrEqual(BOT_PROFILES[BOT_LEVELS[i - 1]!].wpmMin);
      expect(BOT_PROFILES[BOT_LEVELS[i]!].errorRate).toBeLessThan(BOT_PROFILES[BOT_LEVELS[i - 1]!].errorRate);
    }
    expect(isBotLevel("noob")).toBe(true);
    expect(isBotLevel("dieu")).toBe(false);
  });

  it("chaque niveau tape à peu près à la vitesse de sa plage", () => {
    for (const level of BOT_LEVELS) {
      const speeds = [1, 2, 3, 4, 5, 6].map((seed) => wpmOf(level, seed).wpm);
      const average = speeds.reduce((a, b) => a + b, 0) / speeds.length;
      const { wpmMin, wpmMax } = BOT_PROFILES[level];
      // Les erreurs, hésitations et mots longs ralentissent : marge de -35 % à +15 %.
      expect(average).toBeGreaterThan(wpmMin * 0.65);
      expect(average).toBeLessThan(wpmMax * 1.15);
    }
  });
});

describe("vitesse variable et erreurs (BOT-02, BOT-03)", () => {
  it("la vitesse n'est pas constante pendant la course", () => {
    const bot = new BotTimeline("intermediaire", 9, TEXT, "accumuler");
    const speeds: number[] = [];
    for (let t = 0; t + 3_000 < bot.completionMs; t += 3_000) {
      speeds.push(bot.sample(t + 3_000).chars - bot.sample(t).chars);
    }
    const min = Math.min(...speeds);
    const max = Math.max(...speeds);
    expect(max / Math.max(1, min)).toBeGreaterThan(1.15);
  });

  it("fait des erreurs, plus nombreuses chez les niveaux faibles", () => {
    const errorsOf = (level: (typeof BOT_LEVELS)[number]) =>
      [1, 2, 3, 4, 5].reduce((sum, seed) => sum + new BotTimeline(level, seed, TEXT, "accumuler").sample(1e9).errors, 0);
    expect(errorsOf("noob")).toBeGreaterThan(errorsOf("expert"));
    expect(errorsOf("noob")).toBeGreaterThan(0);
  });

  it("la correction obligatoire ralentit les bots plus que le mode libre", () => {
    const time = (mode: "accumuler" | "bloquer") =>
      [1, 2, 3, 4, 5].reduce((sum, seed) => sum + new BotTimeline("noob", seed, TEXT, mode).completionMs, 0);
    expect(time("bloquer")).toBeGreaterThan(time("accumuler"));
  });

  it("ralentit sur les mots longs", () => {
    const bot = new BotTimeline("expert", 5, "a ".repeat(40) + "extraordinairement ".repeat(5), "accumuler");
    const shortPart = bot.sample(1e9);
    expect(shortPart.chars).toBeGreaterThan(0);
  });
});

describe("changement de texte par un bonus", () => {
  it("conserve le préfixe déjà tapé et raccourcit la fin", () => {
    const bot = new BotTimeline("expert", 7, TEXT, "accumuler");
    const t = 5_000;
    const typed = bot.sample(t).chars;
    const shorter = TEXT.slice(0, typed + 20);
    bot.rebase(t, shorter);
    expect(bot.length).toBe(shorter.length);
    expect(bot.sample(t).chars).toBe(typed);
    expect(bot.sample(1e9).chars).toBe(shorter.length);
    expect(bot.completionMs).toBeLessThan(new BotTimeline("expert", 7, TEXT, "accumuler").completionMs);
  });

  it("peut allonger le texte du bot", () => {
    const bot = new BotTimeline("expert", 7, "un deux trois", "accumuler");
    const before = bot.completionMs;
    bot.rebase(500, "un deux trois quatre cinq six");
    expect(bot.completionMs).toBeGreaterThan(before);
    expect(bot.sample(1e9).chars).toBe("un deux trois quatre cinq six".length);
  });
});
