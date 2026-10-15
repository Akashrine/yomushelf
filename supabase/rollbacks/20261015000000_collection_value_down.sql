-- Rollback of 20261015000000_collection_value.sql
-- user_collections.owned_volumes / last_read_volume are kept in sync by the
-- migration, so dropping user_volumes loses only prices, acquisition types
-- and per-volume reading dates. Export them first if they matter.
-- Then : delete from supabase_migrations.schema_migrations where version = '20261015000000';

drop trigger if exists user_volumes_sync_collection on public.user_volumes;
drop trigger if exists user_volumes_ensure_collection on public.user_volumes;
drop function if exists public.sync_user_collection();
drop function if exists public.refresh_user_collection(uuid, uuid);
drop function if exists public.ensure_user_collection();

drop table if exists public.wishlist_items;
drop table if exists public.user_volumes;

drop type if exists public.wishlist_priority;
drop type if exists public.volume_read_status;
drop type if exists public.acquisition_type;

-- Restore get_user_stats as left by 20261014000000_security_hotfix.sql
create or replace function public.get_user_stats(p_user_id uuid)
returns table (
  total_series        bigint,
  total_volumes_owned bigint,
  total_budget_eur    numeric,
  volumes_read        bigint
)
language sql
stable
security invoker
set search_path = public
as $$
  select
    count(distinct uc.manga_id),
    sum(array_length(uc.owned_volumes, 1)),
    sum(
      array_length(uc.owned_volumes, 1) *
      coalesce(
        (
          select avg(coalesce(v.price_eur, m.avg_price_eur))
          from public.volumes v
          where v.manga_id = uc.manga_id
            and v.volume_number = any(uc.owned_volumes)
        ),
        m.avg_price_eur
      )
    ),
    sum(coalesce(uc.last_read_volume, 0))
  from public.user_collections uc
  join public.mangas m on m.id = uc.manga_id
  where uc.user_id = p_user_id
    and p_user_id = (select auth.uid());
$$;
