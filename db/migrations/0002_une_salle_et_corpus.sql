-- SALLE-06: une personne ne peut être que dans une seule salle à la fois,
-- garanti par la base (index uniques partiels), pas seulement par l'interface.
alter table lobby_players add column active boolean not null default true;

-- Données déjà présentes: les salles fermées ne comptent plus, et si une
-- personne apparaît dans plusieurs salles actives on garde la plus récente.
update lobby_players lp
   set active = false
  from lobbies l
 where l.id = lp.lobby_id and l.status = 'closed';

update lobby_players lp
   set active = false
 where lp.active
   and lp.user_id is not null
   and exists (
     select 1 from lobby_players o
      where o.user_id = lp.user_id and o.active and o.id <> lp.id
        and (o.joined_at > lp.joined_at or (o.joined_at = lp.joined_at and o.id > lp.id))
   );

update lobby_players lp
   set active = false
 where lp.active
   and lp.guest_id is not null
   and exists (
     select 1 from lobby_players o
      where o.guest_id = lp.guest_id and o.active and o.id <> lp.id
        and (o.joined_at > lp.joined_at or (o.joined_at = lp.joined_at and o.id > lp.id))
   );

create unique index lobby_players_one_room_user on lobby_players (user_id)
  where active and user_id is not null;
create unique index lobby_players_one_room_guest on lobby_players (guest_id)
  where active and guest_id is not null;

-- Quand une salle se ferme, ses joueurs sont libérés automatiquement.
create function release_players_on_lobby_close() returns trigger as $$
begin
  update lobby_players set active = false where lobby_id = new.id and active;
  return new;
end;
$$ language plpgsql;

create trigger lobbies_release_players
  after update of status on lobbies
  for each row
  when (new.status = 'closed' and old.status <> 'closed')
  execute function release_players_on_lobby_close();

-- CONF-03 / TECH-04: corpus de textes cohérents et dictionnaire de mots,
-- stockés en base et remplis par le script de seed (db/seed.ts).
create table corpus_texts (
  id serial primary key,
  language text not null check (language in ('fr', 'en')),
  title text not null,
  source text not null default 'domaine public',
  content text not null,
  word_count int not null check (word_count > 0),
  difficulty text not null default 'easy' check (difficulty in ('easy', 'medium', 'hard')),
  has_accents boolean not null default false,
  has_digits boolean not null default false,
  has_punctuation boolean not null default false,
  unique (language, content)
);

create table corpus_words (
  id serial primary key,
  language text not null check (language in ('fr', 'en')),
  word text not null,
  frequency_rank int not null default 1000,
  has_accents boolean not null default false,
  unique (language, word)
);

create index corpus_texts_lang_idx on corpus_texts (language, difficulty);
create index corpus_words_lang_idx on corpus_words (language, frequency_rank);
