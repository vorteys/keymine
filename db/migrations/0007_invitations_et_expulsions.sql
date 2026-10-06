-- SALLE-04 : liens d'invitation à usage unique liés à une adresse IP.
-- SALLE-07 : expulsions (la personne ne peut plus rejoindre la salle).
-- SALLE-10 : tentatives échouées par adresse IP (protection contre la force brute).

create table lobby_invites (
  id uuid primary key default gen_random_uuid(),
  lobby_id uuid not null references lobbies(id) on delete cascade,
  -- Jeton aléatoire de 256 bits (base64url) : non devinable, affiché à l'hôte pour copie.
  token text not null unique,
  label text,
  created_at timestamptz not null default now(),
  -- Renseignés à la première utilisation du lien (association à la personne et à son IP).
  claimed_at timestamptz,
  claimed_ip text,
  claimed_user_id uuid references users(id) on delete set null,
  claimed_guest_id text,
  claimed_name text,
  revoked_at timestamptz
);
create index lobby_invites_lobby on lobby_invites (lobby_id);

create table lobby_bans (
  id uuid primary key default gen_random_uuid(),
  lobby_id uuid not null references lobbies(id) on delete cascade,
  user_id uuid references users(id) on delete cascade,
  guest_id text,
  created_at timestamptz not null default now(),
  check (user_id is not null or guest_id is not null)
);
create unique index lobby_bans_user_unique on lobby_bans (lobby_id, user_id) where user_id is not null;
create unique index lobby_bans_guest_unique on lobby_bans (lobby_id, guest_id) where guest_id is not null;

create table join_attempts (
  id bigserial primary key,
  ip text not null,
  attempted_at timestamptz not null default now()
);
create index join_attempts_ip_time on join_attempts (ip, attempted_at);

-- L'hôte voit les liens apparaître / être utilisés en direct.
create trigger lobby_invites_notify
  after insert or update on lobby_invites
  for each row execute function notify_lobby_changed();
