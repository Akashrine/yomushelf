-- Rollback of 20261016000000_reading_log.sql
-- Lossy on purpose : readings of volumes no longer owned are dropped
-- (user_volumes cannot hold a reading without a volume), unknown
-- acquisitions become 'other' and unknown dates become the row's
-- creation date.

drop trigger if exists user_readings_sync_collection on public.user_readings;

create type public.volume_read_status as enum ('unread', 'reading', 'read');

update public.user_volumes set acquisition_type = 'other' where acquisition_type is null;
update public.user_volumes set acquired_at = created_at::date where acquired_at is null;

alter table public.user_volumes
  alter column acquisition_type set default 'bought',
  alter column acquisition_type set not null,
  alter column acquired_at set default current_date,
  alter column acquired_at set not null,
  add column read_status public.volume_read_status not null default 'unread',
  add column read_at date;

update public.user_volumes uv
set read_status = ur.status::text::public.volume_read_status,
    read_at = ur.finished_on
from public.user_readings ur
where ur.user_id = uv.user_id
  and ur.manga_id = uv.manga_id
  and ur.volume_number = uv.volume_number;

drop table public.user_readings;
drop type public.reading_status;

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

    delete from public.wishlist_items wi
    where wi.user_id = new.user_id
      and wi.manga_id = new.manga_id
      and wi.volume_number = new.volume_number;
  end if;

  return null;
end;
$$;

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
      where uc.user_id = p_user_id and p_user_id = (select auth.uid())),
    count(*) filter (where uv.acquisition_type <> 'borrowed'),
    coalesce(sum(uv.price_eur) filter (where uv.acquisition_type = 'bought'), 0),
    count(*) filter (where uv.read_status = 'read')
  from public.user_volumes uv
  where uv.user_id = p_user_id
    and p_user_id = (select auth.uid());
$$;
