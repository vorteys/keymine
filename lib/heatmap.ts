// Construit les rangées du clavier pour PixelKeyboard à partir de compteurs
// corrects/erreurs par caractère (STAT-3/STAT-5). UI-6: la couleur n'est
// jamais la seule information — le pourcentage exact est toujours affiché
// à côté, donc lisible aussi pour les daltoniens.
const LAYOUT: { indent: string; letters: string[] }[] = [
  { indent: "0%", letters: ["q", "w", "e", "r", "t", "y", "u", "i", "o", "p"] },
  { indent: "4.5%", letters: ["a", "s", "d", "f", "g", "h", "j", "k", "l"] },
  { indent: "9.5%", letters: ["z", "x", "c", "v", "b", "n", "m"] },
];

export function heatmapRowsFromCounts(
  correct: Record<string, number>,
  errors: Record<string, number>,
): { indent: string; keys: [string, number][] }[] {
  return LAYOUT.map((row) => ({
    indent: row.indent,
    keys: row.letters.map((letter): [string, number] => {
      const ok = correct[letter] ?? 0;
      const bad = errors[letter] ?? 0;
      const total = ok + bad;
      const pct = total === 0 ? 100 : Math.round((100 * ok) / total);
      return [letter.toUpperCase(), pct];
    }),
  }));
}
