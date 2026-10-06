import { db } from "@/lib/db";
import type { ParticipantStatus } from "@/db/types";

// HIST-01 : historique paginé des courses terminées d'un compte.
// Les courses non terminées (en cours, ou interrompues sans résultat) n'y figurent pas.

export const HISTORY_PAGE_SIZE = 10;

export type HistoryRow = {
  raceId: string;
  lobbyCode: string;
  playedAt: Date;
  rank: number | null;
  participantCount: number;
  wpm: number;
  accuracy: number;
  status: ParticipantStatus;
};

export type HistoryPage = {
  rows: HistoryRow[];
  page: number;
  pages: number;
  total: number;
};

/** Numéro de page demandé (query string) ramené à un entier ≥ 1. */
export function parsePage(value: string | string[] | undefined): number {
  const raw = Array.isArray(value) ? value[0] : value;
  const n = Number.parseInt(raw ?? "1", 10);
  return Number.isFinite(n) && n >= 1 ? Math.min(n, 100_000) : 1;
}

export async function loadHistory(userId: string, requestedPage: number): Promise<HistoryPage> {
  const base = db
    .selectFrom("race_participants")
    .innerJoin("races", "races.id", "race_participants.race_id")
    .where("race_participants.user_id", "=", userId)
    .where("race_participants.role", "=", "participant")
    .where("races.status", "=", "finished");

  const totalRow = await base
    .select((eb) => eb.fn.countAll<string>().as("total"))
    .executeTakeFirstOrThrow();
  const total = Number(totalRow.total);
  const pages = Math.max(1, Math.ceil(total / HISTORY_PAGE_SIZE));
  const page = Math.min(requestedPage, pages);

  const rows = await base
    .innerJoin("lobbies", "lobbies.id", "races.lobby_id")
    .select([
      "races.id as race_id",
      "lobbies.code as lobby_code",
      "races.created_at as played_at",
      "race_participants.rank",
      "race_participants.wpm",
      "race_participants.accuracy",
      "race_participants.status",
      (eb) =>
        eb
          .selectFrom("race_participants as rp")
          .select((e) => e.fn.countAll<string>().as("n"))
          .whereRef("rp.race_id", "=", "races.id")
          .where("rp.role", "=", "participant")
          .as("participant_count"),
    ])
    .orderBy("races.created_at", "desc")
    .limit(HISTORY_PAGE_SIZE)
    .offset((page - 1) * HISTORY_PAGE_SIZE)
    .execute();

  return {
    page,
    pages,
    total,
    rows: rows.map((r) => ({
      raceId: r.race_id,
      lobbyCode: r.lobby_code,
      playedAt: new Date(r.played_at),
      rank: r.rank,
      participantCount: Number(r.participant_count ?? 0),
      wpm: r.wpm ?? 0,
      accuracy: r.accuracy ?? 100,
      status: r.status,
    })),
  };
}
