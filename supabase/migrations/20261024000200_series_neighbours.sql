-- ============================================================
-- "Séries proches" : for each curated series, the closest ones by what
-- they tell (title, genres, readership, French synopsis), computed outside
-- the app by scripts/series-neighbours.mjs (open multilingual model,
-- multilingual-e5-small). Catalogue data only : no reader data is used.
-- Readable like the catalogue ; written by the service role only.
-- Rollback : supabase/rollbacks/20261024000200_series_neighbours_down.sql
-- ============================================================

create table if not exists public.series_neighbours (
  manga_id uuid not null references public.mangas(id) on delete cascade,
  neighbour_id uuid not null references public.mangas(id) on delete cascade,
  rank smallint not null check (rank between 1 and 50),
  score real not null check (score between -1 and 1),
  model text not null,
  computed_at timestamptz not null,
  primary key (manga_id, neighbour_id),
  check (manga_id <> neighbour_id)
);
create index if not exists series_neighbours_rank on public.series_neighbours (manga_id, rank);

alter table public.series_neighbours enable row level security;
revoke all on public.series_neighbours from anon, authenticated;
grant select on public.series_neighbours to anon, authenticated;
drop policy if exists "series_neighbours: read" on public.series_neighbours;
create policy "series_neighbours: read" on public.series_neighbours for select to anon, authenticated using (true);
