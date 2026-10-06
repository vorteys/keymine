import { describe, expect, it } from "vitest";
import { BUNDLED_CORPUS } from "@/lib/text/corpus";
import { classifyText, measureText, wordMatchesComplexity } from "@/lib/text/difficulty";
import {
  applyOptionsToPassage,
  generateRaceText,
  NoTextAvailableError,
  type GenerateOptions,
} from "@/lib/text/generate";
import { createRng } from "@/lib/text/rng";

const base: GenerateOptions = {
  type: "aleatoire",
  language: "fr",
  length: 30,
  complexity: "medium",
  uppercase: false,
  punctuation: false,
  digits: false,
  accents: true,
  includeChars: [],
  excludeChars: [],
};

const gen = (o: Partial<GenerateOptions>, seed = 1) =>
  generateRaceText({ ...base, ...o }, BUNDLED_CORPUS, createRng(seed));

describe("génération du texte (CONF-02 à CONF-07)", () => {
  it("est reproductible avec la même graine", () => {
    expect(gen({}, 7)).toBe(gen({}, 7));
    expect(gen({}, 7)).not.toBe(gen({}, 8));
  });

  it("respecte la longueur en mots (CONF-04) dans les deux types", () => {
    expect(gen({ type: "aleatoire", length: 25 }).split(" ")).toHaveLength(25);
    expect(gen({ type: "coherent", length: 25 }).split(" ")).toHaveLength(25);
    expect(gen({ type: "coherent", length: 150 }).split(" ")).toHaveLength(150);
  });

  it("n'utilise que les passages de la langue choisie, indépendante de l'interface (CONF-02)", () => {
    const en = gen({ type: "coherent", language: "en", length: 12, accents: true });
    expect(en).not.toMatch(/[éèêàç]/);
    const frTitles = BUNDLED_CORPUS.texts.filter((t) => t.language === "fr");
    expect(frTitles.length).toBeGreaterThan(5);
  });

  it("retire accents, ponctuation et majuscules d'un passage quand c'est désactivé (CONF-06)", () => {
    const out = applyOptionsToPassage("Il était, une fois… Œuvre 1625 d'été !", {
      uppercase: false,
      punctuation: false,
      digits: false,
      accents: false,
    });
    expect(out).toBe("il etait une fois oeuvre d'ete");
  });

  it("conserve la ponctuation quand elle est activée en mode cohérent", () => {
    const text = gen({ type: "coherent", language: "fr", punctuation: true, uppercase: true, length: 30 });
    expect(text).toMatch(/[,.!?;:]/);
  });

  it("exclut les caractères demandés du texte aléatoire (CONF-07)", () => {
    for (const seed of [1, 2, 3]) {
      const text = gen({ excludeChars: ["e", "a"], complexity: "easy", length: 60, digits: true, punctuation: true }, seed);
      expect(text.toLowerCase()).not.toMatch(/[ea]/);
    }
  });

  it("inclut les caractères demandés dans le texte aléatoire (CONF-07)", () => {
    const text = gen({ includeChars: ["z"], length: 40 });
    expect((text.match(/z/gi) ?? []).length).toBeGreaterThan(3);
  });

  it("l'exclusion l'emporte sur l'inclusion d'un même caractère", () => {
    const text = gen({ includeChars: ["q"], excludeChars: ["q"], length: 40 });
    expect(text.toLowerCase()).not.toContain("q");
  });

  it("ne génère aucun mot accentué si les accents sont désactivés", () => {
    expect(gen({ accents: false, complexity: "hard", length: 80 })).not.toMatch(/[éèêàçùîôâ]/);
  });

  it("choisit des mots de la complexité demandée (CONF-05)", () => {
    for (const level of ["easy", "medium", "hard"] as const) {
      const words = gen({ complexity: level, length: 60, accents: true }).split(" ");
      const ok = words.filter((w) => wordMatchesComplexity(w, level)).length;
      expect(ok / words.length).toBeGreaterThan(0.9);
    }
  });

  it("lève une erreur explicite quand rien ne correspond", () => {
    expect(() =>
      generateRaceText(
        { ...base, excludeChars: "abcdefghijklmnopqrstuvwxyzéèêàç".split("").slice(0, 10) },
        { texts: [], words: { fr: ["abcde"], en: [] } },
      ),
    ).toThrow(NoTextAvailableError);
  });
});

describe("critères de complexité mesurables (CONF-05)", () => {
  it("classe les mots par longueur et accents", () => {
    expect(wordMatchesComplexity("chat", "easy")).toBe(true);
    expect(wordMatchesComplexity("éléphant", "easy")).toBe(false);
    expect(wordMatchesComplexity("maison", "medium")).toBe(true);
    expect(wordMatchesComplexity("extraordinaire", "hard")).toBe(true);
    expect(wordMatchesComplexity("chat", "hard")).toBe(false);
  });

  it("mesure et classe les passages", () => {
    const m = measureText("le chat dort sur le lit");
    expect(m.wordCount).toBe(6);
    expect(m.averageWordLength).toBeCloseTo(3, 1);
    expect(classifyText("le chat dort sur le lit")).toBe("easy");
    expect(classifyText("l'extraordinaire développement caractéristique particulièrement")).toBe("hard");
  });

  it("le corpus embarqué couvre au moins deux niveaux par langue", () => {
    for (const language of ["fr", "en"] as const) {
      const levels = new Set(BUNDLED_CORPUS.texts.filter((t) => t.language === language).map((t) => t.difficulty));
      expect(levels.size).toBeGreaterThanOrEqual(2);
    }
  });
});
