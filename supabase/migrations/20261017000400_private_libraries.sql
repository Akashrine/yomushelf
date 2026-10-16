-- ============================================================
-- Libraries are private. Public profiles are not part of the product.
-- * Profiles that were public become private. Their previous state is
--   kept in profile_visibility_backup so the rollback can restore it.
-- * New accounts are private (column default) and nobody can turn a
--   profile public again : no client grant, and a check constraint.
-- * Public read paths are closed : the "read public" policies and the
--   get_public_profile() function. No collection data is deleted.
-- Rollback : supabase/rollbacks/20261017000400_private_libraries_down.sql
-- ============================================================

create table if not exists public.profile_visibility_backup (
  user_id     uuid primary key references public.profiles(id) on delete cascade,
  public_slug text,
  saved_at    timestamptz not null default now()
);
alter table public.profile_visibility_backup enable row level security;
-- No policy : service role only.
revoke all on public.profile_visibility_backup from anon, authenticated;

insert into public.profile_visibility_backup (user_id, public_slug)
select id, public_slug from public.profiles where is_public
on conflict (user_id) do nothing;

update public.profiles set is_public = false where is_public;

alter table public.profiles alter column is_public set default false;
revoke update (is_public) on public.profiles from authenticated, anon;

do $$ begin
  alter table public.profiles add constraint profiles_private check (is_public = false);
exception when duplicate_object then null; end $$;

drop policy if exists "profiles: read public" on public.profiles;
drop policy if exists "wrapped_snapshots: read public profile" on public.wrapped_snapshots;

revoke execute on function public.get_public_profile(text) from public, anon, authenticated;
