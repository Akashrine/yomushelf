-- Rollback of 20261017000400_private_libraries.sql
-- Restores the public read paths and the profiles that were public before.
alter table public.profiles drop constraint if exists profiles_private;
grant update (is_public) on public.profiles to authenticated;

create policy "profiles: read public" on public.profiles
  for select using (is_public = true);
create policy "wrapped_snapshots: read public profile" on public.wrapped_snapshots
  for select using (exists (select 1 from public.profiles p where p.id = user_id and p.is_public = true));

grant execute on function public.get_public_profile(text) to anon, authenticated;

update public.profiles p set is_public = true
from public.profile_visibility_backup b where b.user_id = p.id;
drop table if exists public.profile_visibility_backup;

-- Default execute right of every function (before 20261017000400).
grant execute on function public.get_public_profile(text) to public;
