// COURSE-01 — machine à états de la course (vue de la salle).
//   EN_ATTENTE → DÉCOMPTE → EN_COURSE → RÉSULTATS → (EN_ATTENTE | FERMÉE)
// Les valeurs stockées dans `lobbies.status` sont `lobby`, `countdown`,
// `racing`, `finished` et `closed`.
import type { LobbyStatus } from "@/db/types";

export type RaceStateName = "EN_ATTENTE" | "DÉCOMPTE" | "EN_COURSE" | "RÉSULTATS" | "FERMÉE";

export const STATE_NAMES: Record<LobbyStatus, RaceStateName> = {
  lobby: "EN_ATTENTE",
  countdown: "DÉCOMPTE",
  racing: "EN_COURSE",
  finished: "RÉSULTATS",
  closed: "FERMÉE",
};

export const TRANSITIONS: Record<LobbyStatus, readonly LobbyStatus[]> = {
  lobby: ["countdown", "closed"],
  countdown: ["racing", "closed"],
  racing: ["finished", "closed"],
  finished: ["lobby", "closed"],
  closed: [],
};

export function canTransition(from: LobbyStatus, to: LobbyStatus): boolean {
  return TRANSITIONS[from].includes(to);
}

export class InvalidTransitionError extends Error {
  constructor(
    readonly from: LobbyStatus,
    readonly to: LobbyStatus,
  ) {
    super(`Transition interdite : ${STATE_NAMES[from]} → ${STATE_NAMES[to]}`);
    this.name = "InvalidTransitionError";
  }
}

export function assertTransition(from: LobbyStatus, to: LobbyStatus): void {
  if (!canTransition(from, to)) throw new InvalidTransitionError(from, to);
}

/** On peut rejoindre en attente et sur l'écran des résultats, jamais pendant une course (SALLE-09). */
export function isJoinable(status: LobbyStatus): boolean {
  return status === "lobby" || status === "finished";
}

/** COURSE-02 : au moins 2 participants (bots inclus), dont au moins 1 humain ; les spectateurs ne comptent pas. */
export function canStartRace(players: { role: "participant" | "spectator"; isBot: boolean }[]): {
  ok: boolean;
  reason?: "not_enough_participants" | "no_human";
} {
  const participants = players.filter((p) => p.role === "participant");
  if (participants.length < 2) return { ok: false, reason: "not_enough_participants" };
  if (!participants.some((p) => !p.isBot)) return { ok: false, reason: "no_human" };
  return { ok: true };
}
