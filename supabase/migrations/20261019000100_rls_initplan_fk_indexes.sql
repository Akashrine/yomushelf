-- Performance hygiene, no change in who can read or write what.
--
-- 1. RLS : auth.uid() wrapped in (select …) is evaluated once per query
--    (an initPlan) instead of once per row. Same expressions otherwise :
--    generated from pg_policies, checked identical in production before
--    writing (27 policies). Measured locally on 42 500 rows : the RLS-only
--    scan 4.5 → 3.7 ms (median of 7).
-- 2. Indexes on the manga_id foreign keys (Supabase advisor 0001) : merging
--    a series (catalogue_merge) and deleting one (on delete cascade) look
--    rows up by manga_id, a full scan of every reader's rows without them.

alter policy "discovery_dismissals: delete own" on public.discovery_dismissals
  using (((select auth.uid()) = user_id));
alter policy "discovery_dismissals: insert own" on public.discovery_dismissals
  with check ((((select auth.uid()) = user_id) AND (EXISTS ( SELECT 1
   FROM mangas m
  WHERE ((m.id = discovery_dismissals.manga_id) AND (m.merged_into IS NULL))))));
alter policy "discovery_dismissals: read own" on public.discovery_dismissals
  using (((select auth.uid()) = user_id));
alter policy "mangas: delete own private" on public.mangas
  using ((created_by = (select auth.uid())));
alter policy "mangas: insert own private" on public.mangas
  with check (((created_by = (select auth.uid())) AND (is_top_50_fr = false) AND (top_50_rank IS NULL)));
alter policy "mangas: read shared or own" on public.mangas
  using (((created_by IS NULL) OR (created_by = (select auth.uid()))));
alter policy "mangas: update own private" on public.mangas
  using ((created_by = (select auth.uid())))
  with check ((created_by = (select auth.uid())));
alter policy "profiles: read own" on public.profiles
  using (((select auth.uid()) = id));
alter policy "profiles: update own" on public.profiles
  using (((select auth.uid()) = id))
  with check (((select auth.uid()) = id));
alter policy "share_events: insert own" on public.share_events
  with check (((select auth.uid()) = user_id));
alter policy "user_collections: delete own" on public.user_collections
  using (((select auth.uid()) = user_id));
alter policy "user_collections: insert own" on public.user_collections
  with check ((((select auth.uid()) = user_id) AND (EXISTS ( SELECT 1
   FROM mangas m
  WHERE ((m.id = user_collections.manga_id) AND (m.merged_into IS NULL))))));
alter policy "user_collections: read own" on public.user_collections
  using (((select auth.uid()) = user_id));
alter policy "user_collections: update own" on public.user_collections
  using (((select auth.uid()) = user_id))
  with check ((((select auth.uid()) = user_id) AND (EXISTS ( SELECT 1
   FROM mangas m
  WHERE ((m.id = user_collections.manga_id) AND (m.merged_into IS NULL))))));
alter policy "user_readings: delete own" on public.user_readings
  using (((select auth.uid()) = user_id));
alter policy "user_readings: insert own" on public.user_readings
  with check ((((select auth.uid()) = user_id) AND (EXISTS ( SELECT 1
   FROM mangas m
  WHERE ((m.id = user_readings.manga_id) AND (m.merged_into IS NULL))))));
alter policy "user_readings: read own" on public.user_readings
  using (((select auth.uid()) = user_id));
alter policy "user_readings: update own" on public.user_readings
  using (((select auth.uid()) = user_id))
  with check ((((select auth.uid()) = user_id) AND (EXISTS ( SELECT 1
   FROM mangas m
  WHERE ((m.id = user_readings.manga_id) AND (m.merged_into IS NULL))))));
alter policy "user_volumes: delete own" on public.user_volumes
  using (((select auth.uid()) = user_id));
alter policy "user_volumes: insert own" on public.user_volumes
  with check ((((select auth.uid()) = user_id) AND (EXISTS ( SELECT 1
   FROM mangas m
  WHERE ((m.id = user_volumes.manga_id) AND (m.merged_into IS NULL))))));
alter policy "user_volumes: read own" on public.user_volumes
  using (((select auth.uid()) = user_id));
alter policy "user_volumes: update own" on public.user_volumes
  using (((select auth.uid()) = user_id))
  with check ((((select auth.uid()) = user_id) AND (EXISTS ( SELECT 1
   FROM mangas m
  WHERE ((m.id = user_volumes.manga_id) AND (m.merged_into IS NULL))))));
alter policy "wishlist_items: delete own" on public.wishlist_items
  using (((select auth.uid()) = user_id));
alter policy "wishlist_items: insert own" on public.wishlist_items
  with check ((((select auth.uid()) = user_id) AND (EXISTS ( SELECT 1
   FROM mangas m
  WHERE ((m.id = wishlist_items.manga_id) AND (m.merged_into IS NULL))))));
alter policy "wishlist_items: read own" on public.wishlist_items
  using (((select auth.uid()) = user_id));
alter policy "wishlist_items: update own" on public.wishlist_items
  using (((select auth.uid()) = user_id))
  with check ((((select auth.uid()) = user_id) AND (EXISTS ( SELECT 1
   FROM mangas m
  WHERE ((m.id = wishlist_items.manga_id) AND (m.merged_into IS NULL))))));
alter policy "wrapped_snapshots: read own" on public.wrapped_snapshots
  using (((select auth.uid()) = user_id));

create index if not exists user_volumes_manga_id_idx on public.user_volumes (manga_id);
create index if not exists user_readings_manga_id_idx on public.user_readings (manga_id);
create index if not exists wishlist_items_manga_id_idx on public.wishlist_items (manga_id);
create index if not exists discovery_dismissals_manga_id_idx on public.discovery_dismissals (manga_id);
create index if not exists editorial_selection_items_manga_id_idx on public.editorial_selection_items (manga_id);
create index if not exists mangas_merged_into_idx on public.mangas (merged_into) where merged_into is not null;
