import type { ErrorMode } from "@/db/types";
import { createRng } from "@/lib/text/rng";

// BOT-01 à BOT-05 — moteur de bots pur et déterministe : (niveau, graine,
// texte, mode d'erreur) → une chronologie de frappe. Même graine, même course.

export const BOT_LEVELS = ["noob", "debutant", "intermediaire", "expert", "impossible"] as const;
export type BotLevelName = (typeof BOT_LEVELS)[number];

export type BotProfile = {
  label: string;
  /** Plage de MPM visée : chaque bot tire sa vitesse de base dans cette plage (selon la graine). */
  wpmMin: number;
  wpmMax: number;
  /** Taux d'erreur par caractère. */
  errorRate: number;
};

// Valeurs retenues (BOT-01), proches des plages indicatives du cahier.
export const BOT_PROFILES: Record<BotLevelName, BotProfile> = {
  noob: { label: "Noob", wpmMin: 10, wpmMax: 20, errorRate: 0.12 },
  debutant: { label: "Débutant", wpmMin: 20, wpmMax: 35, errorRate: 0.08 },
  intermediaire: { label: "Intermédiaire", wpmMin: 35, wpmMax: 60, errorRate: 0.05 },
  expert: { label: "Expert", wpmMin: 70, wpmMax: 100, errorRate: 0.02 },
  impossible: { label: "Impossible", wpmMin: 140, wpmMax: 170, errorRate: 0.005 },
};

export function isBotLevel(value: string): value is BotLevelName {
  return (BOT_LEVELS as readonly string[]).includes(value);
}

const WORD_BOUNDARY = " ";

/** Difficulté d'un mot pour un bot : les mots longs, accentués ou ponctués ralentissent (BOT-02). */
function wordDifficulty(word: string): number {
  let factor = 1;
  if (word.length >= 8) factor *= 1.25;
  if (/[^a-z\s'-]/i.test(word)) factor *= 1.2; // accent, chiffre, ponctuation, majuscule non comptée
  return factor;
}

export type BotSample = { chars: number; errors: number };

export class BotTimeline {
  private readonly rng: () => number;
  private readonly baseWpm: number;
  private text: string;
  /** times[i] = instant (ms depuis le départ) où le caractère i est validé. */
  private times: number[] = [];
  /** errorsAfter[i] = erreurs cumulées une fois le caractère i validé. */
  private errorsAfter: number[] = [];
  private form = 1;
  private formUntil = 0;
  /** Instant (ms) avant lequel la suite du texte ne peut pas être tapée (après un changement de texte). */
  private resumeAt = 0;

  constructor(
    readonly level: BotLevelName,
    seed: number,
    text: string,
    private readonly errorMode: ErrorMode,
  ) {
    this.rng = createRng(seed);
    const profile = BOT_PROFILES[level];
    this.baseWpm = profile.wpmMin + this.rng() * (profile.wpmMax - profile.wpmMin);
    this.text = text;
    this.extendTo(text.length);
  }

  get length(): number {
    return this.text.length;
  }

  /** Instant (ms depuis le départ) où le dernier caractère du texte courant est validé. */
  get completionMs(): number {
    return this.times.length >= this.text.length && this.text.length > 0
      ? this.times[this.text.length - 1]!
      : Number.POSITIVE_INFINITY;
  }

  get targetWpm(): number {
    return this.baseWpm;
  }

  /** Simule la frappe des caractères manquants jusqu'à `length`. */
  private extendTo(length: number): void {
    const profile = BOT_PROFILES[this.level];
    let t = Math.max(this.resumeAt, this.times.length ? this.times[this.times.length - 1]! : 0);
    let errors = this.errorsAfter.length ? this.errorsAfter[this.errorsAfter.length - 1]! : 0;

    // Mot courant pour la difficulté.
    const wordAt = (index: number) => {
      let start = index;
      while (start > 0 && this.text[start - 1] !== WORD_BOUNDARY) start--;
      let end = index;
      while (end < this.text.length && this.text[end] !== WORD_BOUNDARY) end++;
      return this.text.slice(start, end);
    };

    for (let i = this.times.length; i < length; i++) {
      const baseInterval = 60_000 / (this.baseWpm * 5);

      // Accélérations et ralentissements : le rythme change de temps en temps.
      if (t >= this.formUntil) {
        this.form = 0.78 + this.rng() * 0.5; // 0,78 à 1,28
        this.formUntil = t + 1_500 + this.rng() * 2_500;
      }
      const difficulty = wordDifficulty(wordAt(i));
      let interval = (baseInterval / this.form) * difficulty;

      // Hésitation à l'espace entre deux mots.
      if (this.text[i] === WORD_BOUNDARY && this.rng() < 0.07) {
        interval += 250 + this.rng() * 500;
      }

      // Erreur : plus probable sur un mot difficile.
      if (this.rng() < profile.errorRate * (difficulty > 1 ? 1.5 : 1)) {
        errors++;
        if (this.errorMode === "bloquer") {
          // Correction obligatoire : réaction, effacement, nouvelle frappe.
          interval += 180 + this.rng() * 170 + 2 * baseInterval;
        } else {
          // Libre : l'erreur reste dans le texte, petit trébuchement.
          interval += 0.5 * baseInterval;
        }
      }

      t += interval;
      this.times.push(t);
      this.errorsAfter.push(errors);
    }
  }

  /** Caractères validés et erreurs commises après `elapsedMs` de course. */
  sample(elapsedMs: number): BotSample {
    if (elapsedMs <= 0) return { chars: 0, errors: 0 };
    // Recherche dichotomique du dernier caractère validé à cet instant.
    let lo = 0;
    let hi = Math.min(this.times.length, this.text.length);
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (this.times[mid]! <= elapsedMs) lo = mid + 1;
      else hi = mid;
    }
    return { chars: lo, errors: lo > 0 ? this.errorsAfter[lo - 1]! : 0 };
  }

  /**
   * Remplace le texte restant à partir de l'instant `elapsedMs` (bonus qui
   * allonge ou raccourcit le texte). Le préfixe déjà tapé est conservé ; la
   * suite est re-simulée à partir de l'instant courant.
   */
  rebase(elapsedMs: number, newText: string): void {
    const { chars } = this.sample(elapsedMs);
    const keep = Math.min(chars, newText.length);
    this.times.length = keep;
    this.errorsAfter.length = keep;
    this.text = newText;
    this.resumeAt = Math.max(0, elapsedMs);
    this.extendTo(newText.length);
  }
}
