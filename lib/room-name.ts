import { z } from "zod";

// Nom d'une salle : visible de tous (liste des lobbys, salle d'attente). Contrôlé côté serveur
// à chaque création et à chaque modification (TECH-07, SEC-01) :
//   - normalisé (NFKC, caractères invisibles et de contrôle retirés, espaces regroupés) ;
//   - 3 à 40 caractères, lettres/chiffres/espaces et quelques signes courants seulement
//     (pas de < > " ` \ { } [ ] | ~ ^ % $ = * : aucun HTML ni code ne passe) ;
//   - pas de lien ni d'adresse (publicité, hameçonnage) ;
//   - pas de mot injurieux, en français ou en anglais, même déguisé (« m3rde », « f.u.c.k »).
// L'affichage passe toujours par l'échappement de React : ces règles s'ajoutent à cette protection.

export const ROOM_NAME_MIN = 3;
export const ROOM_NAME_MAX = 40;

export type RoomNameProblem =
  "name_short" | "name_long" | "name_chars" | "name_link" | "name_blocked";

const ALLOWED = /^[\p{L}\p{N} '’\-_.,!?:;&+#@()/]+$/u;
const LINK = /(https?:|www\.|\w\.(com|net|org|ca|fr|io|gg|ly|me|xyz|tv|co)\b)|\d{7,}/i;

// Mots refusés (formes de base). Comparés après mise en minuscules, retrait des accents et
// remplacement des chiffres/symboles « de substitution ».
const BLOCKED = [
  // français
  "merde",
  "putain",
  "pute",
  "salope",
  "connard",
  "connasse",
  "enculer",
  "encule",
  "nique",
  "niquer",
  "fdp",
  "ntm",
  "batard",
  "couille",
  "couilles",
  "bite",
  "chier",
  "pd",
  "tapette",
  "negre",
  "bougnoule",
  "youpin",
  "salaud",
  // anglais
  "fuck",
  "fucker",
  "shit",
  "bitch",
  "cunt",
  "dick",
  "cock",
  "asshole",
  "pussy",
  "whore",
  "slut",
  "nigger",
  "nigga",
  "faggot",
  "fag",
  "retard",
  "rape",
  "rapist",
  "nazi",
  "hitler",
  "kys",
  "porn",
  "sex",
];

const LEET: Record<string, string> = {
  "0": "o",
  "1": "i",
  "3": "e",
  "4": "a",
  "5": "s",
  "7": "t",
  "8": "b",
  "@": "a",
  $: "s",
  "!": "i",
};

/** Normalise un nom saisi : forme composée, sans caractères invisibles, espaces regroupés. */
export function normalizeRoomName(raw: string): string {
  return raw
    .normalize("NFKC")
    .replace(/[\p{Cc}\p{Cf}\p{Cs}\p{Co}\p{Cn}]/gu, "")
    .replace(/\s+/gu, " ")
    .trim();
}

/** Forme « pliée » pour la détection : minuscules, sans accents, chiffres/symboles remplacés. */
function fold(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[0134578@$!]/g, (c) => LEET[c] ?? c);
}

const BLOCKED_SET = new Set(BLOCKED);
/**
 * Mots cherchés aussi « collés » (« f u c k », « m.e.r.d.e »). Seulement ceux qui ne sont jamais
 * une partie d'un mot courant : « salope » est dans « salopette », « retard » dans « retardataire ».
 */
const SQUASHED = [
  "fuck",
  "bitch",
  "nigger",
  "nigga",
  "faggot",
  "asshole",
  "whore",
  "hitler",
  "merde",
  "putain",
  "connard",
  "connasse",
  "enculer",
];

export function containsBlockedWord(text: string): boolean {
  const folded = fold(text);
  const tokens = folded.split(/[^a-z]+/).filter(Boolean);
  if (tokens.some((token) => BLOCKED_SET.has(token))) return true;
  const squashed = folded.replace(/[^a-z]/g, "");
  return SQUASHED.some((word) => squashed.includes(word));
}

/** Premier problème d'un nom déjà normalisé, ou `null` s'il est accepté. */
export function checkRoomName(name: string): RoomNameProblem | null {
  const length = [...name].length;
  if (length < ROOM_NAME_MIN) return "name_short";
  if (length > ROOM_NAME_MAX) return "name_long";
  if (!ALLOWED.test(name)) return "name_chars";
  if (!/[\p{L}\p{N}].*[\p{L}\p{N}]/u.test(name)) return "name_short"; // « --- » n'est pas un nom
  if (LINK.test(name)) return "name_link";
  if (containsBlockedWord(name)) return "name_blocked";
  return null;
}

/** Schéma Zod : le message d'erreur est le code (traduit côté API par `zodMessage`). */
export const roomNameSchema = z
  .string()
  .transform(normalizeRoomName)
  .superRefine((name, ctx) => {
    const problem = checkRoomName(name);
    if (problem) ctx.addIssue({ code: "custom", message: problem });
  });

/** Nom proposé quand rien n'est saisi : « Salle de {pseudo} », ramené à une longueur valide. */
export function defaultRoomName(displayName: string, prefix = "Salle de"): string {
  const base = `${prefix} ${normalizeRoomName(displayName)}`.slice(0, ROOM_NAME_MAX).trim();
  return checkRoomName(base) === null ? base : prefix;
}
