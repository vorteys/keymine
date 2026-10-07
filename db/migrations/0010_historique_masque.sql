-- Supprimer une course de « son » historique : la ligne du joueur est masquée, mais la course, les
-- résultats des autres joueurs et les statistiques cumulées du compte ne changent pas.
alter table race_participants
  add column hidden_from_history boolean not null default false;
