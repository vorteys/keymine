// Extraction de passages à taper depuis un livre du Project Gutenberg (domaine public).
// Fonctions pures, sans réseau : le téléchargement est dans `scripts/import-corpus.ts`.

export type ExtractOptions = {
  minWords: number;
  maxWords: number;
  /** Nombre maximal de passages gardés par livre (échantillon réparti sur tout le livre). */
  maxPerBook: number;
};

export const DEFAULT_EXTRACT: ExtractOptions = { minWords: 14, maxWords: 55, maxPerBook: 120 };

/** Retire l'en-tête et le pied de page légaux ajoutés par Gutenberg autour du texte du livre. */
export function stripGutenbergBoilerplate(raw: string): string {
  const text = raw.replace(/\r\n?/g, "\n");
  const start = /\*\*\* ?START OF (?:THE|THIS) PROJECT GUTENBERG EBOOK[^\n]*\*\*\*\n/i.exec(text);
  const end = /\*\*\* ?END OF (?:THE|THIS) PROJECT GUTENBERG EBOOK/i.exec(text);
  const from = start ? start.index + start[0].length : 0;
  const to = end ? end.index : text.length;
  return text.slice(from, to);
}

/** Caractères que l'on peut raisonnablement taper sur un clavier : lettres (accents compris), chiffres, ponctuation simple. */
const TYPABLE = /^[\p{L}\p{N} .,;:!?'"()\-]+$/u;

/** Remplace la typographie « riche » par des caractères tapables (apostrophes, guillemets, tirets). */
export function normalizeTypography(input: string): string {
  return input
    .replace(/[‘’ʼ]/g, "'")
    .replace(/«\s*/g, '"') // « citation » : l'espace intérieure disparaît avec les guillemets
    .replace(/\s*»/g, '"')
    .replace(/[“”]/g, '"')
    .replace(/…/g, "...")
    .replace(/_/g, "") // italiques _mot_ de Gutenberg
    .replace(/[   ]/g, " ")
    .replace(/\s*[—–]\s*/g, ", ")
    .replace(/\s+([;:!?])/g, " $1") // garde l'espace française avant ; : ! ?
    .replace(/\s+/g, " ")
    .replace(/^[,\s]+/, "")
    .trim();
}

function paragraphs(book: string): string[] {
  return book
    .split(/\n\s*\n/)
    .map((p) => p.replace(/\s*\n\s*/g, " ").trim())
    .filter(Boolean);
}

function looksLikeProse(paragraph: string): boolean {
  if (paragraph.length < 60) return false;
  if (/[\[\]*{}<>|]/.test(paragraph)) return false; // notes, illustrations, tableaux
  if (/https?:|www\.|@/.test(paragraph)) return false;
  const letters = paragraph.replace(/[^\p{L}]/gu, "");
  if (letters.length < paragraph.length * 0.7) return false;
  const upper = letters.replace(/[^\p{Lu}]/gu, "");
  return upper.length < letters.length * 0.3; // titres en capitales
}

function sentences(paragraph: string): string[] {
  return paragraph.split(/(?<=[.!?]["']?)\s+(?=["'(]?[\p{Lu}])/u).map((s) => s.trim()).filter(Boolean);
}

/** Découpe un livre en passages de `minWords` à `maxWords` mots, terminés par une fin de phrase. */
export function extractPassages(raw: string, options: ExtractOptions = DEFAULT_EXTRACT): string[] {
  const found: string[] = [];
  for (const paragraph of paragraphs(stripGutenbergBoilerplate(raw))) {
    if (!looksLikeProse(paragraph)) continue;
    let current: string[] = [];
    let words = 0;
    const flush = () => {
      if (words >= options.minWords) found.push(normalizeTypography(current.join(" ")));
      current = [];
      words = 0;
    };
    for (const sentence of sentences(paragraph)) {
      const n = sentence.split(/\s+/).length;
      if (n > options.maxWords) {
        flush();
        continue;
      }
      if (words + n > options.maxWords) flush();
      current.push(sentence);
      words += n;
      if (words >= options.minWords && /[.!?]["']?$/.test(sentence)) flush();
    }
    flush();
  }
  const clean = [...new Set(found)].filter(
    (p) => TYPABLE.test(p) && p.split(/\s+/).length >= options.minWords && /[.!?]["']?$/.test(p),
  );
  if (clean.length <= options.maxPerBook) return clean;
  // Échantillon régulier : on couvre tout le livre plutôt que ses premiers chapitres.
  const step = clean.length / options.maxPerBook;
  return Array.from({ length: options.maxPerBook }, (_, i) => clean[Math.floor(i * step)]!);
}
