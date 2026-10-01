import { describe, expect, it } from "vitest";
import { generateRaceText } from "@/lib/text/generate";

describe("generateRaceText", () => {
  it("génère un texte du nombre de mots demandé en mode texte", () => {
    const text = generateRaceText({
      mode: "texte",
      language: "fr",
      length: 15,
      uppercase: false,
      punctuation: false,
      digits: false,
      symbols: false,
      targetChars: [],
      accentChars: [],
    });
    expect(text.split(" ")).toHaveLength(15);
  });

  it("inclut au moins un mot accentué en mode accents (TXT-4)", () => {
    const text = generateRaceText({
      mode: "accents",
      language: "fr",
      length: 20,
      uppercase: false,
      punctuation: false,
      digits: false,
      symbols: false,
      targetChars: [],
      accentChars: ["é"],
    });
    expect(/[éèêàçùîôâœ]/i.test(text)).toBe(true);
  });

  it("remplit le texte avec le caractère ciblé en mode cible (TXT-5)", () => {
    const text = generateRaceText({
      mode: "cible",
      language: "fr",
      length: 25,
      uppercase: false,
      punctuation: false,
      digits: false,
      symbols: false,
      targetChars: ["z"],
      accentChars: [],
    });
    const occurrences = (text.match(/z/gi) ?? []).length;
    expect(occurrences).toBeGreaterThan(3);
  });
});
