-- Rollback of 20261017000700_search_quota.sql
delete from public.catalog_import_events where kind = 'remote_search';
alter table public.catalog_import_events drop constraint if exists catalog_import_events_kind_check;
alter table public.catalog_import_events
  add constraint catalog_import_events_kind_check check (kind in ('import', 'isbn_lookup'));
