-- ============================================================
-- Collection value : one row per owned volume (price, acquisition, reading)
-- + wishlist. Rollback : supabase/rollbacks/20261015000000_collection_value_down.sql
--
-- user_volumes becomes the source of truth. user_collections.owned_volumes
-- and last_read_volume are kept in sync by trigger so existing readers
-- (library grid, wrapped, public profile, OG images) keep working untouched.
-- ============================================================

-- ─────────────────────────────────────────
-- 1. Enums
-- ─────────────────────────────────────────
create type public.acquisition_type as enum ('bought', 'gift', 'borrowed', 'other');
create type public.volume_read_status as enum ('unread', 'reading', 'read');
create type public.wishlist_priority as enum ('high', 'low');

-- ─────────────────────────────────────────
-- 2. user_volumes
-- ─────────────────────────────────────────
create table public.user_volumes (
  id                uuid                      primary key default gen_random_uuid(),
  user_id           uuid                      not null,
  manga_id          uuid                      not null,
  volume_number     integer                   not null check (volume_number > 0),
  -- Shop price of the volume, also for gifts: value is not what it cost.
  price_eur         numeric(6,2)              check (price_eur is null or price_eur >= 0),
  acquisition_type  public.acquisition_type   not null default 'bought',
  acquired_at       date                      not null default current_date,
  read_status       public.volume_read_status not null default 'unread',
  read_at           date,
  created_at        timestamptz               not null default now(),
  updated_at        timestamptz               not null default now(),

  constraint user_volumes_unique unique (user_id, manga_id, volume_number),
  -- Direct FK so PostgREST can embed mangas(...) from user_volumes.
  constraint user_volumes_manga_id_fkey
    foreign key (manga_id) references public.mangas(id) on delete cascade,
  constraint user_volumes_collection_fkey
    foreign key (user_id, manga_id)
    references public.user_collections (user_id, manga_id)
    on delete cascade
);

create index user_volumes_user_id_idx on public.user_volumes (user_id);

create trigger user_volumes_set_updated_at
  before update on public.user_volumes
  for each row execute function public.set_updated_at();

alter table public.user_volumes enable row level security;

create policy "user_volumes: read own"
  on public.user_volumes for select
  using (auth.uid() = user_id);

create policy "user_volumes: insert own"
  on public.user_volumes for insert
  with check (auth.uid() = user_id);

create policy "user_volumes: update own"
  on public.user_volumes for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "user_volumes: delete own"
  on public.user_volumes for delete
  using (auth.uid() = user_id);

-- ─────────────────────────────────────────
-- 3. Backfill from existing arrays (before sync triggers exist)
-- ─────────────────────────────────────────
insert into public.user_volumes (
  user_id, manga_id, volume_number, acquired_at, read_status, created_at
)
select
  uc.user_id,
  uc.manga_id,
  v.volume_number,
  uc.first_added_at::date,
  case
    when uc.last_read_volume is not null and v.volume_number <= uc.last_read_volume
      then 'read'::public.volume_read_status
    else 'unread'::public.volume_read_status
  end,
  uc.first_added_at
from public.user_collections uc
cross join lateral unnest(uc.owned_volumes) as v(volume_number)
where v.volume_number > 0
on conflict (user_id, manga_id, volume_number) do nothing;

-- ─────────────────────────────────────────
-- 4. wishlist_items
-- ─────────────────────────────────────────
create table public.wishlist_items (
  id             uuid                      primary key default gen_random_uuid(),
  user_id        uuid                      not null references public.profiles(id) on delete cascade,
  manga_id       uuid                      not null references public.mangas(id) on delete cascade,
  volume_number  integer                   check (volume_number is null or volume_number > 0),
  target_price   numeric(6,2)              check (target_price is null or target_price >= 0),
  priority       public.wishlist_priority  not null default 'low',
  created_at     timestamptz               not null default now(),

  constraint wishlist_items_unique unique nulls not distinct (user_id, manga_id, volume_number)
);

create index wishlist_items_user_id_idx on public.wishlist_items (user_id);

