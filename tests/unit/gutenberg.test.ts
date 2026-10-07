import { describe, expect, it } from "vitest";
import { extractPassages, normalizeTypography, stripGutenbergBoilerplate } from "@/lib/text/gutenberg";

const BOOK = `The Project Gutenberg eBook of Un livre de test

*** START OF THE PROJECT GUTENBERG EBOOK UN LIVRE DE TEST ***

CHAPITRE PREMIER

IL ÉTAIT UNE FOIS

Il était une fois un petit village au bord de la mer. Les pêcheurs partaient chaque matin avant l’aube, et revenaient le soir avec leurs filets pleins. Personne ne se plaignait de cette vie simple et rude.

[Illustration : le port]

Le maire — un homme grand et sévère — aimait dire que « le travail honnête vaut mieux que toutes les richesses ». Les enfants l’écoutaient sans trop comprendre. Un jour, une tempête terrible s’abattit sur la côte entière.

Court.

*** END OF THE PROJECT GUTENBERG EBOOK UN LIVRE DE TEST ***
Licence : voir www.gutenberg.org
`;

describe("import du corpus depuis Gutenberg", () => {
  it("retire l'en-tête et le pied de page légaux", () => {
    const body = stripGutenbergBoilerplate(BOOK);
    expect(body).toContain("CHAPITRE PREMIER");
    expect(body).not.toContain("Project Gutenberg");
    expect(body).not.toContain("Licence");
  });

  it("remplace la typographie par des caractères tapables", () => {
    expect(normalizeTypography("L’aube — « belle » _vraiment_…")).toBe('L\'aube, "belle" vraiment...');
    expect(normalizeTypography("Bonjour ! Ça va ?")).toBe("Bonjour ! Ça va ?");
  });

  it("extrait des passages complets, sans titres, notes ni phrases tronquées", () => {
    const passages = extractPassages(BOOK, { minWords: 10, maxWords: 40, maxPerBook: 50 });
    expect(passages.length).toBeGreaterThanOrEqual(2);
    for (const p of passages) {
      expect(p).toMatch(/[.!?]["']?$/);
      expect(p.split(/\s+/).length).toBeGreaterThanOrEqual(10);
      expect(p).not.toMatch(/CHAPITRE|Illustration|\[|\]|’|—|«|»/);
    }
    expect(passages.join(" ")).toContain("petit village au bord de la mer");
    expect(passages.join(" ")).toContain('"le travail honnête vaut mieux que toutes les richesses"');
  });

  it("répartit l'échantillon sur tout le livre quand il y a trop de passages", () => {
    const sentence = (i: number) => `Voici la phrase numéro ${i} qui contient assez de mots pour former un passage complet et lisible.`;
    const paragraphs = Array.from({ length: 100 }, (_, i) => sentence(i)).join("\n\n");
    const passages = extractPassages(paragraphs, { minWords: 10, maxWords: 40, maxPerBook: 10 });
    expect(passages).toHaveLength(10);
    expect(passages[0]).toContain("numéro 0 ");
    expect(passages.at(-1)).toMatch(/numéro 9\d /); // couvre la fin du livre
  });
});
