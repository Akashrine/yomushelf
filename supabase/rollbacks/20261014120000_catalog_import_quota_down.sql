-- Rollback of 20261014120000_catalog_import_quota.sql (no user data lost : the
-- table only holds counters of recent import attempts).
drop function if exists public.consume_import_quota(uuid, text, integer, integer);
drop table if exists public.catalog_import_events;
