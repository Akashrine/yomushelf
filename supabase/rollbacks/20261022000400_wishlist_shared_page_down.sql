-- Rollback of 20261022000400_wishlist_shared_page.sql : back to the
-- functions of 20261022000200 (copied from it).
drop function if exists public.get_shared_wishlist(text, text);
drop function if exists public.release_wishlist_item(text, uuid, text);
drop function if exists public.reserve_wishlist_item(text, uuid, text);
drop function if exists public.wishlist_share_action(text);
drop trigger if exists wishlist_shares_reset_actions on public.wishlist_shares;
drop function if exists public.reset_wishlist_share_actions();
alter table public.wishlist_shares drop column if exists action_window_start, drop column if exists action_count;

create or replace function public.get_shared_wishlist(p_token_hash text)
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
          'reserved', r.wishlist_item_id is not null
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

create or replace function public.reserve_wishlist_item(p_token_hash text, p_item_id uuid, p_undo_hash text)
returns text
language plpgsql
security invoker
set search_path = public
as $$
declare v_user uuid;
begin
  select user_id into v_user from public.wishlist_shares
  where token_hash = p_token_hash and revoked_at is null and expires_at > now();
  if v_user is null
     or not exists (select 1 from public.wishlist_items where id = p_item_id and user_id = v_user) then
    return 'not_found';
  end if;
  insert into public.wishlist_reservations (wishlist_item_id, user_id, undo_hash)
  values (p_item_id, v_user, p_undo_hash)
  on conflict (wishlist_item_id) do nothing;
  return case when found then 'reserved' else 'taken' end;
end;
$$;

create or replace function public.release_wishlist_item(p_token_hash text, p_item_id uuid, p_undo_hash text)
returns boolean
language plpgsql
security invoker
set search_path = public
as $$
begin
  delete from public.wishlist_reservations r
  using public.wishlist_shares s
  where r.wishlist_item_id = p_item_id
    and r.undo_hash = p_undo_hash
    and s.user_id = r.user_id
    and s.token_hash = p_token_hash and s.revoked_at is null and s.expires_at > now();
  return found;
end;
$$;

revoke execute on function public.get_shared_wishlist(text) from public, anon, authenticated;
revoke execute on function public.reserve_wishlist_item(text, uuid, text) from public, anon, authenticated;
revoke execute on function public.release_wishlist_item(text, uuid, text) from public, anon, authenticated;
grant execute on function public.get_shared_wishlist(text) to service_role;
grant execute on function public.reserve_wishlist_item(text, uuid, text) to service_role;
grant execute on function public.release_wishlist_item(text, uuid, text) to service_role;
