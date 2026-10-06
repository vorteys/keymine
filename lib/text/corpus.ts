import { PASSAGES } from "@/db/seed-data/corpus";
import { WORDS_EN, WORDS_FR } from "@/db/seed-data/words";
import { classifyText } from "./difficulty";
import type { Corpus } from "./generate";

/** Corpus embarqué : mêmes données que le seed, utilisé en repli et pour l'aperçu côté client. */
export const BUNDLED_CORPUS: Corpus = {
  texts: PASSAGES.map((p) => ({
    title: p.title,
    language: p.language,
    difficulty: classifyText(p.content),
    content: p.content,
  })),
  words: { fr: WORDS_FR, en: WORDS_EN },
};
