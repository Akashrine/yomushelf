-- Rollback of 20261018000300_age_and_parental_consent.sql
drop trigger if exists profiles_enforce_minor_settings on public.profiles;
drop function if exists public.enforce_minor_settings();
drop table if exists public.parental_consents;
revoke select (age_band, age_band_set_at, heard_from, parent_consent_at) on public.profiles from authenticated;
alter table public.profiles
  drop column if exists age_band,
  drop column if exists age_band_set_at,
  drop column if exists heard_from,
  drop column if exists parent_consent_at;
