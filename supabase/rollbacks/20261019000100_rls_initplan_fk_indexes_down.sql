-- Rollback of 20261019000100 : policies back to a per-row auth.uid(), indexes dropped.

alter policy "discovery_dismissals: delete own" on public.discovery_dismissals
  using ((auth.uid() = user_id));
alter policy "discovery_dismissals: insert own" on public.discovery_dismissals
  with check (((auth.uid() = user_id) AND (EXISTS ( SELECT 1
   FROM mangas m
  WHERE ((m.id = discovery_dismissals.manga_id) AND (m.merged_into IS NULL))))));
alter policy "discovery_dismissals: read own" on public.discovery_dismissals
  using ((auth.uid() = user_id));
alter policy "mangas: delete own private" on public.mangas
  using ((created_by = auth.uid()));
alter policy "mangas: insert own private" on public.mangas
  with check (((created_by = auth.uid()) AND (is_top_50_fr = false) AND (top_50_rank IS NULL)));
alter policy "mangas: read shared or own" on public.mangas
  using (((created_by IS NULL) OR (created_by = auth.uid())));
alter policy "mangas: update own private" on public.mangas
  using ((created_by = auth.uid()))
  with check ((created_by = auth.uid()));
alter policy "profiles: read own" on public.profiles
  using ((auth.uid() = id));
alter policy "profiles: update own" on public.profiles
  using ((auth.uid() = id))
  with check ((auth.uid() = id));
alter policy "share_events: insert own" on public.share_events
  with check ((auth.uid() = user_id));
alter policy "user_collections: delete own" on public.user_collections
  using ((auth.uid() = user_id));
alter policy "user_collections: insert own" on public.user_collections
  with check (((auth.uid() = user_id) AND (EXISTS ( SELECT 1
   FROM mangas m
  WHERE ((m.id = user_collections.manga_id) AND (m.merged_into IS NULL))))));
alter policy "user_collections: read own" on public.user_collections
  using ((auth.uid() = user_id));
alter policy "user_collections: update own" on public.user_collections
  using ((auth.uid() = user_id))
  with check (((auth.uid() = user_id) AND (EXISTS ( SELECT 1
   FROM mangas m
  WHERE ((m.id = user_collections.manga_id) AND (m.merged_into IS NULL))))));
alter policy "user_readings: delete own" on public.user_readings
  using ((auth.uid() = user_id));
alter policy "user_readings: insert own" on public.user_readings
  with check (((auth.uid() = user_id) AND (EXISTS ( SELECT 1
   FROM mangas m
  WHERE ((m.id = user_readings.manga_id) AND (m.merged_into IS NULL))))));
alter policy "user_readings: read own" on public.user_readings
  using ((auth.uid() = user_id));
alter policy "user_readings: update own" on public.user_readings
  using ((auth.uid() = user_id))
  with check (((auth.uid() = user_id) AND (EXISTS ( SELECT 1
   FROM mangas m
  WHERE ((m.id = user_readings.manga_id) AND (m.merged_into IS NULL))))));
alter policy "user_volumes: delete own" on public.user_volumes
  using ((auth.uid() = user_id));
alter policy "user_volumes: insert own" on public.user_volumes
  with check (((auth.uid() = user_id) AND (EXISTS ( SELECT 1
   FROM mangas m
  WHERE ((m.id = user_volumes.manga_id) AND (m.merged_into IS NULL))))));
alter policy "user_volumes: read own" on public.user_volumes
  using ((auth.uid() = user_id));
alter policy "user_volumes: update own" on public.user_volumes
  using ((auth.uid() = user_id))
  with check (((auth.uid() = user_id) AND (EXISTS ( SELECT 1
   FROM mangas m
  WHERE ((m.id = user_volumes.manga_id) AND (m.merged_into IS NULL))))));
alter policy "wishlist_items: delete own" on public.wishlist_items
  using ((auth.uid() = user_id));
alter policy "wishlist_items: insert own" on public.wishlist_items
  with check (((auth.uid() = user_id) AND (EXISTS ( SELECT 1
   FROM mangas m
  WHERE ((m.id = wishlist_items.manga_id) AND (m.merged_into IS NULL))))));
alter policy "wishlist_items: read own" on public.wishlist_items
  using ((auth.uid() = user_id));
alter policy "wishlist_items: update own" on public.wishlist_items
  using ((auth.uid() = user_id))
  with check (((auth.uid() = user_id) AND (EXISTS ( SELECT 1
   FROM mangas m
  WHERE ((m.id = wishlist_items.manga_id) AND (m.merged_into IS NULL))))));
alter policy "wrapped_snapshots: read own" on public.wrapped_snapshots
  using ((auth.uid() = user_id));

drop index if exists public.user_volumes_manga_id_idx;
drop index if exists public.user_readings_manga_id_idx;
drop index if exists public.wishlist_items_manga_id_idx;
drop index if exists public.discovery_dismissals_manga_id_idx;
drop index if exists public.editorial_selection_items_manga_id_idx;
drop index if exists public.mangas_merged_into_idx;
