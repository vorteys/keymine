-- KeyMine — schéma initial PostgreSQL
-- Exécuté par db/migrate.ts, pas par un outil externe (voir TECH-3: "outils au choix de l'équipe").

create extension if not exists pgcrypto;

create table users (
  id uuid primary key default gen_random_uuid(),
  username varchar(20) unique not null,
  password_hash text not null,
  display_name varchar(32) not null,
  avatar_url text,
  avatar_source text not null default 'upload' check (avatar_source in ('upload', 'discord', 'github')),
  discord_id text unique,
  github_id text unique,
  failed_login_attempts int not null default 0,
  locked_until timestamptz,
  best_wpm real not null default 0,
  total_races int not null default 0,
  total_errors int not null default 0,
  total_chars_typed int not null default 0,
  current_streak_days int not null default 0,
  last_race_at timestamptz,
  created_at timestamptz not null default now()
);

create table key_stats (
  user_id uuid not null references users(id) on delete cascade,
  char text not null,
  correct_count int not null default 0,
  error_count int not null default 0,
  primary key (user_id, char)
);

create table lobbies (
  id uuid primary key default gen_random_uuid(),
  code varchar(8) unique not null,
  host_user_id uuid references users(id) on delete set null,
  host_guest_id text,
  access text not null default 'public' check (access in ('public', 'unlisted', 'private')),
  name text not null,
  language text not null default 'fr' check (language in ('fr', 'en')),
  max_players int not null default 30 check (max_players between 2 and 100),
  duration_seconds int not null default 300 check (duration_seconds between 15 and 7200),
  text_mode text not null default 'texte' check (text_mode in ('texte', 'desordre', 'accents', 'cible')),
  text_length int not null default 40 check (text_length between 10 and 400),
  error_mode text not null default 'accumuler' check (error_mode in ('accumuler', 'bloquer')),
  penalty_seconds real not null default 1,
  allow_uppercase boolean not null default false,
  allow_punctuation boolean not null default false,
  allow_digits boolean not null default false,
  allow_symbols boolean not null default false,
  target_chars text[] not null default '{}',
  accent_chars text[] not null default '{}',
  status text not null default 'lobby' check (status in ('lobby', 'countdown', 'racing', 'finished', 'closed')),
  is_quick boolean not null default false,
  auto_start_at timestamptz,
  created_at timestamptz not null default now(),
  last_host_seen_at timestamptz not null default now(),
  closed_at timestamptz,
  check (host_user_id is not null or host_guest_id is not null)
);

create index lobbies_status_access_idx on lobbies (status, access) where status = 'lobby';

create table lobby_players (
  id uuid primary key default gen_random_uuid(),
  lobby_id uuid not null references lobbies(id) on delete cascade,
  user_id uuid references users(id) on delete cascade,
  guest_id text,
  guest_name text,
  role text not null default 'participant' check (role in ('participant', 'spectator')),
  is_bot boolean not null default false,
  bot_level text check (bot_level in ('debutant', 'intermediaire', 'expert', 'impossible')),
  joined_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  check (is_bot or user_id is not null or guest_id is not null)
);

create unique index lobby_players_user_unique on lobby_players (lobby_id, user_id) where user_id is not null;
create unique index lobby_players_guest_unique on lobby_players (lobby_id, guest_id) where guest_id is not null;

create table races (
  id uuid primary key default gen_random_uuid(),
  lobby_id uuid not null references lobbies(id) on delete cascade,
  text_content text not null,
  language text not null,
  settings jsonb not null default '{}',
  status text not null default 'countdown' check (status in ('countdown', 'racing', 'finished')),
  starts_at timestamptz not null,
  duration_seconds int not null,
  ends_at timestamptz,
  created_at timestamptz not null default now()
);

create index races_lobby_idx on races (lobby_id, created_at desc);

create table race_participants (
  id uuid primary key default gen_random_uuid(),
  race_id uuid not null references races(id) on delete cascade,
  lobby_player_id uuid references lobby_players(id) on delete set null,
  user_id uuid references users(id) on delete set null,
  guest_id text,
  display_name text not null,
  is_bot boolean not null default false,
  bot_level text check (bot_level in ('debutant', 'intermediaire', 'expert', 'impossible')),
  role text not null default 'participant' check (role in ('participant', 'spectator')),
  progress_chars int not null default 0,
  error_count int not null default 0,
  status text not null default 'racing' check (status in ('racing', 'finished', 'abandoned')),
  wpm real,
  accuracy real,
  finished_at timestamptz,
  rank int,
  key_correct jsonb not null default '{}',
  key_errors jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create index race_participants_race_idx on race_participants (race_id);
create index race_participants_user_idx on race_participants (user_id);
