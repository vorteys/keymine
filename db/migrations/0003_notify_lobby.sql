-- Temps réel de la salle (SALLE-01, SALLE-02, JOIN-01) : toute modification
-- d'une salle ou de ses joueurs émet une notification Postgres que le serveur
-- temps réel écoute (LISTEN lobby_changed) pour pousser l'état aux clients.
create function notify_lobby_changed() returns trigger as $$
declare
  target_lobby uuid;
  target_code text;
begin
  if tg_table_name = 'lobbies' then
    target_code := coalesce(new.code, old.code);
  else
    target_lobby := coalesce(new.lobby_id, old.lobby_id);
    select code into target_code from lobbies where id = target_lobby;
  end if;
  if target_code is not null then
    perform pg_notify('lobby_changed', target_code);
  end if;
  return null;
end;
$$ language plpgsql;

create trigger lobbies_notify
  after insert or update on lobbies
  for each row execute function notify_lobby_changed();

create trigger lobby_players_notify
  after insert or update or delete on lobby_players
  for each row execute function notify_lobby_changed();
