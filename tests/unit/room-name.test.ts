import { describe, expect, it } from "vitest";
import { lobbySettingsSchema, lobbyUpdateSchema } from "@/lib/lobby-schema";
import {
  checkRoomName,
  containsBlockedWord,
  defaultRoomName,
  normalizeRoomName,
  roomNameSchema,
} from "@/lib/room-name";

describe("nom de salle : normalisation", () => {
  it("regroupe les espaces et retire les caractères invisibles et de contrôle", () => {
    expect(normalizeRoomName("  Salle \t  des​  amis \n")).toBe("Salle des amis");
    expect(normalizeRoomName("A\u0000B‮C")).toBe("ABC");
  });

  it("passe en forme composée (NFKC)", () => {
    expect(normalizeRoomName("Café ＫＭ")).toBe("Café KM");
  });
});

describe("nom de salle : règles", () => {
  it("accepte des noms courants, accents et signes compris", () => {
    for (const name of [
      "Salle de Léa",
      "Les bûcherons #2",
      "Dév'Web (matin)",
      "Course 1-vs-1!",
      "Ça gaze",
    ]) {
      expect(checkRoomName(name), name).toBeNull();
    }
  });

  it("refuse trop court, trop long et vide de lettres", () => {
    expect(checkRoomName("ab")).toBe("name_short");
    expect(checkRoomName("---")).toBe("name_short");
    expect(checkRoomName("a".repeat(41))).toBe("name_long");
    expect(checkRoomName("a".repeat(40))).toBeNull();
  });

  it("refuse le HTML, le code et les caractères spéciaux", () => {
    for (const name of [
      "<script>alert(1)</script>",
      "salle `rm -rf`",
      'a"b"c',
      "x{y}z",
      "a|b|c",
      "50% off",
      "a=b",
    ]) {
      expect(checkRoomName(name), name).toBe("name_chars");
    }
  });

  it("refuse les liens, adresses et longs numéros", () => {
    expect(checkRoomName("visite www.truc")).toBe("name_link");
    expect(checkRoomName("gagne.com")).toBe("name_link");
    expect(checkRoomName("https://x")).toBe("name_link");
    expect(checkRoomName("appelle 5145551234")).toBe("name_link");
  });

  it("refuse les mots injurieux, même déguisés, sans bloquer les mots légitimes", () => {
    for (const name of [
      "Quelle merde",
      "m3rde totale",
      "F.U.C.K ça",
      "f u c k",
      "Salle de pute",
      "NIQUE tout",
      "$h1t",
    ]) {
      expect(containsBlockedWord(name) || checkRoomName(name) !== null, name).toBe(true);
    }
    for (const name of [
      "Salle des retardataires",
      "Salopette party",
      "Classe Bordeleau",
      "Essex club",
      "Scunthorpe",
      "Cocktail",
      "Analyse",
    ]) {
      expect(checkRoomName(name), name).toBeNull();
    }
  });
});

describe("nom de salle : schéma et nom par défaut", () => {
  it("le schéma normalise puis valide, avec le code d'erreur comme message", () => {
    expect(roomNameSchema.parse("  Salle   test ")).toBe("Salle test");
    const bad = roomNameSchema.safeParse("<b>");
    expect(bad.success).toBe(false);
    expect(bad.error?.issues[0]?.message).toBe("name_chars");
  });

  it("création et modification passent par le même contrôle ; sans nom, le champ reste absent", () => {
    expect(lobbySettingsSchema.parse({}).name).toBeUndefined();
    expect(lobbySettingsSchema.safeParse({ name: "ok" }).success).toBe(false);
    expect(lobbySettingsSchema.parse({ name: " Mon  salon " }).name).toBe("Mon salon");
    expect(lobbyUpdateSchema.safeParse({ name: "fuck" }).success).toBe(false);
    expect(lobbyUpdateSchema.safeParse({ language: "en" }).success).toBe(true);
  });

  it("propose « Salle de {pseudo} », toujours valide", () => {
    expect(defaultRoomName("Alexy")).toBe("Salle de Alexy");
    expect(checkRoomName(defaultRoomName("x".repeat(60)))).toBeNull();
    expect(defaultRoomName("x".repeat(60)).length).toBeLessThanOrEqual(40);
    expect(checkRoomName(defaultRoomName("<>"))).toBeNull();
  });
});
