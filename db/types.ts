// Types Kysely décrivant les tables Postgres (voir db/migrations/0001_init.sql).
// Écrits à la main plutôt que générés: pas d'outil de codegen réseau requis.
import type { ColumnType, Generated } from "kysely";

export type Access = "public" | "unlisted" | "private";
export type Language = "fr" | "en";
export type TextMode = "texte" | "desordre" | "accents" | "cible";
export type ErrorMode = "accumuler" | "bloquer";
export type LobbyStatus = "lobby" | "countdown" | "racing" | "finished" | "closed";
export type PlayerRole = "participant" | "spectator";
export type BotLevel = "debutant" | "intermediaire" | "expert" | "impossible";
export type RaceStatus = "countdown" | "racing" | "finished";
export type ParticipantStatus = "racing" | "finished" | "abandoned";
export type AvatarSource = "upload" | "discord" | "github";

export interface UsersTable {
  id: Generated<string>;
  username: string;
  password_hash: string;
  display_name: string;
  avatar_url: string | null;
  avatar_source: Generated<AvatarSource>;
  discord_id: string | null;
  github_id: string | null;
  failed_login_attempts: Generated<number>;
  locked_until: ColumnType<Date, Date | null, Date | null> | null;
  best_wpm: Generated<number>;
  total_races: Generated<number>;
  total_errors: Generated<number>;
  total_chars_typed: Generated<number>;
  current_streak_days: Generated<number>;
  last_race_at: ColumnType<Date, Date | null, Date | null> | null;
  created_at: ColumnType<Date, string | undefined, never>;
}

export interface KeyStatsTable {
  user_id: string;
  char: string;
  correct_count: Generated<number>;
  error_count: Generated<number>;
}

export interface LobbiesTable {
  id: Generated<string>;
  code: string;
  host_user_id: string | null;
  host_guest_id: string | null;
  access: Generated<Access>;
  name: string;
  language: Generated<Language>;
  max_players: Generated<number>;
  duration_seconds: Generated<number>;
  text_mode: Generated<TextMode>;
  text_length: Generated<number>;
  error_mode: Generated<ErrorMode>;
  penalty_seconds: Generated<number>;
  allow_uppercase: Generated<boolean>;
  allow_punctuation: Generated<boolean>;
  allow_digits: Generated<boolean>;
  allow_symbols: Generated<boolean>;
  target_chars: Generated<string[]>;
  accent_chars: Generated<string[]>;
  status: Generated<LobbyStatus>;
  is_quick: Generated<boolean>;
  auto_start_at: ColumnType<Date, Date | string | null, Date | string | null> | null;
  created_at: ColumnType<Date, string | undefined, never>;
  last_host_seen_at: ColumnType<Date, string | undefined, Date | string>;
  closed_at: ColumnType<Date, Date | null, Date | null> | null;
}

export interface LobbyPlayersTable {
  id: Generated<string>;
  lobby_id: string;
  user_id: string | null;
  guest_id: string | null;
  guest_name: string | null;
  role: Generated<PlayerRole>;
  is_bot: Generated<boolean>;
  bot_level: BotLevel | null;
  active: Generated<boolean>;
  joined_at: ColumnType<Date, string | undefined, never>;
  last_seen_at: ColumnType<Date, string | undefined, Date | string>;
}

export type Difficulty = "easy" | "medium" | "hard";

export interface CorpusTextsTable {
  id: Generated<number>;
  language: Language;
  title: string;
  source: Generated<string>;
  content: string;
  word_count: number;
  difficulty: Generated<Difficulty>;
  has_accents: Generated<boolean>;
  has_digits: Generated<boolean>;
  has_punctuation: Generated<boolean>;
}

export interface CorpusWordsTable {
  id: Generated<number>;
  language: Language;
  word: string;
  frequency_rank: Generated<number>;
  has_accents: Generated<boolean>;
}

export interface RacesTable {
  id: Generated<string>;
  lobby_id: string;
  text_content: string;
  language: Language;
  settings: Generated<unknown>;
  status: Generated<RaceStatus>;
  starts_at: ColumnType<Date, string, never>;
  duration_seconds: number;
  ends_at: ColumnType<Date, Date | null, Date | null> | null;
  created_at: ColumnType<Date, string | undefined, never>;
}

export interface RaceParticipantsTable {
  id: Generated<string>;
  race_id: string;
  lobby_player_id: string | null;
  user_id: string | null;
  guest_id: string | null;
  display_name: string;
  is_bot: Generated<boolean>;
  bot_level: BotLevel | null;
  role: Generated<PlayerRole>;
  progress_chars: Generated<number>;
  error_count: Generated<number>;
  status: Generated<ParticipantStatus>;
  wpm: number | null;
  accuracy: number | null;
  finished_at: ColumnType<Date, Date | null, Date | null> | null;
  rank: number | null;
  key_correct: Generated<unknown>;
  key_errors: Generated<unknown>;
  created_at: ColumnType<Date, string | undefined, never>;
}

export interface Database {
  users: UsersTable;
  key_stats: KeyStatsTable;
  lobbies: LobbiesTable;
  lobby_players: LobbyPlayersTable;
  races: RacesTable;
  race_participants: RaceParticipantsTable;
  corpus_texts: CorpusTextsTable;
  corpus_words: CorpusWordsTable;
}
