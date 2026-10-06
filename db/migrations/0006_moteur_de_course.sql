-- Moteur de course (COURSE-01 à 11, BOT-01, BONUS, RES) : statuts, niveaux de
-- bots à cinq niveaux, séries de MPM et bonus enregistrés pour les résultats.
alter table lobby_players drop constraint if exists lobby_players_bot_level_check;
alter table lobby_players add constraint lobby_players_bot_level_check
  check (bot_level in ('noob', 'debutant', 'intermediaire', 'expert', 'impossible'));

alter table race_participants drop constraint if exists race_participants_bot_level_check;
alter table race_participants add constraint race_participants_bot_level_check
  check (bot_level in ('noob', 'debutant', 'intermediaire', 'expert', 'impossible'));

alter table race_participants drop constraint if exists race_participants_status_check;
alter table race_participants add constraint race_participants_status_check
  check (status in ('racing', 'finished', 'timeout', 'abandoned'));

alter table race_participants
  add column raw_wpm real,
  add column text_length int,
  add column finish_ms int,
  add column bonuses jsonb not null default '[]',
  add column wpm_series jsonb not null default '[]';

alter table races
  add column seed int not null default 0,
  add column comeback_bonus boolean not null default false;

-- Le serveur temps réel écoute la création des courses (même si personne n'est encore connecté).
create function notify_race_created() returns trigger as $$
begin
  perform pg_notify('race_created', new.id::text);
  return null;
end;
$$ language plpgsql;

create trigger races_notify
  after insert on races
  for each row execute function notify_race_created();
