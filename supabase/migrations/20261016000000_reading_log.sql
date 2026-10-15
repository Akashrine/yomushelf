-- ============================================================
-- Reading log : reading is independent from ownership.
-- Rollback : supabase/rollbacks/20261016000000_reading_log_down.sql
--
-- A volume read at the library, or borrowed then returned, stays read.
-- user_readings holds one row per (user, series, volume) : re-saving the
-- same reading, a double tap or an undo never creates a second row.
--
-- Unknown stays unknown : finished_on is null when the reading was
-- declared after the fact, and acquisition_type / acquired_at are null
-- for volumes imported from the legacy arrays.
-- ============================================================

-- ─────────────────────────────────────────
-- 1. user_readings
-- ─────────────────────────────────────────
create type public.reading_status as enum ('reading', 'read');

create table public.user_readings (
  id             uuid                   primary key default gen_random_uuid(),
  user_id        uuid                   not null,
  manga_id       uuid                   not null,
  volume_number  integer                not null check (volume_number > 0),
  status         public.reading_status  not null,
  -- Only known when the reader declared "Je l'ai fini !" in the app.
  finished_on    date,
  created_at     timestamptz            not null default now(),
  updated_at     timestamptz            not null default now(),

  constraint user_readings_unique unique (user_id, manga_id, volume_number),
  constraint user_readings_finished_only_when_read
    check (status = 'read' or finished_on is null),
  constraint user_readings_manga_id_fkey
    foreign key (manga_id) references public.mangas(id) on delete cascade,
  -- Removing a whole series (a mistake) removes its readings.
  -- Removing a volume does not.
  constraint user_readings_collection_fkey
    foreign key (user_id, manga_id)
    references public.user_collections (user_id, manga_id)
    on delete cascade
);

create index user_readings_user_id_idx on public.user_readings (user_id);

create trigger user_readings_set_updated_at
  before update on public.user_readings
  for each row execute function public.set_updated_at();

alter table public.user_readings enable row level security;

create policy "user_readings: read own"
  on public.user_readings for select
  using (auth.uid() = user_id);

create policy "user_readings: insert own"
  on public.user_readings for insert
  with check (auth.uid() = user_id);

create policy "user_readings: update own"
  on public.user_readings for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "user_readings: delete own"
  on public.user_readings for delete
  using (auth.uid() = user_id);

create trigger user_readings_ensure_collection
  before insert on public.user_readings
  for each row execute function public.ensure_user_collection();

-- ─────────────────────────────────────────
-- 2. Sync : legacy array + pointer from both tables
-- Redefined BEFORE any data change : the updates below fire these
-- triggers, and the 20261015 versions read the columns dropped here.
-- ─────────────────────────────────────────
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
        and uv.acquisition_type is distinct from 'borrowed'
    ), '{}'),
    last_read_volume = (
      select max(ur.volume_number)
      from public.user_readings ur
      where ur.user_id = p_user_id and ur.manga_id = p_manga_id
        and ur.status = 'read'
    ),
    status = case
      when uc.status = 'not_started' and exists (
        select 1 from public.user_readings ur
        where ur.user_id = p_user_id and ur.manga_id = p_manga_id
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
    if tg_table_name = 'user_volumes' then
      delete from public.wishlist_items wi
      where wi.user_id = new.user_id
        and wi.manga_id = new.manga_id
        and wi.volume_number = new.volume_number;
    end if;
  end if;

  return null;
end;
$$;

create trigger user_readings_sync_collection
  after insert or update or delete on public.user_readings
  for each row execute function public.sync_user_collection();

-- ─────────────────────────────────────────
-- 3. Move reading state out of user_volumes
-- ─────────────────────────────────────────
-- The legacy pointer meant "read up to volume N", owned or not : every
-- volume 1..N becomes a reading with an unknown date. Pointers are copied
-- first, because inserting readings fires the sync trigger, which
-- recomputes them from what is already in user_readings.
-- Legacy series statuses (caught_up, completed) are NOT converted : they
-- may predate later acquisitions. They are reviewed series by series.
-- Explicit drop below : no reliance on how the migration tool wraps transactions.
create temp table legacy_pointers as
select user_id, manga_id, last_read_volume
from public.user_collections
where last_read_volume > 0;

-- Per-volume states first : they may carry a known reading date.
insert into public.user_readings (user_id, manga_id, volume_number, status, finished_on, created_at)
select
  uv.user_id,
  uv.manga_id,
  uv.volume_number,
  uv.read_status::text::public.reading_status,
  case when uv.read_status = 'read' then uv.read_at end,
  uv.created_at
from public.user_volumes uv
where uv.read_status in ('reading', 'read');

-- Then every volume up to the legacy pointer, owned or not, date unknown.
insert into public.user_readings (user_id, manga_id, volume_number, status, finished_on)
select lp.user_id, lp.manga_id, n, 'read', null
from legacy_pointers lp
cross join lateral generate_series(1, lp.last_read_volume) as n
on conflict (user_id, manga_id, volume_number) do nothing;

drop table legacy_pointers;

alter table public.user_volumes drop column read_status;
alter table public.user_volumes drop column read_at;
drop type public.volume_read_status;

-- ─────────────────────────────────────────
-- 4. Unknown acquisition and acquisition date
-- ─────────────────────────────────────────
alter table public.user_volumes
  alter column acquisition_type drop not null,
  alter column acquisition_type drop default,
  alter column acquired_at drop not null,
  alter column acquired_at drop default;

comment on column public.user_volumes.acquisition_type is 'null = not specified';
comment on column public.user_volumes.acquired_at is 'null = unknown';

-- Rows imported from the legacy arrays by 20261015000000 were stamped
-- 'bought' and dated with the series' first_added_at : both were guesses.
-- That backfill copied first_added_at into created_at, app inserts never do.
update public.user_volumes uv
set acquisition_type = null, acquired_at = null
from public.user_collections uc
where uc.user_id = uv.user_id
  and uc.manga_id = uv.manga_id
  and uv.created_at = uc.first_added_at
  and uv.acquisition_type = 'bought'
  and uv.price_eur is null;

-- ─────────────────────────────────────────
-- 5. get_user_stats : readings come from user_readings
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
    (select count(*) from public.user_collections uc
      where uc.user_id = p_user_id),
    (select count(*) from public.user_volumes uv
      where uv.user_id = p_user_id and uv.acquisition_type is distinct from 'borrowed'),
    (select coalesce(sum(uv.price_eur), 0) from public.user_volumes uv
      where uv.user_id = p_user_id and uv.acquisition_type = 'bought'),
    (select count(*) from public.user_readings ur
      where ur.user_id = p_user_id and ur.status = 'read')
  where p_user_id = (select auth.uid());
$$;

-- ─────────────────────────────────────────
-- 6. The app hides sharing controls when the profile is locked.
-- Read only : the 20261014000000 hotfix grants no UPDATE on it.
-- ─────────────────────────────────────────
grant select (sharing_locked) on public.profiles to authenticated;
