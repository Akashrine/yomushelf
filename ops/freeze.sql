-- Write freeze for the switch-over window (docs/publication.md).
-- While it is on, every write to a table of the public schema is refused
-- unless it comes from an administration session (a role member of
-- postgres : psql, db push), or concerns the test accounts listed in
-- ops_freeze_allow.
-- It covers what the app's maintenance page cannot : direct calls to the
-- Supabase API with the public key or an existing session, sign-ups
-- (their profile insert fails, so the whole sign-up is rolled back), old
-- deployments, the service role used through the API.
-- Run it again after the migrations : new tables get the guard too.
-- Remove with ops/unfreeze.sql.

create table if not exists public.ops_freeze_allow (email text primary key);
alter table public.ops_freeze_allow enable row level security;
revoke all on public.ops_freeze_allow from anon, authenticated;

create or replace function public.ops_freeze_guard()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  row_data jsonb := to_jsonb(coalesce(new, old));
  owner_id text;
begin
  -- administration sessions : psql as postgres, and `supabase db push`, which
  -- logs in as a temporary role member of postgres (cli_login_postgres).
  -- The API (authenticator) and Auth (supabase_auth_admin) roles are not.
  if pg_has_role(session_user, 'postgres', 'member') then
    return coalesce(new, old);
  end if;
  -- rows of an allowed test account (by user id, or by email for profiles)
  owner_id := coalesce(row_data->>'user_id', row_data->>'created_by',
                       case when tg_table_name = 'profiles' then row_data->>'id' end);
  if exists (
    select 1 from auth.users u join public.ops_freeze_allow a on lower(a.email) = lower(u.email)
    where u.id::text = owner_id
  ) or (tg_table_name = 'profiles' and exists (
    select 1 from public.ops_freeze_allow a where lower(a.email) = lower(row_data->>'email')
  )) then
    return coalesce(new, old);
  end if;
  raise exception 'Yomushelf est en maintenance : écriture refusée (%).', tg_table_name
    using errcode = 'P0001';
end;
$$;

do $$
declare t record;
begin
  for t in
    select c.relname from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind = 'r' and c.relname <> 'ops_freeze_allow'
  loop
    execute format('drop trigger if exists ops_freeze on public.%I', t.relname);
    execute format('create trigger ops_freeze before insert or update or delete on public.%I
                    for each row execute function public.ops_freeze_guard()', t.relname);
  end loop;
end $$;
