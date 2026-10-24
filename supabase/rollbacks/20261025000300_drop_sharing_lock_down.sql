-- Rollback of 20261025000300_drop_sharing_lock.sql : the column comes back
-- unlocked for everyone (the former values are not kept), under-15 rows
-- locked again.
alter table public.profiles add column if not exists sharing_locked boolean not null default false;
comment on column public.profiles.sharing_locked is 'When true the profile can never be public. Not updatable by clients.';
grant select (sharing_locked) on public.profiles to authenticated;
update public.profiles set sharing_locked = true where age_band = 'under_15';

create or replace function public.enforce_sharing_lock()
returns trigger language plpgsql security invoker set search_path = public as $$
begin
  if new.sharing_locked then new.is_public := false; end if;
  return new;
end;
$$;
revoke execute on function public.enforce_sharing_lock() from public, anon, authenticated;
create trigger profiles_enforce_sharing_lock before insert or update on public.profiles
  for each row execute function public.enforce_sharing_lock();

create or replace function public.enforce_minor_settings()
returns trigger language plpgsql security invoker set search_path = public as $$
begin
  if new.age_band = 'under_15' then
    new.discovery_scope := 'youth_verified';
    new.sharing_locked := true;
  end if;
  return new;
end;
$$;

create or replace function public.upsert_wishlist_share(
  p_user_id uuid, p_token_hash text, p_display_name text, p_by_parent boolean, p_expires_at timestamptz
)
returns void language plpgsql security invoker set search_path = public as $$
declare p public.profiles;
begin
  select * into p from public.profiles where id = p_user_id;
  if not found then raise exception 'unknown reader'; end if;
  if p_by_parent then
    if p.age_band is distinct from 'under_15' or p.parent_consent_at is null then
      raise exception 'parent link only for a consented reader under 15';
    end if;
  elsif p.age_band is distinct from '15_plus' or p.heard_from is null or p.sharing_locked then
    raise exception 'reader may not share';
  end if;
  if p_expires_at <= now() or p_expires_at > now() + interval '1 year' then
    raise exception 'expiry out of range';
  end if;
  insert into public.wishlist_shares (user_id, token_hash, display_name, created_by, expires_at)
  values (p_user_id, p_token_hash, btrim(p_display_name), case when p_by_parent then 'parent' else 'reader' end, p_expires_at)
  on conflict (user_id) do update
    set token_hash = excluded.token_hash, display_name = excluded.display_name, created_by = excluded.created_by,
        created_at = now(), expires_at = excluded.expires_at, revoked_at = null;
end;
$$;

create or replace function public.revoke_disallowed_wishlist_share()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  update public.wishlist_shares s set revoked_at = now()
  where s.user_id = new.id and s.revoked_at is null
    and not (
      (new.age_band = 'under_15' and new.parent_consent_at is not null and s.created_by = 'parent')
      or (new.age_band = '15_plus' and not new.sharing_locked)
    );
  return null;
end;
$$;
drop trigger if exists profiles_revoke_disallowed_wishlist_share on public.profiles;
create trigger profiles_revoke_disallowed_wishlist_share
  after update of age_band, parent_consent_at, sharing_locked on public.profiles
  for each row execute function public.revoke_disallowed_wishlist_share();
