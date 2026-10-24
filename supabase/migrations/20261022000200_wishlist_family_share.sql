-- ============================================================
-- Christmas list : a reader's wishlist, shared with the family by a
-- private link. Under 15 the parent creates the link (the child never
-- shares), from 15 the reader does.
-- * wishlist_shares : one link per reader. The token travels in the link
--   only ; the database keeps its sha256. A new link replaces the old one.
-- * wishlist_reservations : "Je l'offre", one per wished item. Visible on
--   the shared page only, never to the reader : the surprise is kept by
--   the database, not by the UI.
-- The public page reads and writes through the service role, by token
-- hash only (functions below). The reader may read their own link's
-- status, never the token hash nor the reservations.
-- Rollback : supabase/rollbacks/20261022000200_wishlist_family_share_down.sql
-- ============================================================

create table if not exists public.wishlist_shares (
  user_id      uuid primary key references public.profiles(id) on delete cascade,
  token_hash   text not null unique check (token_hash ~ '^[0-9a-f]{64}$'),
  display_name text not null check (char_length(btrim(display_name)) between 1 and 30),
  created_by   text not null check (created_by in ('parent', 'reader')),
  created_at   timestamptz not null default now(),
  expires_at   timestamptz not null,
  revoked_at   timestamptz
);
comment on table public.wishlist_shares is
  'Private family link to a reader''s wishlist. Token stored hashed. Written by the service role only.';

alter table public.wishlist_shares enable row level security;
revoke all on public.wishlist_shares from anon, authenticated;
grant select (user_id, display_name, created_by, created_at, expires_at, revoked_at) on public.wishlist_shares to authenticated;
drop policy if exists "wishlist_shares: read own" on public.wishlist_shares;
create policy "wishlist_shares: read own" on public.wishlist_shares
  for select to authenticated using ((select auth.uid()) = user_id);

create table if not exists public.wishlist_reservations (
  wishlist_item_id uuid primary key references public.wishlist_items(id) on delete cascade,
  user_id          uuid not null references public.wishlist_shares(user_id) on delete cascade,
  -- Lets the browser that said "Je l'offre" take it back ; nothing else.
  undo_hash        text not null check (undo_hash ~ '^[0-9a-f]{64}$'),
  reserved_at      timestamptz not null default now()
);
comment on table public.wishlist_reservations is
  'Items a relative will offer. Never readable by the reader (surprise). Service role only.';
create index if not exists wishlist_reservations_user_id_idx on public.wishlist_reservations (user_id);

alter table public.wishlist_reservations enable row level security;
-- No policy : anon and authenticated never see a row.
revoke all on public.wishlist_reservations from anon, authenticated;

-- ── Create or replace the link ─────────────────────────────────
-- The server checks who is asking (the parent's consent link, or the
-- reader's session) ; the database checks that this reader may be
-- shared that way. A new token cuts the old link, reservations stay.
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
  elsif p.age_band is distinct from '15_plus' or p.heard_from is null or p.sharing_locked then
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
      or (new.age_band = '15_plus' and not new.sharing_locked)
    );
  return null;
end;
$$;
revoke execute on function public.revoke_disallowed_wishlist_share() from public, anon, authenticated;

drop trigger if exists profiles_revoke_disallowed_wishlist_share on public.profiles;
create trigger profiles_revoke_disallowed_wishlist_share
  after update of age_band, parent_consent_at, sharing_locked on public.profiles
  for each row execute function public.revoke_disallowed_wishlist_share();

-- ── The shared page ────────────────────────────────────────────
-- Only what the family needs : a first name and the wished items. No
-- email, age, library or reading history. Null when the link is unknown,
-- revoked or expired.
create or replace function public.get_shared_wishlist(p_token_hash text)
returns jsonb
language sql
stable
security invoker
set search_path = public
as $$
  select jsonb_build_object(
    'display_name', s.display_name,
    'expires_at', s.expires_at,
    'items', coalesce((
      select jsonb_agg(jsonb_build_object(
          'id', w.id,
          'title', m.title,
          'cover_url', coalesce(v.cover_url, m.cover_url),
          'volume_number', w.volume_number,
          'priority', w.priority,
          -- The price the reader typed, else the French edition's price.
          'price_eur', coalesce(w.target_price, v.price_eur),
          'reserved', r.wishlist_item_id is not null
        ) order by (w.priority = 'high') desc, m.title, w.volume_number nulls last)
      from public.wishlist_items w
      join public.mangas m on m.id = w.manga_id
      left join lateral (
        select vv.price_eur, vv.cover_url from public.volumes vv
        where vv.manga_id = w.manga_id and vv.volume_number = w.volume_number and vv.edition = 'standard'
        limit 1
      ) v on true
      left join public.wishlist_reservations r on r.wishlist_item_id = w.id
      where w.user_id = s.user_id
    ), '[]'::jsonb)
  )
  from public.wishlist_shares s
  where s.token_hash = p_token_hash and s.revoked_at is null and s.expires_at > now();
$$;

-- "Je l'offre" : atomic, first one wins. 'reserved', 'taken' or 'not_found'.
create or replace function public.reserve_wishlist_item(p_token_hash text, p_item_id uuid, p_undo_hash text)
returns text
language plpgsql
security invoker
set search_path = public
as $$
declare v_user uuid;
begin
  select user_id into v_user from public.wishlist_shares
  where token_hash = p_token_hash and revoked_at is null and expires_at > now();
  if v_user is null
     or not exists (select 1 from public.wishlist_items where id = p_item_id and user_id = v_user) then
    return 'not_found';
  end if;
  insert into public.wishlist_reservations (wishlist_item_id, user_id, undo_hash)
  values (p_item_id, v_user, p_undo_hash)
  on conflict (wishlist_item_id) do nothing;
  return case when found then 'reserved' else 'taken' end;
end;
$$;

-- Taking it back : only the browser holding the undo secret.
create or replace function public.release_wishlist_item(p_token_hash text, p_item_id uuid, p_undo_hash text)
returns boolean
language plpgsql
security invoker
set search_path = public
as $$
begin
  delete from public.wishlist_reservations r
  using public.wishlist_shares s
  where r.wishlist_item_id = p_item_id
    and r.undo_hash = p_undo_hash
    and s.user_id = r.user_id
    and s.token_hash = p_token_hash and s.revoked_at is null and s.expires_at > now();
  return found;
end;
$$;

revoke execute on function public.upsert_wishlist_share(uuid, text, text, boolean, timestamptz) from public, anon, authenticated;
revoke execute on function public.get_shared_wishlist(text) from public, anon, authenticated;
revoke execute on function public.reserve_wishlist_item(text, uuid, text) from public, anon, authenticated;
revoke execute on function public.release_wishlist_item(text, uuid, text) from public, anon, authenticated;
grant execute on function public.upsert_wishlist_share(uuid, text, text, boolean, timestamptz) to service_role;
grant execute on function public.get_shared_wishlist(text) to service_role;
grant execute on function public.reserve_wishlist_item(text, uuid, text) to service_role;
grant execute on function public.release_wishlist_item(text, uuid, text) to service_role;
