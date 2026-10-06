import type { Difficulty, TextType } from "@/db/types";
import type { LobbyView } from "@/lib/lobby-snapshot";

// État du formulaire de réglages (création d'une salle et modification en
// salle d'attente, CONF-12) et conversion vers/depuis l'API.
export type Access = "public" | "unlisted" | "private";
export type ErrorMode = "accumuler" | "bloquer";
export type TextOption = "Majuscules" | "Ponctuation" | "Nombres" | "Accents";

export type SettingsState = {
  access: Access;
  language: "fr" | "en";
  duration: number;
  lobbySize: number;
  errorMode: ErrorMode;
  penalty: boolean;
  textType: TextType;
  length: number;
  complexity: Difficulty;
  includeChars: string[];
  excludeChars: string[];
  options: TextOption[];
  comebackBonus: boolean;
};

export const DEFAULT_SETTINGS: SettingsState = {
  access: "public",
  language: "fr",
  duration: 300,
  lobbySize: 30,
  errorMode: "accumuler",
  penalty: true,
  textType: "coherent",
  length: 40,
  complexity: "easy",
  includeChars: [],
  excludeChars: [],
  options: ["Accents"],
  comebackBonus: true,
};

/** Corps envoyé à POST /api/lobbies et PATCH /api/lobbies/[code]. */
export function settingsToPayload(s: SettingsState) {
  const random = s.textType === "aleatoire"; // inclure/exclure : réservé au texte aléatoire (CONF-07)
  return {
    access: s.access,
    language: s.language,
    durationSeconds: s.duration,
    maxPlayers: s.lobbySize,
    textType: s.textType,
    textLength: s.length,
    complexity: s.complexity,
    comebackBonus: s.comebackBonus,
    errorMode: s.errorMode,
    penaltySeconds: s.penalty ? 1 : 0,
    uppercase: s.options.includes("Majuscules"),
    punctuation: s.options.includes("Ponctuation"),
    digits: s.options.includes("Nombres"),
    accents: s.options.includes("Accents"),
    includeChars: random ? s.includeChars : [],
    excludeChars: random ? s.excludeChars : [],
  };
}

export function settingsFromLobby(l: LobbyView["lobby"]): SettingsState {
  const options: TextOption[] = [];
  if (l.uppercase) options.push("Majuscules");
  if (l.punctuation) options.push("Ponctuation");
  if (l.digits) options.push("Nombres");
  if (l.accents) options.push("Accents");
  return {
    access: l.access as Access,
    language: l.language as "fr" | "en",
    duration: l.durationSeconds,
    lobbySize: l.maxPlayers,
    errorMode: l.errorMode as ErrorMode,
    penalty: l.penaltySeconds > 0,
    textType: l.textType as TextType,
    length: l.textLength,
    complexity: l.complexity as Difficulty,
    includeChars: l.includeChars,
    excludeChars: l.excludeChars,
    options,
    comebackBonus: l.comebackBonus,
  };
}

export function toggled<T>(list: readonly T[], value: T): T[] {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}
