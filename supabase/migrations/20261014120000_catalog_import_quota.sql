-- ============================================================
-- Per-account quota for catalogue imports and ISBN lookups.
-- Upstash is not configured in production, so the limit lives in Postgres.
-- Additive only : no existing object is changed.
-- Rollback : supabase/rollbacks/20261014120000_catalog_import_quota_down.sql
-- ============================================================

create table public.catalog_import_events (
  id          bigint generated always as identity primary key,
  user_id     uuid        not null references auth.users(id) on delete cascade,
  kind        text        not null check (kind in ('import', 'isbn_lookup')),
  created_at  timestamptz not null default now()
);

create index catalog_import_events_user_kind_idx
  on public.catalog_import_events (user_id, kind, created_at desc);

-- Server-side only : RLS on, no policy, no client privilege.
alter table public.catalog_import_events enable row level security;
revoke all on public.catalog_import_events from anon, authenticated;

-- Atomically checks the quota and records the attempt.
-- Returns false when the account already reached p_limit within the window.
create or replace function public.consume_import_quota(
  p_user_id        uuid,
  p_kind           text,
  p_limit          integer,
  p_window_seconds integer
) returns boolean
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_count integer;
begin
  -- Serialise concurrent attempts of the same account and kind.
  perform pg_advisory_xact_lock(hashtext(p_user_id::text || ':' || p_kind));

  select count(*) into v_count
  from public.catalog_import_events
  where user_id = p_user_id
    and kind = p_kind
    and created_at > now() - make_interval(secs => p_window_seconds);

  if v_count >= p_limit then
    return false;
  end if;

  insert into public.catalog_import_events (user_id, kind) values (p_user_id, p_kind);

  -- Keep the table small : nothing older than two days is ever needed.
  delete from public.catalog_import_events
  where user_id = p_user_id and created_at < now() - interval '2 days';

  return true;
end;
$$;

revoke execute on function public.consume_import_quota(uuid, text, integer, integer) from public, anon, authenticated;
grant execute on function public.consume_import_quota(uuid, text, integer, integer) to service_role;
