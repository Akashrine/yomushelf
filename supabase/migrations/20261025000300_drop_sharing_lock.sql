-- ============================================================
-- Remove profiles.sharing_locked.
-- Added on 2026-10-14 to keep a profile from ever being public. Public
-- profiles are gone since 2026-10-16 (constraint profiles_private keeps
-- is_public false for everyone), so the lock had no purpose left, but
-- the family Christmas list reused it : a locked reader of 15 and over
-- silently lost the "send my list" panel. Who may share is now decided
-- by age and parental consent only, as the product rules say.
-- Rollback : supabase/rollbacks/20261025000300_drop_sharing_lock_down.sql
-- ============================================================

-- 15 and over : the reader shares. Under 15 : the parent, with consent.
create or replace function public.upsert_wishlist_share(
  p_user_id uuid, p_token_hash text, p_display_name text, p_by_parent boolean, p_expires_at timestamptz
)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare p public.profiles;
begin
  select * into p from public.profiles where id = p_user_id;
  if not found then raise exception 'unknown reader'; end if;
  if p_by_parent then
    if p.age_band is distinct from 'under_15' or p.parent_consent_at is null then
      raise exception 'parent link only for a consented reader under 15';
    end if;
  elsif p.age_band is distinct from '15_plus' or p.heard_from is null then
    raise exception 'reader may not share';
  end if;
  if p_expires_at <= now() or p_expires_at > now() + interval '1 year' then
    raise exception 'expiry out of range';
  end if;

  insert into public.wishlist_shares (user_id, token_hash, display_name, created_by, expires_at)
  values (p_user_id, p_token_hash, btrim(p_display_name), case when p_by_parent then 'parent' else 'reader' end, p_expires_at)
  on conflict (user_id) do update
    set token_hash = excluded.token_hash,
        display_name = excluded.display_name,
        created_by = excluded.created_by,
        created_at = now(),
        expires_at = excluded.expires_at,
        revoked_at = null;
end;
$$;

-- A link stops the moment it is no longer allowed : the parent takes
-- their consent back, or the age answer changes.
create or replace function public.revoke_disallowed_wishlist_share()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.wishlist_shares s set revoked_at = now()
  where s.user_id = new.id and s.revoked_at is null
    and not (
      (new.age_band = 'under_15' and new.parent_consent_at is not null and s.created_by = 'parent')
      or new.age_band = '15_plus'
    );
  return null;
end;
$$;
drop trigger if exists profiles_revoke_disallowed_wishlist_share on public.profiles;
create trigger profiles_revoke_disallowed_wishlist_share
  after update of age_band, parent_consent_at on public.profiles
  for each row execute function public.revoke_disallowed_wishlist_share();

-- Under 15 : youth selection only.
create or replace function public.enforce_minor_settings()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if new.age_band = 'under_15' then
    new.discovery_scope := 'youth_verified';
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_enforce_sharing_lock on public.profiles;
drop function if exists public.enforce_sharing_lock();
alter table public.profiles drop column if exists sharing_locked;
