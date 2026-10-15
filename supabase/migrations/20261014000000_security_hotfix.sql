-- ============================================================
-- Security hotfix — independent of the collection_value migration,
-- compatible with the schema currently in production.
--
-- 1. profiles : RLS filters rows, not columns. Anon and signed-in users
--    could read (and update) every column of a visible profile, email
--    included. Column privileges now list what each role may touch.
--    A new profiles column is invisible to clients until granted here.
-- 2. profiles.sharing_locked : forces is_public = false. Clients have no
--    UPDATE privilege on it, so only SQL / service role can change it.
-- 3. get_user_stats : was security definer with a caller-supplied id and
--    executable by anon. Now security invoker (RLS applies) + explicit
--    auth.uid() guard, authenticated only.
-- 4. generate_wrapped : meant to be service-role only, but Supabase's
--    default privileges let anon and authenticated execute it.
-- ============================================================

-- ── 1. profiles column privileges ───────────────────────────
revoke all on public.profiles from anon, authenticated;

grant select (id, username, avatar_initials, bio, is_public, public_slug, created_at)
  on public.profiles to anon;

grant select (id, username, avatar_initials, bio, is_public, public_slug, created_at, onboarding_completed)
  on public.profiles to authenticated;

grant update (username, bio, is_public, onboarding_completed)
  on public.profiles to authenticated;

-- ── 2. sharing lock ─────────────────────────────────────────
alter table public.profiles
  add column if not exists sharing_locked boolean not null default false;

comment on column public.profiles.sharing_locked is
  'When true the profile can never be public. Not updatable by clients.';

create or replace function public.enforce_sharing_lock()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if new.sharing_locked then
    new.is_public := false;
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_enforce_sharing_lock on public.profiles;
create trigger profiles_enforce_sharing_lock
  before insert or update on public.profiles
  for each row execute function public.enforce_sharing_lock();

revoke execute on function public.enforce_sharing_lock() from public, anon, authenticated;

-- ── 3. get_user_stats ───────────────────────────────────────
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
    count(distinct uc.manga_id)                              as total_series,
    sum(array_length(uc.owned_volumes, 1))                   as total_volumes_owned,
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
    )                                                        as total_budget_eur,
    sum(coalesce(uc.last_read_volume, 0))                    as volumes_read
  from public.user_collections uc
  join public.mangas m on m.id = uc.manga_id
  where uc.user_id = p_user_id
    and p_user_id = (select auth.uid());
$$;

revoke execute on function public.get_user_stats(uuid) from public, anon;
grant execute on function public.get_user_stats(uuid) to authenticated;

-- ── 4. generate_wrapped ─────────────────────────────────────
revoke execute on function public.generate_wrapped(uuid, integer) from public, anon, authenticated;
grant execute on function public.generate_wrapped(uuid, integer) to service_role;
