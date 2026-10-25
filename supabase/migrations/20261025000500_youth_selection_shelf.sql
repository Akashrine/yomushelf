-- ============================================================
-- A reader under 15 puts on their shelf only what the youth selection
-- allows, enforced where the data is written (not only in the app) :
--   * a catalogue series whose age is verified for the whole series
--     (CNLJ selection), 14 at most ;
--   * a series already on their shelf ;
--   * their own personal series.
-- A reader who has not answered the age question yet is restricted too
-- (fail closed) ; only "15_plus" lifts the rule. Mirrors
-- src/lib/discovery/minor-catalogue.ts (MINOR_MAX_AGE = 14).
-- Restrictive policies : they add to the existing ones, never replace.
-- The service role (imports, jobs) is not affected.
-- Rollback : supabase/rollbacks/20261025000500_youth_selection_shelf_down.sql
-- ============================================================

create or replace function public.reader_may_have_series(p_manga uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    coalesce((select p.age_band from public.profiles p where p.id = auth.uid()), '') = '15_plus'
    or exists (select 1 from public.user_collections c where c.user_id = auth.uid() and c.manga_id = p_manga)
    or exists (
      select 1 from public.mangas m
      where m.id = p_manga
        and (
          m.created_by = auth.uid()
          or (m.audience_age_source = 'cnlj' and m.audience_age_scope = 'series' and m.audience_min_age <= 14)
        )
    );
$$;
revoke execute on function public.reader_may_have_series(uuid) from public, anon;
grant execute on function public.reader_may_have_series(uuid) to authenticated;

do $$
declare t text;
begin
  foreach t in array array['user_collections', 'user_volumes', 'user_readings'] loop
    execute format('drop policy if exists "%1$s: youth selection (insert)" on public.%1$I', t);
    execute format('create policy "%1$s: youth selection (insert)" on public.%1$I as restrictive for insert to authenticated with check ((select public.reader_may_have_series(manga_id)))', t);
  end loop;
end $$;
