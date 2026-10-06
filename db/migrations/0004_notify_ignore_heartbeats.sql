-- Les battements de présence (last_seen_at, last_host_seen_at) ne changent
-- rien à ce que voient les joueurs : ils ne doivent pas déclencher de
-- notification, sinon chaque battement ferait rediffuser la salle entière.
create or replace function notify_lobby_changed() returns trigger as $$
declare
  target_lobby uuid;
  target_code text;
begin
  if tg_op = 'UPDATE' then
    if tg_table_name = 'lobbies'
       and (to_jsonb(new) - 'last_host_seen_at') = (to_jsonb(old) - 'last_host_seen_at') then
      return null;
    end if;
    if tg_table_name = 'lobby_players'
       and (to_jsonb(new) - 'last_seen_at') = (to_jsonb(old) - 'last_seen_at') then
      return null;
    end if;
  end if;

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
