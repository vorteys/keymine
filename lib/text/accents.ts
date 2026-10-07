// CONF-06 / CONF-07 : les accents du français, classés par TYPE pour que l'hôte puisse en
// privilégier ou en interdire certains (« jamais de tréma », « beaucoup de cédilles »…).
// Aucune dépendance serveur : partagé par le formulaire, le schéma et le générateur de texte.

export const ACCENT_TYPES = [
  "grave",
  "aigu",
  "circonflexe",
  "trema",
  "cedille",
  "ligature",
] as const;
export type AccentType = (typeof ACCENT_TYPES)[number];

/** Lettres de chaque type (minuscules ; les majuscules sont déduites). */
export const ACCENT_LETTERS: Record<AccentType, string> = {
  grave: "àèù",
  aigu: "é",
  circonflexe: "âêîôû",
  trema: "äëïöüÿ",
  cedille: "ç",
  ligature: "œæ",
};

const TYPE_OF = new Map<string, AccentType>();
for (const type of ACCENT_TYPES) {
  for (const letter of ACCENT_LETTERS[type]) {
    TYPE_OF.set(letter, type);
    TYPE_OF.set(letter.toUpperCase(), type);
  }
}

/** Type d'accent d'un caractère, ou `null` si ce n'est pas une lettre accentuée. */
export function accentTypeOf(char: string): AccentType | null {
  return TYPE_OF.get(char) ?? null;
}

/** Types d'accent présents dans un mot ou un texte. */
export function accentTypesIn(text: string): Set<AccentType> {
  const found = new Set<AccentType>();
  for (const char of text) {
    const type = TYPE_OF.get(char);
    if (type) found.add(type);
  }
  return found;
}

/** Même lettre sans accent (« œ » → « oe », « é » → « e »). */
export function stripAccentChar(char: string): string {
  if (char === "œ") return "oe";
  if (char === "Œ") return "Oe";
  if (char === "æ") return "ae";
  if (char === "Æ") return "Ae";
  return char.normalize("NFD").replace(/\p{M}/gu, "");
}

/** Retire seulement les accents des types demandés ; les autres lettres accentuées restent. */
export function stripAccentTypes(text: string, types: readonly AccentType[]): string {
  if (types.length === 0) return text;
  let out = "";
  for (const char of text) {
    const type = TYPE_OF.get(char);
    out += type && types.includes(type) ? stripAccentChar(char) : char;
  }
  return out;
}
