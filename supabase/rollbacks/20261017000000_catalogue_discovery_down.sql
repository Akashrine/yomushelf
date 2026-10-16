-- Rollback of 20261017000000_catalogue_discovery.sql
-- Lossy on purpose : private series (and the volumes/readings attached to
-- them) are deleted, since the shared catalogue cannot hold them.
-- Also lossy : archived series come back on the shelf (archived_at is
-- dropped), and the catalogue loses genres, ages, synopses and aliases.
alter table public.user_collections drop column if exists archived_at;

drop table if exists public.editorial_selection_items;
drop table if exists public.editorial_selections;

drop function if exists public.search_mangas(text, integer);

drop policy if exists "mangas: read shared or own" on public.mangas;
drop policy if exists "mangas: insert own private" on public.mangas;
drop policy if exists "mangas: update own private" on public.mangas;
drop policy if exists "mangas: delete own private" on public.mangas;
delete from public.mangas where created_by is not null;
create policy "mangas: read public" on public.mangas for select using (true);
grant insert, update, delete on public.mangas to authenticated;

drop trigger if exists mangas_search_key on public.mangas;
drop function if exists public.mangas_set_search_key();
drop index if exists public.mangas_search_key_trgm;
drop index if exists public.mangas_created_by_idx;

alter table public.mangas
  drop column if exists search_key,
  drop column if exists created_by,
  drop column if exists aliases,
  drop column if exists synopsis,
  drop column if exists audience_min_age,
  drop column if exists demographic,
  drop column if exists genres;

drop function if exists public.normalize_search(text);
drop function if exists public.f_unaccent(text);

-- Back to the table-wide grants Supabase gives by default (before 20261017000000).
revoke insert (title, author, total_volumes, status), update (title, author, total_volumes, status) on public.mangas from authenticated;
grant all on public.mangas to anon, authenticated;
