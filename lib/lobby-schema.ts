import { z } from "zod";

export const lobbySettingsSchema = z.object({
  name: z.string().trim().min(1).max(60).default("Partie sans nom"),
  access: z.enum(["public", "unlisted", "private"]).default("public"),
  language: z.enum(["fr", "en"]).default("fr"),
  hostRole: z.enum(["participant", "spectator"]).default("participant"),
  maxPlayers: z.number().int().min(2).max(30).default(30),
  durationSeconds: z.number().int().min(15).max(7200).default(300),
  textMode: z.enum(["texte", "desordre", "accents", "cible"]).default("texte"),
  textLength: z.number().int().min(10).max(400).default(40),
  errorMode: z.enum(["accumuler", "bloquer"]).default("accumuler"),
  penaltySeconds: z.number().min(0).max(10).default(1),
  uppercase: z.boolean().default(false),
  punctuation: z.boolean().default(false),
  digits: z.boolean().default(false),
  symbols: z.boolean().default(false),
  targetChars: z.array(z.string().max(2)).max(10).default([]),
  accentChars: z.array(z.string().max(2)).max(10).default([]),
});

export type LobbySettings = z.infer<typeof lobbySettingsSchema>;
