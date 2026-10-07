-- La pénalité d'erreurs (+ n s par erreur non corrigée) s'ajoute au temps d'arrivée.
-- `finish_ms` contient le temps classé (réel + pénalité) ; `penalty_ms` en isole la part pénalité.
alter table race_participants
  add column penalty_ms int not null default 0;