alter table public.wishlist_items enable row level security;

create policy "wishlist_items: read own"
  on public.wishlist_items for select
  using (auth.uid() = user_id);

create policy "wishlist_items: insert own"
  on public.wishlist_items for insert
  with check (auth.uid() = user_id);

create policy "wishlist_items: update own"
  on public.wishlist_items for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "wishlist_items: delete own"
  on public.wishlist_items for delete
  using (auth.uid() = user_id);

-- ─────────────────────────────────────────
-- 5. Sync triggers (security invoker : RLS still applies)
-- ─────────────────────────────────────────

-- Make sure the parent series row exists before a volume is inserted.
create or replace function public.ensure_user_collection()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  insert into public.user_collections (user_id, manga_id)
  values (new.user_id, new.manga_id)
  on conflict (user_id, manga_id) do nothing;
  return new;
end;
$$;

create trigger user_volumes_ensure_collection
  before insert on public.user_volumes
  for each row execute function public.ensure_user_collection();

-- Recompute the legacy array + pointer for one series.
create or replace function public.refresh_user_collection(p_user_id uuid, p_manga_id uuid)
returns void
language plpgsql
set search_path = public
as $$
begin
  update public.user_collections uc
  set
    owned_volumes = coalesce((
      select array_agg(uv.volume_number order by uv.volume_number)
      from public.user_volumes uv
      where uv.user_id = p_user_id and uv.manga_id = p_manga_id
        and uv.acquisition_type <> 'borrowed'
    ), '{}'),
    last_read_volume = (
      select max(uv.volume_number)
      from public.user_volumes uv
      where uv.user_id = p_user_id and uv.manga_id = p_manga_id
        and uv.read_status = 'read'
    ),
    status = case
      when uc.status = 'not_started' and exists (
        select 1 from public.user_volumes uv
        where uv.user_id = p_user_id and uv.manga_id = p_manga_id
          and uv.read_status in ('reading', 'read')
      ) then 'reading'::public.collection_status
      else uc.status
    end
  where uc.user_id = p_user_id and uc.manga_id = p_manga_id;
end;
$$;

create or replace function public.sync_user_collection()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  -- Skip when fired by the FK cascade of a deleted series.
  if pg_trigger_depth() > 1 then
    return null;
  end if;

  if tg_op in ('UPDATE', 'DELETE') then
    perform public.refresh_user_collection(old.user_id, old.manga_id);
  end if;

  if tg_op in ('INSERT', 'UPDATE') then
    if tg_op = 'INSERT' or old.manga_id <> new.manga_id then
      perform public.refresh_user_collection(new.user_id, new.manga_id);
    end if;

    -- A volume that just arrived is no longer wished for.
    delete from public.wishlist_items wi
    where wi.user_id = new.user_id
      and wi.manga_id = new.manga_id
      and wi.volume_number = new.volume_number;
  end if;

  return null;
end;
$$;

create trigger user_volumes_sync_collection
  after insert or update or delete on public.user_volumes
  for each row execute function public.sync_user_collection();

-- ─────────────────────────────────────────
-- 6. get_user_stats : fix RLS bypass, read from user_volumes
-- Was security definer with a caller-supplied user id : any signed-in
-- user could read anyone's stats. Now security invoker, so RLS scopes it.
-- total_budget_eur = what was actually paid (known prices of bought volumes).
-- ─────────────────────────────────────────
create or replace function public.get_user_stats(p_user_id uuid)
returns table (
  total_series        bigint,
  total_volumes_owned bigint,
  total_budget_eur    numeric,
  volumes_read        bigint
)
language sql
stable
security invoker
set search_path = public
as $$
  select
    (select count(*) from public.user_collections uc where uc.user_id = p_user_id),
    count(*) filter (where uv.acquisition_type <> 'borrowed'),
    coalesce(sum(uv.price_eur) filter (where uv.acquisition_type = 'bought'), 0),
    count(*) filter (where uv.read_status = 'read')
  from public.user_volumes uv
  where uv.user_id = p_user_id;
$$;
