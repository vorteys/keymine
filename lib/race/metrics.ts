import type { ErrorMode } from "@/db/types";

// Calcul du MPM et de la précision, communs au serveur et aux tests.
// Un « mot » = 5 caractères (convention usuelle).

export const MAX_WPM = 250; // vitesse humaine plausible maximale (COURSE-06)
export const MAX_CHARS_PER_SECOND = (MAX_WPM * 5) / 60;
/** Marge de rafale : un collage de clavier ou un retard réseau ne doit pas faire rejeter un joueur honnête. */
export const BURST_ALLOWANCE_CHARS = 15;

/**
 * MPM net : seuls les caractères réellement corrects comptent. En mode
 * « libre » (accumuler), une erreur laissée dans le texte occupe une position
 * mais n'est pas correcte ; en mode « correction obligatoire » (bloquer),
 * `progress` ne contient que des caractères corrects.
 */
export function netWpm(progress: number, errors: number, errorMode: ErrorMode, elapsedMs: number): number {
  if (elapsedMs <= 0) return 0;
  const correct = errorMode === "accumuler" ? Math.max(0, progress - errors) : progress;
  return correct / 5 / (elapsedMs / 60_000);
}

/** MPM brut : toutes les frappes comptent, justes ou non. */
export function rawWpm(progress: number, errors: number, errorMode: ErrorMode, elapsedMs: number): number {
  if (elapsedMs <= 0) return 0;
  const typed = errorMode === "accumuler" ? progress : progress + errors;
  return typed / 5 / (elapsedMs / 60_000);
}

/** Précision en pourcentage : frappes justes / frappes totales. */
export function accuracy(progress: number, errors: number, errorMode: ErrorMode): number {
  const correct = errorMode === "accumuler" ? Math.max(0, progress - errors) : progress;
  const typed = errorMode === "accumuler" ? progress : progress + errors;
  if (typed <= 0) return 100;
  return Math.min(100, Math.max(0, (100 * correct) / typed));
}
