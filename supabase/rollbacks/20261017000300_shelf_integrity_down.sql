-- Back to the 20261015 trigger and the plain "own rows" policies.
create or replace function public.ensure_user_collection()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  insert into public.user_collections (user_id, manga_id)
  values (new.user_id, new.manga_id)
  on conflict (user_id, manga_id) do nothing;
  return new;
end;
$$;

alter policy "user_collections: insert own" on public.user_collections with check (auth.uid() = user_id);
alter policy "user_collections: update own" on public.user_collections with check (auth.uid() = user_id);
alter policy "user_volumes: insert own" on public.user_volumes with check (auth.uid() = user_id);
alter policy "user_volumes: update own" on public.user_volumes with check (auth.uid() = user_id);
alter policy "user_readings: insert own" on public.user_readings with check (auth.uid() = user_id);
alter policy "user_readings: update own" on public.user_readings with check (auth.uid() = user_id);
alter policy "wishlist_items: insert own" on public.wishlist_items with check (auth.uid() = user_id);
alter policy "wishlist_items: update own" on public.wishlist_items with check (auth.uid() = user_id);

alter table public.mangas
  drop constraint if exists mangas_title_length_check,
  drop constraint if exists mangas_total_volumes_check;
