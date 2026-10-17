alter table public.mangas
  drop constraint if exists mangas_pictures_max,
  drop column if exists pictures_checked_at,
  drop column if exists pictures;
