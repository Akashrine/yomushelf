-- Rollback of 20261018000300_age_and_parental_consent.sql
do $$
declare t text;
begin
  foreach t in array array['user_collections', 'user_volumes', 'user_readings', 'wishlist_items',
                           'discovery_dismissals', 'mangas', 'share_events'] loop
    execute format('drop policy if exists "%1$s: account ready (insert)" on public.%1$I', t);
    execute format('drop policy if exists "%1$s: account ready (update)" on public.%1$I', t);
  end loop;
end $$;
drop function if exists public.account_ready();
drop function if exists public.claim_consent_email(uuid, text);
drop function if exists public.give_parental_consent(text);
drop table if exists public.consent_email_sends;
drop trigger if exists profiles_enforce_minor_settings on public.profiles;
drop function if exists public.enforce_minor_settings();
drop table if exists public.parental_consents;
revoke select (age_band, age_band_set_at, heard_from, parent_consent_at) on public.profiles from authenticated;
alter table public.profiles
  drop column if exists age_band,
  drop column if exists age_band_set_at,
  drop column if exists heard_from,
  drop column if exists parent_consent_at;
