-- Formulaire de création : choix des types de bonus (CONF-09) et accents par type
-- (CONF-06). Les lettres et symboles « souvent » / « jamais » réutilisent
-- include_chars / exclude_chars (CONF-07), désormais jusqu'à 80 caractères.
alter table lobbies
  add column bonus_kinds text[] not null default '{minus_words,plus_words,fog}',
  add column accent_wanted text[] not null default '{}',
  add column accent_forbidden text[] not null default '{}';

-- La course garde une copie des types de bonus : la salle peut être modifiée ensuite.
alter table races
  add column bonus_kinds text[] not null default '{minus_words,plus_words,fog}';
