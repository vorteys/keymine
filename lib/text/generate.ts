import {
  ACCENT_WORDS_FR,
  SENTENCES_EN,
  SENTENCES_FR,
  WORDS_EN,
  WORDS_FR,
} from "./bank";
import type { Language, TextMode } from "@/db/types";

export type GenerateOptions = {
  mode: TextMode;
  language: Language;
  length: number; // nombre de mots visé (TXT-7)
  uppercase: boolean;
  punctuation: boolean;
  digits: boolean;
  symbols: boolean;
  targetChars: string[]; // mode "cible" (TXT-5)
  accentChars: string[]; // mode "accents" (TXT-4)
};

const SYMBOLS = ["@", "#", "%", "&", "*", "+"];

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]!;
}

function shuffled<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j]!, copy[i]!];
  }
  return copy;
}

function decorate(words: string[], opts: GenerateOptions): string[] {
  let out = [...words];

  if (opts.uppercase) {
    out = out.map((w) => (Math.random() < 0.18 ? w[0]!.toUpperCase() + w.slice(1) : w));
  }

  if (opts.digits) {
    const count = Math.max(1, Math.round(out.length / 12));
    for (let i = 0; i < count; i++) {
      const pos = Math.floor(Math.random() * out.length);
      out.splice(pos, 0, String(Math.floor(Math.random() * 900) + 1));
    }
  }

  if (opts.symbols) {
    const count = Math.max(1, Math.round(out.length / 15));
    for (let i = 0; i < count; i++) {
      const pos = Math.floor(Math.random() * out.length);
      out.splice(pos, 0, pick(SYMBOLS));
    }
  }

  if (opts.punctuation) {
    out = out.map((w, i) => {
      if (i === out.length - 1) return w;
      const r = Math.random();
      if (r < 0.08) return `${w},`;
      if (r < 0.12) return `${w}.`;
      return w;
    });
    out[out.length - 1] = `${out[out.length - 1]}.`;
  }

  return out;
}

function wordsForText(mode: TextMode, language: Language, opts: GenerateOptions): string[] {
  const baseWords = language === "en" ? WORDS_EN : WORDS_FR;

  if (mode === "accents" && language === "fr") {
    const pool =
      opts.accentChars.length > 0
        ? ACCENT_WORDS_FR.filter((w) => opts.accentChars.some((c) => w.includes(c)))
        : ACCENT_WORDS_FR;
    const accentPool = pool.length > 0 ? pool : ACCENT_WORDS_FR;
    const words: string[] = [];
    for (let i = 0; i < opts.length; i++) {
      // TXT-4: "au moins un mot" accentué — on vise ~45% pour que ce soit visible.
      words.push(Math.random() < 0.45 ? pick(accentPool) : pick(baseWords));
    }
    if (!words.some((w) => accentPool.includes(w))) {
      words[0] = pick(accentPool);
    }
    return words;
  }

  if (mode === "cible" && opts.targetChars.length > 0) {
    const targets = opts.targetChars.map((c) => c.toLowerCase());
    const fullPool = language === "en" ? WORDS_EN : [...WORDS_FR, ...ACCENT_WORDS_FR];
    const matches = fullPool.filter((w) => targets.some((c) => w.toLowerCase().includes(c)));
    const words: string[] = [];
    for (let i = 0; i < opts.length; i++) {
      if (matches.length > 0 && Math.random() < 0.7) {
        words.push(pick(matches));
      } else {
        // Pas assez de vrais mots: on fabrique un petit pseudo-mot autour du
        // caractère ciblé pour que le texte "en soit rempli" (TXT-5).
        const c = pick(targets);
        const filler = ["a", "e", "i", "o", "u"][Math.floor(Math.random() * 5)];
        words.push(`${filler}${c}${filler}${c}`);
      }
    }
    return words;
  }

  // Mode "désordre" par défaut: mots sans lien entre eux (TXT-3).
  const words: string[] = [];
  for (let i = 0; i < opts.length; i++) words.push(pick(baseWords));
  return words;
}

/** TXT-1 à TXT-8: génère le texte d'une course selon les réglages de l'hôte. */
export function generateRaceText(options: GenerateOptions): string {
  const length = Math.max(5, Math.min(400, options.length));
  const opts = { ...options, length };

  if (opts.mode === "texte") {
    const sentences = shuffled(opts.language === "en" ? SENTENCES_EN : SENTENCES_FR);
    const words: string[] = [];
    let i = 0;
    while (words.length < length) {
      const sentence = sentences[i % sentences.length]!;
      words.push(...sentence.split(" "));
      i++;
    }
    // TXT-7: un extrait peut être coupé net, pas besoin de finir la phrase.
    return words.slice(0, length).join(" ");
  }

  const words = wordsForText(opts.mode, opts.language, opts);
  return decorate(words, opts).join(" ");
}
