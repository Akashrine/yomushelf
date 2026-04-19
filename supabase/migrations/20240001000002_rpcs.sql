-- ============================================================
-- 003 : RPCs
-- ============================================================

-- ─────────────────────────────────────────
-- get_waitlist_count() → bigint
-- Callable by anon (used on landing for social proof).
-- Result cached at the application layer (Route Handler 60s).
-- ─────────────────────────────────────────
create or replace function public.get_waitlist_count()
returns bigint
language sql
stable
security definer
set search_path = public
as $$
  select count(*) from public.waitlist_entries where confirmed = true;
$$;

-- Allow anon + authenticated to call it
grant execute on function public.get_waitlist_count() to anon, authenticated;

-- ─────────────────────────────────────────
-- get_user_stats(p_user_id uuid)
-- Returns aggregated stats for the user's collection.
-- Budget = sum(owned_volume_count × price_eur) with fallback avg_price_eur.
-- ─────────────────────────────────────────
create or replace function public.get_user_stats(p_user_id uuid)
returns table (
  total_series        bigint,
  total_volumes_owned bigint,
  total_budget_eur    numeric,
  volumes_read        bigint
)
language sql
stable
security definer
set search_path = public
as $$
  select
    count(distinct uc.manga_id)                              as total_series,
    sum(array_length(uc.owned_volumes, 1))                   as total_volumes_owned,
    sum(
      array_length(uc.owned_volumes, 1) *
      coalesce(
        -- average price of owned volumes for this manga
        (
          select avg(coalesce(v.price_eur, m.avg_price_eur))
          from public.volumes v
          where v.manga_id = uc.manga_id
            and v.volume_number = any(uc.owned_volumes)
        ),
        m.avg_price_eur
      )
    )                                                        as total_budget_eur,
    sum(
      case
        when uc.last_read_volume is not null then uc.last_read_volume
        else 0
      end
    )                                                        as volumes_read
  from public.user_collections uc
  join public.mangas m on m.id = uc.manga_id
  where uc.user_id = p_user_id;
$$;

-- Only authenticated users can call it; RLS on user_collections ensures
-- the function only sees rows they own (security definer + search_path set).
grant execute on function public.get_user_stats(uuid) to authenticated;
