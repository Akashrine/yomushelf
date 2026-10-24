-- Rollback of 20261025000100_list_prices.sql
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

revoke execute on function public.get_shared_wishlist(text, text) from public, anon, authenticated;
grant execute on function public.get_shared_wishlist(text, text) to service_role;

alter table public.mangas drop column if exists list_price_eur, drop column if exists list_price_ref, drop column if exists list_price_year;
