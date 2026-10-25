-- Test of 20261025000500_youth_selection_shelf (LOCAL / TEST DATABASES ONLY).
-- Needs the accounts of e2e/reset.sql (kid = under 15 with consent, e2e = 15 and over).
-- Runs inside a transaction that is rolled back : nothing persists.
\set ON_ERROR_STOP 1
begin;
select id as kid from auth.users where email = 'kid@yomushelf.local' \gset
select id as adult from auth.users where email = 'e2e@yomushelf.local' \gset
select id as naruto from public.mangas where title = 'Naruto' and curated and created_by is null and merged_into is null limit 1 \gset
select id as chainsaw from public.mangas where title = 'Chainsaw Man' and curated and created_by is null and merged_into is null limit 1 \gset
select id as fifteen from public.mangas where audience_age_source = 'cnlj' and audience_age_scope = 'series' and audience_min_age = 15 and created_by is null and merged_into is null limit 1 \gset
select id as volonly from public.mangas where audience_age_source = 'cnlj' and audience_age_scope = 'volume' and created_by is null and merged_into is null limit 1 \gset

create function pg_temp.may(p_user uuid, p_manga uuid) returns boolean language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', p_user, 'role', 'authenticated')::text, true);
  return public.reader_may_have_series(p_manga);
end $$;

select 'T1 15+ may have any series' as test, pg_temp.may(:'adult', :'chainsaw') as ok;
select 'T2 under 15 may have a series verified for the whole series' as test, pg_temp.may(:'kid', :'naruto') as ok;
select 'T3 under 15 may not have a series without a verified age' as test, not pg_temp.may(:'kid', :'chainsaw') as ok;
select 'T4 under 15 may not have a series verified for 15' as test, not pg_temp.may(:'kid', :'fifteen') as ok;
select 'T5 under 15 may not have a series verified for some volumes only' as test, not pg_temp.may(:'kid', :'volonly') as ok;

insert into public.user_collections (user_id, manga_id) values (:'kid', :'chainsaw');
select 'T6 under 15 keeps a series already on the shelf' as test, pg_temp.may(:'kid', :'chainsaw') as ok;
delete from public.user_collections where user_id = :'kid' and manga_id = :'chainsaw';

insert into public.mangas (title, status, created_by) values ('Ma fiche à moi (test)', 'ongoing', :'kid') returning id as own \gset
select 'T7 under 15 may have their own personal series' as test, pg_temp.may(:'kid', :'own') as ok;

update public.profiles set age_band = null where id = :'adult';
select 'T8 a reader who has not answered the age question is restricted' as test, not pg_temp.may(:'adult', :'chainsaw') as ok;
update public.profiles set age_band = '15_plus' where id = :'adult';

-- The policies : direct writes with the reader's own session.
create function pg_temp.attempt(q text) returns text language plpgsql as $$
begin execute q; return 'ok'; exception when others then return sqlstate; end $$;
grant execute on function pg_temp.attempt(text) to authenticated;

set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', :'kid', 'role', 'authenticated')::text, true);
select 'T9 under 15 cannot put a refused series on the shelf (collection)' as test,
  pg_temp.attempt(format('insert into public.user_collections (user_id, manga_id) values (%L, %L)', :'kid', :'chainsaw')) = '42501' as ok;
select 'T10 ... nor a volume of it' as test,
  pg_temp.attempt(format('insert into public.user_volumes (user_id, manga_id, volume_number) values (%L, %L, 1)', :'kid', :'chainsaw')) = '42501' as ok;
select 'T11 ... nor a reading of it' as test,
  pg_temp.attempt(format('insert into public.user_readings (user_id, manga_id, volume_number, status) values (%L, %L, 1, %L)', :'kid', :'chainsaw', 'read')) = '42501' as ok;
select 'T12 under 15 can add a volume of an allowed series' as test,
  pg_temp.attempt(format('insert into public.user_volumes (user_id, manga_id, volume_number) values (%L, %L, 1)', :'kid', :'naruto')) = 'ok' as ok;
select 'T13 ... which brings it onto the shelf' as test,
  (select count(*) = 1 from public.user_collections where user_id = :'kid' and manga_id = :'naruto') as ok;

select set_config('request.jwt.claims', json_build_object('sub', :'adult', 'role', 'authenticated')::text, true);
select 'T14 a reader of 15 and over is not limited' as test,
  pg_temp.attempt(format('insert into public.user_volumes (user_id, manga_id, volume_number) values (%L, %L, 1)', :'adult', :'chainsaw')) = 'ok' as ok;
reset role;
rollback;
