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
-- Rollback : supabase/rollbacks/20261022000100_age_and_parental_consent_down.sql
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

-- ── Who may write : the gate, enforced by the database ─────────
-- The app sends a reader to /bienvenue until they are ready ; these
-- restrictive policies make server actions and direct PostgREST calls
-- wait too. Ready = age and source answered, and under 15 a parent's yes.
create or replace function public.account_ready()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid()
      and age_band is not null
      and heard_from is not null
      and (age_band = '15_plus' or parent_consent_at is not null)
  );
$$;
revoke execute on function public.account_ready() from public, anon;
grant execute on function public.account_ready() to authenticated;

do $$
declare t text;
begin
  foreach t in array array['user_collections', 'user_volumes', 'user_readings', 'wishlist_items',
                           'discovery_dismissals', 'mangas', 'share_events'] loop
    execute format('drop policy if exists "%1$s: account ready (insert)" on public.%1$I', t);
    execute format('create policy "%1$s: account ready (insert)" on public.%1$I as restrictive for insert to authenticated with check ((select public.account_ready()))', t);
    execute format('drop policy if exists "%1$s: account ready (update)" on public.%1$I', t);
    execute format('create policy "%1$s: account ready (update)" on public.%1$I as restrictive for update to authenticated using ((select public.account_ready())) with check ((select public.account_ready()))', t);
  end loop;
end $$;

-- ── Consent emails : an atomic throttle that survives age changes ─
-- One row per email sent. Kept when the reader corrects their age (only
-- the account's deletion removes them), so the limits cannot be reset.
-- The recipient is stored hashed : it only serves the per-address limit.
create table if not exists public.consent_email_sends (
  id              bigint generated always as identity primary key,
  user_id         uuid not null references public.profiles(id) on delete cascade,
  recipient_hash  text not null check (recipient_hash ~ '^[0-9a-f]{64}$'),
  sent_at         timestamptz not null default now()
);
create index if not exists consent_email_sends_user_idx on public.consent_email_sends (user_id, sent_at desc);
create index if not exists consent_email_sends_recipient_idx on public.consent_email_sends (recipient_hash, sent_at desc);
alter table public.consent_email_sends enable row level security;
revoke all on public.consent_email_sends from anon, authenticated;

-- Claims the right to send one email : 1 per minute and 5 a day per
-- account, 3 a day per address. Serialised per account, so parallel
-- requests cannot all pass. Returns 'ok', 'wait', 'day' or 'recipient'.
create or replace function public.claim_consent_email(p_user uuid, p_recipient_hash text)
returns text
language plpgsql
security definer
set search_path = public
as $$
begin
  perform pg_advisory_xact_lock(hashtextextended('consent_email:' || p_user::text, 0));
  perform pg_advisory_xact_lock(hashtextextended('consent_email_to:' || p_recipient_hash, 0));
  if exists (select 1 from consent_email_sends where user_id = p_user and sent_at > now() - interval '1 minute') then
    return 'wait';
  end if;
  if (select count(*) from consent_email_sends where user_id = p_user and sent_at > now() - interval '1 day') >= 5 then
    return 'day';
  end if;
  if (select count(*) from consent_email_sends where recipient_hash = p_recipient_hash and sent_at > now() - interval '1 day') >= 3 then
    return 'recipient';
  end if;
  insert into consent_email_sends (user_id, recipient_hash) values (p_user, p_recipient_hash);
  return 'ok';
end;
$$;
revoke execute on function public.claim_consent_email(uuid, text) from public, anon, authenticated;
grant execute on function public.claim_consent_email(uuid, text) to service_role;

-- The parent's yes, both writes in one transaction. Returns the child's
-- id, or null when the link is unknown or expired. Repeating it is safe.
create or replace function public.give_parental_consent(p_token_hash text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare c public.parental_consents;
begin
  select * into c from parental_consents where token_hash = p_token_hash for update;
  if not found then return null; end if;
  if c.confirmed_at is null and c.expires_at < now() then return null; end if;
  update parental_consents set confirmed_at = coalesce(confirmed_at, now()) where user_id = c.user_id;
  update profiles set parent_consent_at = coalesce(parent_consent_at, now()) where id = c.user_id;
  return c.user_id;
end;
$$;
revoke execute on function public.give_parental_consent(text) from public, anon, authenticated;
grant execute on function public.give_parental_consent(text) to service_role;
