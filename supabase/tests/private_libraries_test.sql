-- Test of 20261017000400_private_libraries (LOCAL / TEST DATABASES ONLY).
-- Runs inside a transaction that is rolled back : nothing persists.
-- Usage : see docs/tests.md
\set ON_ERROR_STOP 1
begin;
select id as a from auth.users where email = 'e2e@yomushelf.local' \gset

select (select count(*) from public.user_collections) + (select count(*) from public.user_volumes) + (select count(*) from public.user_readings) as rows_before \gset
-- Back to the old state, with one public profile.
\i /tmp/m400_down.sql
update public.profiles set is_public = true, public_slug = 'test-public' where id = :'a';

-- Forward migration.
\i /tmp/m400.sql

select 'T1 profile now private' as test, (not is_public) as ok from public.profiles where id = :'a';
select 'T2 previous state saved' as test, (public_slug = 'test-public') as ok from public.profile_visibility_backup where user_id = :'a';
select 'T3 no public profile left' as test, (count(*) = 0) as ok from public.profiles where is_public;
select 'T4 collections untouched' as test,
  ((select count(*) from public.user_collections) + (select count(*) from public.user_volumes) + (select count(*) from public.user_readings)) = :rows_before as ok;

-- T6 to T8 must each fail with an error (anon call, client update, constraint).
\set ON_ERROR_STOP 0
savepoint s;
set local role anon;
select * from public.get_public_profile('test-public');
rollback to s;
savepoint s;
set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', :'a', 'role', 'authenticated')::text, true);
update public.profiles set is_public = true where id = :'a';
rollback to s;
savepoint s;
reset role;
update public.profiles set is_public = true where id = :'a';
rollback to s;
\set ON_ERROR_STOP 1
reset role;
select 'T5 default is private' as test, (column_default = 'false') as ok
from information_schema.columns where table_name = 'profiles' and column_name = 'is_public';
rollback;
