import type { Difficulty } from "@/db/types";

// CONF-05 — critères de complexité MESURABLES et documentés (voir
// docs/ARCHITECTURE.md, section « Complexité du texte »).
//
// Mot isolé (texte aléatoire) :
//   facile    : 2 à 5 lettres, sans accent ;
//   moyen     : 4 à 8 lettres, accents permis ;
//   difficile : 7 lettres ou plus, ou mot accentué de 6 lettres ou plus.
// Les tranches se recoupent volontairement (4–5 et 7–8 lettres) pour garder
// assez de mots dans chaque réserve.
//
// Passage (texte cohérent) : longueur moyenne des mots et part de caractères
// « spéciaux » (tout ce qui n'est ni une lettre non accentuée ni une espace) :
//   facile    : longueur moyenne ≤ 4,8 et spéciaux ≤ 3 % ;
//   difficile : longueur moyenne ≥ 5,6 ou spéciaux ≥ 8 % ;
//   moyen     : le reste.

const PLAIN_LETTER = /[a-z]/i;
const ACCENT = /[àâäçéèêëîïôöùûüÿœæ]/i;

export function hasAccent(text: string): boolean {
  return ACCENT.test(text);
}

export function wordLength(word: string): number {
  return [...word].filter((c) => /\p{L}/u.test(c)).length;
}

export function wordMatchesComplexity(word: string, complexity: Difficulty): boolean {
  const len = wordLength(word);
  const accented = hasAccent(word);
  switch (complexity) {
    case "easy":
      return len >= 2 && len <= 5 && !accented;
    case "medium":
      return len >= 4 && len <= 8;
    case "hard":
      return len >= 7 || (accented && len >= 6);
  }
}

export type TextMeasures = { averageWordLength: number; specialRatio: number; wordCount: number };

export function measureText(content: string): TextMeasures {
  const words = content.split(/\s+/).filter(Boolean);
  const letters = words.reduce((sum, w) => sum + wordLength(w), 0);
  const chars = [...content].filter((c) => !/\s/.test(c));
  const specials = chars.filter((c) => !(PLAIN_LETTER.test(c) && c.charCodeAt(0) < 128)).length;
  return {
    averageWordLength: words.length ? letters / words.length : 0,
    specialRatio: chars.length ? specials / chars.length : 0,
    wordCount: words.length,
  };
}

export function classifyText(content: string): Difficulty {
  const { averageWordLength, specialRatio } = measureText(content);
  if (averageWordLength >= 5.6 || specialRatio >= 0.08) return "hard";
  if (averageWordLength <= 4.8 && specialRatio <= 0.03) return "easy";
  return "medium";
}
