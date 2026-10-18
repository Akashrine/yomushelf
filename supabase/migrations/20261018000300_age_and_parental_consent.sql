-- ============================================================
-- Age, "comment tu as connu Yomushelf ?" and parental consent.
-- * profiles.age_band : declared by the reader after sign-up (email or
--   Google), "under_15" or "15_plus". Under 15, French law (art. 45 loi
--   Informatique et Libertés) asks for a parent's consent.
-- * profiles.heard_from : how the reader heard of Yomushelf.
-- * profiles.parent_consent_at : when a parent said yes.
-- * parental_consents : the parent's email and the hashed link token.
--   Service role only : never readable by the child's session.
-- * Under 15, Découvrir is locked to the CNLJ youth selection and the
--   profile can never be public (trigger below).
-- Clients may read the new profile columns but not write them : only the
-- server (service role) sets them, after checking the session.
-- Rollback : supabase/rollbacks/20261018000300_age_and_parental_consent_down.sql
-- ============================================================

alter table public.profiles
  add column if not exists age_band text check (age_band in ('under_15', '15_plus')),
  add column if not exists age_band_set_at timestamptz,
  add column if not exists heard_from text check (heard_from in
    ('ami', 'parent', 'librairie', 'mediatheque_cdi', 'salon', 'reseaux', 'google', 'autre')),
  add column if not exists parent_consent_at timestamptz;

grant select (age_band, age_band_set_at, heard_from, parent_consent_at) on public.profiles to authenticated;

create table if not exists public.parental_consents (
  user_id      uuid primary key references public.profiles(id) on delete cascade,
  parent_email text not null check (length(parent_email) <= 254 and parent_email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  token_hash   text not null unique check (token_hash ~ '^[0-9a-f]{64}$'),
  expires_at   timestamptz not null,
  sent_count   integer not null default 1 check (sent_count between 0 and 1000),
  last_sent_at timestamptz not null default now(),
  confirmed_at timestamptz,
  created_at   timestamptz not null default now()
);
comment on table public.parental_consents is
  'Parent email and hashed consent link for readers under 15. Service role only.';

alter table public.parental_consents enable row level security;
-- No policy : anon and authenticated never see a row.
revoke all on public.parental_consents from anon, authenticated;

-- Under 15 : youth selection only, never a public profile.
create or replace function public.enforce_minor_settings()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if new.age_band = 'under_15' then
    new.discovery_scope := 'youth_verified';
    new.sharing_locked := true;
  end if;
  return new;
end;
$$;

-- Fires before profiles_enforce_sharing_lock (alphabetical order), which
-- then turns is_public off.
drop trigger if exists profiles_enforce_minor_settings on public.profiles;
create trigger profiles_enforce_minor_settings
  before insert or update on public.profiles
  for each row execute function public.enforce_minor_settings();

revoke execute on function public.enforce_minor_settings() from public, anon, authenticated;
