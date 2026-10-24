-- ============================================================
-- Publisher price per series. In France the book price is set by the
-- publisher (loi Lang) : a regular volume of a series costs the same
-- everywhere, and almost always the same from one volume to the next.
-- * list_price_eur : current price of a regular volume, French edition,
--   researched with its source (list_price_ref) ; null when unverified.
-- * Readers never type it : the app values volumes without a typed price
--   at this price, always shown as an estimate.
-- * The family's Christmas list falls back to it.
-- Readable like the rest of the catalogue ; readers cannot write it
-- (column grants of 20261017000000).
-- Rollback : supabase/rollbacks/20261025000100_list_prices_down.sql
-- ============================================================

alter table public.mangas
  add column if not exists list_price_eur numeric(5,2) check (list_price_eur is null or (list_price_eur > 0 and list_price_eur <= 100)),
  add column if not exists list_price_ref text,
  add column if not exists list_price_year smallint;

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
          -- The price the reader typed, else the volume's French price, else
          -- the series' publisher price (20261025000100).
          'price_eur', coalesce(w.target_price, v.price_eur, m.list_price_eur),
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
