import { describe, expect, it } from "vitest";
import {
  assertTransition,
  canStartRace,
  canTransition,
  InvalidTransitionError,
  isJoinable,
  STATE_NAMES,
} from "@/lib/race/state";

describe("machine à états de la course (COURSE-01)", () => {
  it("suit EN_ATTENTE → DÉCOMPTE → EN_COURSE → RÉSULTATS → (EN_ATTENTE | FERMÉE)", () => {
    expect(canTransition("lobby", "countdown")).toBe(true);
    expect(canTransition("countdown", "racing")).toBe(true);
    expect(canTransition("racing", "finished")).toBe(true);
    expect(canTransition("finished", "lobby")).toBe(true);
    expect(canTransition("finished", "closed")).toBe(true);
  });

  it("interdit les sauts et les retours en arrière", () => {
    expect(canTransition("lobby", "racing")).toBe(false);
    expect(canTransition("lobby", "finished")).toBe(false);
    expect(canTransition("racing", "lobby")).toBe(false);
    expect(canTransition("countdown", "lobby")).toBe(false);
    expect(() => assertTransition("racing", "lobby")).toThrow(InvalidTransitionError);
  });

  it("une salle fermée est définitive", () => {
    for (const to of ["lobby", "countdown", "racing", "finished"] as const) {
      expect(canTransition("closed", to)).toBe(false);
    }
  });

  it("nomme les états comme le cahier des charges", () => {
    expect(Object.values(STATE_NAMES)).toEqual(["EN_ATTENTE", "DÉCOMPTE", "EN_COURSE", "RÉSULTATS", "FERMÉE"]);
  });

  it("on ne rejoint qu'en attente ou sur les résultats (SALLE-09)", () => {
    expect(isJoinable("lobby")).toBe(true);
    expect(isJoinable("finished")).toBe(true);
    expect(isJoinable("countdown")).toBe(false);
    expect(isJoinable("racing")).toBe(false);
    expect(isJoinable("closed")).toBe(false);
  });
});

describe("conditions de démarrage (COURSE-02)", () => {
  const human = { role: "participant", isBot: false } as const;
  const bot = { role: "participant", isBot: true } as const;
  const spectator = { role: "spectator", isBot: false } as const;

  it("accepte 1 humain + 1 bot", () => expect(canStartRace([human, bot]).ok).toBe(true));
  it("refuse moins de 2 participants", () => {
    expect(canStartRace([human])).toEqual({ ok: false, reason: "not_enough_participants" });
  });
  it("les spectateurs ne comptent pas", () => {
    expect(canStartRace([human, spectator]).ok).toBe(false);
  });
  it("refuse une salle sans humain", () => {
    expect(canStartRace([bot, bot])).toEqual({ ok: false, reason: "no_human" });
  });
});
