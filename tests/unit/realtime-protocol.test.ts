// @vitest-environment node
import { describe, expect, it } from "vitest";
import {
  createRateLimiter,
  lobbyConnectionQuery,
  parseMessage,
  raceClientMessage,
  raceConnectionQuery,
} from "@/realtime/protocol";

describe("protocole temps réel (TECH-07)", () => {
  it("accepte un message de progression valide et complète les valeurs par défaut", () => {
    const msg = parseMessage(raceClientMessage, JSON.stringify({ type: "progress", progressChars: 12, errorCount: 1 }));
    expect(msg).toEqual({ type: "progress", progressChars: 12, errorCount: 1, keyCorrect: {}, keyErrors: {} });
  });

  it("rejette les types inconnus, valeurs négatives, non entières ou non JSON", () => {
    expect(parseMessage(raceClientMessage, JSON.stringify({ type: "hack" }))).toBeNull();
    expect(parseMessage(raceClientMessage, JSON.stringify({ type: "progress", progressChars: -1, errorCount: 0 }))).toBeNull();
    expect(parseMessage(raceClientMessage, JSON.stringify({ type: "progress", progressChars: 1.5, errorCount: 0 }))).toBeNull();
    expect(parseMessage(raceClientMessage, "pas du json")).toBeNull();
    expect(parseMessage(raceClientMessage, 42)).toBeNull();
  });

  it("rejette les messages trop volumineux", () => {
    const big = JSON.stringify({ type: "abandon", pad: "x".repeat(20_000) });
    expect(parseMessage(raceClientMessage, big)).toBeNull();
  });

  it("valide les paramètres de connexion", () => {
    expect(lobbyConnectionQuery.safeParse({ code: " abc234 " }).data?.code).toBe("ABC234");
    expect(lobbyConnectionQuery.safeParse({ code: "ab" }).success).toBe(false);
    expect(raceConnectionQuery.safeParse({ race: "pas-un-uuid" }).success).toBe(false);
    expect(
      raceConnectionQuery.safeParse({ race: "6f9619ff-8b86-4011-b42d-00c04fc964ff" }).success,
    ).toBe(true);
  });
});

describe("limiteur de débit (PERF-02)", () => {
  it("refuse au-delà du maximum dans la fenêtre puis réaccepte", () => {
    let t = 0;
    const limiter = createRateLimiter(3, 1_000, () => t);
    expect([limiter.allow(), limiter.allow(), limiter.allow(), limiter.allow()]).toEqual([true, true, true, false]);
    t = 1_001;
    expect(limiter.allow()).toBe(true);
  });
});
