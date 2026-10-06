import { z } from "zod";

// CONF-01 à CONF-12 : réglages d'une salle, validés côté serveur (TECH-07).
const char = z.string().min(1).max(2);

const lobbyFields = z.object({
    name: z.string().trim().min(1).max(60).default("Partie sans nom"),
    access: z.enum(["public", "unlisted", "private"]).default("public"),
    hostRole: z.enum(["participant", "spectator"]).default("participant"),
    maxPlayers: z.number().int().min(2).max(30).default(30), // SALLE-05
    // CONF-01 : durée maximale de la course, de 15 secondes à 2 heures.
    durationSeconds: z.number().int().min(15).max(7200).default(300),
    language: z.enum(["fr", "en"]).default("fr"), // CONF-02
    textType: z.enum(["coherent", "aleatoire"]).default("coherent"), // CONF-03
    textLength: z.number().int().min(10).max(400).default(40), // CONF-04 (mots)
    complexity: z.enum(["easy", "medium", "hard"]).default("easy"), // CONF-05
    uppercase: z.boolean().default(false), // CONF-06
    punctuation: z.boolean().default(false),
    digits: z.boolean().default(false),
    accents: z.boolean().default(true),
    includeChars: z.array(char).max(10).default([]), // CONF-07
    excludeChars: z.array(char).max(10).default([]),
    errorMode: z.enum(["accumuler", "bloquer"]).default("accumuler"), // CONF-08
    penaltySeconds: z.number().min(0).max(10).default(1),
    comebackBonus: z.boolean().default(true), // CONF-09
});

const notBoth = {
  check: (s: { includeChars?: string[]; excludeChars?: string[] }) =>
    !(s.includeChars ?? []).some((c) => (s.excludeChars ?? []).includes(c)),
  params: { message: "Un caractère ne peut pas être à la fois inclus et exclu", path: ["includeChars"] },
};

/** Création d'une salle : tous les réglages, avec leurs valeurs par défaut. */
export const lobbySettingsSchema = lobbyFields.refine(notBoth.check, notBoth.params);

/** CONF-12 : modification partielle des réglages en salle d'attente (le rôle de l'hôte ne change pas). */
export const lobbyUpdateSchema = lobbyFields
  .omit({ hostRole: true })
  .partial()
  .refine(notBoth.check, notBoth.params);

export type LobbySettings = z.infer<typeof lobbySettingsSchema>;
export type LobbyUpdate = z.infer<typeof lobbyUpdateSchema>;
