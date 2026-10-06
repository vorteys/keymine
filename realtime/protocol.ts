import { z } from "zod";

// Protocole WebSocket de KeyMine. Tout message reçu d'un client est validé
// par ces schémas Zod avant d'être utilisé (TECH-07) ; un message invalide
// est ignoré et compté pour la limitation de débit (PERF-02).

const counter = z.number().int().min(0).max(1_000_000);
const keyCounts = z.record(z.string().min(1).max(4), counter);

/** Messages envoyés par un client connecté à une course. */
export const raceClientMessage = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("progress"),
    progressChars: counter,
    errorCount: counter,
    keyCorrect: keyCounts.default({}),
    keyErrors: keyCounts.default({}),
  }),
  z.object({ type: z.literal("abandon") }),
]);
export type RaceClientMessage = z.infer<typeof raceClientMessage>;

/** Messages envoyés par un client connecté à une salle d'attente. */
export const lobbyClientMessage = z.discriminatedUnion("type", [
  z.object({ type: z.literal("ping") }),
]);
export type LobbyClientMessage = z.infer<typeof lobbyClientMessage>;

/** Paramètres de connexion (chaîne de requête de l'URL WebSocket). */
export const lobbyConnectionQuery = z.object({
  code: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z0-9]{6}$/),
});

export const raceConnectionQuery = z.object({
  race: z.string().uuid(),
  participant: z.string().uuid().optional(),
});

/** Analyse un message brut : renvoie `null` si ce n'est pas du JSON valide du bon schéma. */
export function parseMessage<T>(schema: z.ZodType<T>, raw: unknown): T | null {
  if (typeof raw !== "string" && !Buffer.isBuffer(raw)) return null;
  const text = String(raw);
  if (text.length > 16_384) return null;
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    return null;
  }
  const parsed = schema.safeParse(json);
  return parsed.success ? parsed.data : null;
}

/** Limiteur à fenêtre glissante simple : `allow()` renvoie false au-delà de `max` appels par `windowMs`. */
export function createRateLimiter(max: number, windowMs: number, now: () => number = Date.now) {
  let stamps: number[] = [];
  return {
    allow(): boolean {
      const t = now();
      stamps = stamps.filter((s) => t - s < windowMs);
      if (stamps.length >= max) return false;
      stamps.push(t);
      return true;
    },
  };
}
