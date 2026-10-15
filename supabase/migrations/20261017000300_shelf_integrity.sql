-- 1. New activity on an archived series brings it back to the shelf :
--    a volume or a reading added to it means the reader is using it again.
create or replace function public.ensure_user_collection()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  insert into public.user_collections (user_id, manga_id)
  values (new.user_id, new.manga_id)
  on conflict (user_id, manga_id) do update
    set archived_at = null
    where public.user_collections.archived_at is not null;
  return new;
end;
$$;

-- 2. Readers can only point their rows at series they can see. Foreign keys
--    ignore RLS : without this, someone knowing the id of another reader's
--    private series could attach rows to it (and lose them on its deletion).
alter policy "user_collections: insert own" on public.user_collections
  with check (auth.uid() = user_id and exists (select 1 from public.mangas m where m.id = manga_id));
alter policy "user_collections: update own" on public.user_collections
  with check (auth.uid() = user_id and exists (select 1 from public.mangas m where m.id = manga_id));
alter policy "user_volumes: insert own" on public.user_volumes
  with check (auth.uid() = user_id and exists (select 1 from public.mangas m where m.id = manga_id));
alter policy "user_volumes: update own" on public.user_volumes
  with check (auth.uid() = user_id and exists (select 1 from public.mangas m where m.id = manga_id));
alter policy "user_readings: insert own" on public.user_readings
  with check (auth.uid() = user_id and exists (select 1 from public.mangas m where m.id = manga_id));
alter policy "user_readings: update own" on public.user_readings
  with check (auth.uid() = user_id and exists (select 1 from public.mangas m where m.id = manga_id));
alter policy "wishlist_items: insert own" on public.wishlist_items
  with check (auth.uid() = user_id and exists (select 1 from public.mangas m where m.id = manga_id));
alter policy "wishlist_items: update own" on public.wishlist_items
  with check (auth.uid() = user_id and exists (select 1 from public.mangas m where m.id = manga_id));

-- 3. Sane bounds for rows readers can write directly (private series).
--    NOT VALID : checked on new and updated rows, existing rows untouched.
alter table public.mangas
  add constraint mangas_title_length_check check (char_length(btrim(title)) between 1 and 300) not valid,
  add constraint mangas_total_volumes_check check (total_volumes is null or total_volumes between 0 and 500) not valid;
