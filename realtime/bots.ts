import type { BotLevel } from "@/db/types";

// BOT-2/BOT-3 + H2: quatre niveaux, une vitesse cible et un taux d'erreur,
// avec une variation pour paraître humain.
export const BOT_PROFILES: Record<BotLevel, { wpm: number; errorRate: number }> = {
  debutant: { wpm: 25, errorRate: 0.08 },
  intermediaire: { wpm: 45, errorRate: 0.05 },
  expert: { wpm: 80, errorRate: 0.02 },
  impossible: { wpm: 150, errorRate: 0.0 },
};

const VARIATION = 0.1; // ±10 % (H2)

/** Caractères tapés depuis le départ, pour un bot d'un niveau donné. */
export function botCharsAt(level: BotLevel, elapsedMs: number, seed: number): number {
  const profile = BOT_PROFILES[level];
  // Un peu de bruit stable par bot (basé sur `seed`) plutôt qu'un rythme
  // parfaitement constant: ça "paraît humain" (BOT-3).
  const noise = 1 + (Math.sin(seed * 12.9898) * 0.5 + 0.5 - 0.5) * 2 * VARIATION;
  const wpm = profile.wpm * noise;
  const charsPerMs = (wpm * 5) / 60_000;
  return Math.floor(charsPerMs * elapsedMs);
}

export function botShouldError(level: BotLevel): boolean {
  return Math.random() < BOT_PROFILES[level].errorRate;
}
