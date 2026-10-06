-- Configuration du texte conforme au cahier des charges (CONF-03 à CONF-09) :
-- type cohérent/aléatoire, complexité, options (ponctuation, nombres,
-- majuscules, accents), caractères à inclure/exclure, bonus de remontée.
alter table lobbies
  add column text_type text not null default 'coherent' check (text_type in ('coherent', 'aleatoire')),
  add column complexity text not null default 'easy' check (complexity in ('easy', 'medium', 'hard')),
  add column allow_accents boolean not null default true,
  add column include_chars text[] not null default '{}',
  add column exclude_chars text[] not null default '{}',
  add column comeback_bonus boolean not null default true;

-- Reprise des anciennes colonnes : « texte » devient cohérent, les autres modes aléatoires.
update lobbies set text_type = case when text_mode = 'texte' then 'coherent' else 'aleatoire' end;
update lobbies set include_chars = target_chars where cardinality(target_chars) > 0;

alter table lobbies
  drop column text_mode,
  drop column target_chars,
  drop column accent_chars,
  drop column allow_symbols;

update lobbies set max_players = 30 where max_players > 30;
alter table lobbies drop constraint if exists lobbies_max_players_check;
alter table lobbies add constraint lobbies_max_players_check check (max_players between 2 and 30);
