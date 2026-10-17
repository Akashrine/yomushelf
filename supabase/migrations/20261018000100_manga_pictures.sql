-- "En images" on the series page : up to 12 illustrations per series,
-- copied from MyAnimeList into Supabase Storage by the nightly
-- /api/cron/manga-pictures job (never hotlinked). Public read like the
-- rest of mangas ; written by the service role only (existing RLS).
alter table public.mangas
  add column pictures text[] not null default '{}'::text[],
  add column pictures_checked_at timestamptz,
  add constraint mangas_pictures_max check (cardinality(pictures) <= 12);
