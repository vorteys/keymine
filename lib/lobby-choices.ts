import { ACCENT_TYPES, type AccentType } from "@/lib/text/accents";
import { BONUS_KINDS, type BonusKind } from "@/lib/race/bonus";

// Les colonnes `text[]` de la base sont de simples chaînes : on les ramène aux types connus
// (une valeur inconnue, par exemple d'une version future, est ignorée plutôt que de planter).

export function toBonusKinds(values: readonly string[]): BonusKind[] {
  return BONUS_KINDS.filter((kind) => values.includes(kind));
}

export function toAccentTypes(values: readonly string[]): AccentType[] {
  return ACCENT_TYPES.filter((type) => values.includes(type));
}
