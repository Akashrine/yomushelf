-- ============================================================
-- Christmas list, the family's page (/liste/<token>).
-- * The page tells this browser which items it offers : it sends the hash
--   of its undo secret (httpOnly cookie), get_shared_wishlist answers
--   'mine' per item. Other visitors only see 'reserved'.
-- * "Je l'offre" / "Annuler" are limited per link (40 per 10 minutes),
--   in the database : no IP address is kept.
-- Rollback : supabase/rollbacks/20261022000400_wishlist_shared_page_down.sql
-- ============================================================

alter table public.wishlist_shares
  add column if not exists action_window_start timestamptz,
  add column if not exists action_count integer not null default 0 check (action_count >= 0);

-- A new link starts with a fresh limit.
create or replace function public.reset_wishlist_share_actions()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.token_hash is distinct from old.token_hash then
    new.action_window_start := null;
    new.action_count := 0;
  end if;
  return new;
end;
$$;
revoke execute on function public.reset_wishlist_share_actions() from public, anon, authenticated;
drop trigger if exists wishlist_shares_reset_actions on public.wishlist_shares;
create trigger wishlist_shares_reset_actions
  before update of token_hash on public.wishlist_shares
  for each row execute function public.reset_wishlist_share_actions();

-- One action on a link : false when the link is unknown, stopped,
-- expired, or busy (limit reached). Returns the reader's id otherwise.
create or replace function public.wishlist_share_action(p_token_hash text)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare v_user uuid;
begin
  update public.wishlist_shares
  set action_window_start = case when action_window_start is null or action_window_start < now() - interval '10 minutes' then now() else action_window_start end,
      action_count = case when action_window_start is null or action_window_start < now() - interval '10 minutes' then 1 else action_count + 1 end
  where token_hash = p_token_hash and revoked_at is null and expires_at > now()
    and (action_window_start is null or action_window_start < now() - interval '10 minutes' or action_count < 40)
  returning user_id into v_user;
  return v_user;
end;
$$;

drop function if exists public.get_shared_wishlist(text);
create or replace function public.get_shared_wishlist(p_token_hash text, p_undo_hash text default null)
returns jsonb
language sql
stable
security invoker
set search_path = public
as $$
  select jsonb_build_object(
    'display_name', s.display_name,
    'expires_at', s.expires_at,
    'items', coalesce((
      select jsonb_agg(jsonb_build_object(
          'id', w.id,
          'title', m.title,
          'cover_url', coalesce(v.cover_url, m.cover_url),
          'volume_number', w.volume_number,
          'priority', w.priority,
          -- The price the reader typed, else the French edition's price.
          'price_eur', coalesce(w.target_price, v.price_eur),
          'reserved', r.wishlist_item_id is not null,
          'mine', p_undo_hash is not null and r.undo_hash = p_undo_hash
        ) order by (w.priority = 'high') desc, m.title, w.volume_number nulls last)
      from public.wishlist_items w
      join public.mangas m on m.id = w.manga_id
      left join lateral (
        select vv.price_eur, vv.cover_url from public.volumes vv
        where vv.manga_id = w.manga_id and vv.volume_number = w.volume_number and vv.edition = 'standard'
        limit 1
      ) v on true
      left join public.wishlist_reservations r on r.wishlist_item_id = w.id
      where w.user_id = s.user_id
    ), '[]'::jsonb)
  )
  from public.wishlist_shares s
  where s.token_hash = p_token_hash and s.revoked_at is null and s.expires_at > now();
$$;

-- 'reserved', 'taken', 'not_found' or 'busy'.
create or replace function public.reserve_wishlist_item(p_token_hash text, p_item_id uuid, p_undo_hash text)
returns text
language plpgsql
security invoker
set search_path = public
as $$
declare v_user uuid;
begin
  if not exists (select 1 from public.wishlist_shares where token_hash = p_token_hash and revoked_at is null and expires_at > now()) then
    return 'not_found';
  end if;
  v_user := public.wishlist_share_action(p_token_hash);
  if v_user is null then return 'busy'; end if;
  if not exists (select 1 from public.wishlist_items where id = p_item_id and user_id = v_user) then
    return 'not_found';
  end if;
  insert into public.wishlist_reservations (wishlist_item_id, user_id, undo_hash)
  values (p_item_id, v_user, p_undo_hash)
  on conflict (wishlist_item_id) do nothing;
  if found then return 'reserved'; end if;
  -- Tapped twice by the same browser : still its own.
  return case when exists (select 1 from public.wishlist_reservations where wishlist_item_id = p_item_id and undo_hash = p_undo_hash)
    then 'reserved' else 'taken' end;
end;
$$;

-- Taking it back : only the browser holding the undo secret. 'released',
-- 'not_found' (or not this browser's) or 'busy'.
drop function if exists public.release_wishlist_item(text, uuid, text);
create or replace function public.release_wishlist_item(p_token_hash text, p_item_id uuid, p_undo_hash text)
returns text
language plpgsql
security invoker
set search_path = public
as $$
declare v_user uuid;
begin
  if not exists (select 1 from public.wishlist_shares where token_hash = p_token_hash and revoked_at is null and expires_at > now()) then
    return 'not_found';
  end if;
  v_user := public.wishlist_share_action(p_token_hash);
  if v_user is null then return 'busy'; end if;
  delete from public.wishlist_reservations
  where wishlist_item_id = p_item_id and user_id = v_user and undo_hash = p_undo_hash;
  return case when found then 'released' else 'not_found' end;
end;
$$;

revoke execute on function public.wishlist_share_action(text) from public, anon, authenticated;
revoke execute on function public.get_shared_wishlist(text, text) from public, anon, authenticated;
revoke execute on function public.reserve_wishlist_item(text, uuid, text) from public, anon, authenticated;
revoke execute on function public.release_wishlist_item(text, uuid, text) from public, anon, authenticated;
grant execute on function public.wishlist_share_action(text) to service_role;
grant execute on function public.get_shared_wishlist(text, text) to service_role;
grant execute on function public.reserve_wishlist_item(text, uuid, text) to service_role;
grant execute on function public.release_wishlist_item(text, uuid, text) to service_role;
