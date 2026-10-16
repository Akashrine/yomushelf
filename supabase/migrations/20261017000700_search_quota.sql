-- Per-account limit on searches that call MyAnimeList (see
-- src/lib/rate-limit/import-quota.ts). Same table and function as imports.
alter table public.catalog_import_events drop constraint if exists catalog_import_events_kind_check;
alter table public.catalog_import_events
  add constraint catalog_import_events_kind_check check (kind in ('import', 'isbn_lookup', 'remote_search'));
