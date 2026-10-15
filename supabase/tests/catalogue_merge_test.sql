-- Test of catalogue_merge (20261017000600). LOCAL / TEST DATABASES ONLY.
-- Runs inside a transaction that is rolled back : nothing persists.
-- Every line "Tn ... | t" must read t. Usage : see docs/tests.md
\set ON_ERROR_STOP 1
begin;
select id as a from auth.users where email = 'e2e@yomushelf.local' \gset
select id as b from auth.users where email = 'other@yomushelf.local' \gset

insert into public.mangas (title, status, curated, is_top_50_fr) values ('Série Test Fusion', 'ongoing', true, false) returning id as k \gset
insert into public.mangas (title, status, external_ids, cover_url) values ('Serie test fusion', 'ongoing', '{"mal_id": 999001}', 'https://example.test/c.jpg') returning id as d \gset

-- Reader A has rows on BOTH series.
insert into public.user_volumes (user_id, manga_id, volume_number, price_eur, acquisition_type, acquired_at) values
  (:'a', :'k', 1, 7.00, 'bought', null),
  (:'a', :'d', 1, null, 'bought', '2026-01-01'),   -- same volume, compatible : fills the date
  (:'a', :'d', 2, 6.00, 'bought', null),           -- only on drop : moves
  (:'a', :'k', 4, 6.00, 'bought', null),
  (:'a', :'d', 4, 5.00, 'bought', null);           -- same volume, different price : CONFLICT
insert into public.user_readings (user_id, manga_id, volume_number, status, finished_on) values
  (:'a', :'k', 1, 'reading', null),
  (:'a', :'d', 1, 'read', '2026-02-01');
insert into public.wishlist_items (user_id, manga_id, volume_number, target_price, priority) values
  (:'a', :'k', 3, 7.00, 'low'),
  (:'a', :'d', 3, null, 'low');
update public.user_collections set liked = true where user_id = :'a' and manga_id = :'k';

-- Reader B only has the drop series.
insert into public.user_volumes (user_id, manga_id, volume_number, price_eur, acquisition_type) values (:'b', :'d', 1, 9.00, 'gift');
insert into public.user_readings (user_id, manga_id, volume_number, status) values (:'b', :'d', 1, 'read');
insert into public.wishlist_items (user_id, manga_id, volume_number) values (:'b', :'d', 2);

select count(*) as b_rows_before from (
  select id from public.user_volumes where user_id = :'b' union all
  select id from public.user_readings where user_id = :'b' union all
  select id from public.wishlist_items where user_id = :'b') x \gset

-- Candidates
select 'T1 pair detected' as test,
  exists (select 1 from public.catalogue_duplicate_candidates() c where c.keep_id = :'k' and c.drop_id = :'d') as ok;

-- Dry run : one contradiction, nothing changed
create temp table report1 as select * from public.catalogue_merge(:'k', :'d');
select 'T2 dry run reports exactly one contradiction (A, tome 4)' as test,
  (select count(*) from report1 where kind = 'conflict') = 1
  and exists (select 1 from report1 where kind = 'conflict' and user_id = :'a' and volume_number = 4) as ok;
select 'T3 dry run changes nothing' as test,
  (select count(*) from public.user_volumes where manga_id = :'d') = 4 as ok;

-- Apply is refused while the contradiction stands. The DO blocks below
-- raise (and stop the script) if a check fails.
select set_config('test.k', :'k', true), set_config('test.d', :'d', true) \gset
do $$
declare blocked boolean := false;
begin
  begin
    perform public.catalogue_merge(current_setting('test.k')::uuid, current_setting('test.d')::uuid, true);
  exception when others then blocked := true;
  end;
  if not blocked then raise exception 'T4 FAILED : merge applied despite a contradiction'; end if;
end $$;
select 'T4 apply blocked by the contradiction' as test, (select count(*) from public.user_volumes where manga_id = :'d') = 4 as ok;

-- The reader resolves it by hand (keeps the 6 € price), then apply
delete from public.user_volumes where user_id = :'a' and manga_id = :'d' and volume_number = 4;
create temp table report2 as select * from public.catalogue_merge(:'k', :'d', true);
select 'T5 apply succeeded' as test, exists (select 1 from report2 where kind = 'applied') as ok;

select 'T6 A keeps volumes 1, 2, 4 on the kept series' as test,
  array(select volume_number from public.user_volumes where user_id = :'a' and manga_id = :'k' order by 1) = array[1,2,4] as ok;
select 'T7 A volume 1 : price kept, empty date filled' as test,
  (price_eur = 7.00 and acquired_at = '2026-01-01') as ok
  from public.user_volumes where user_id = :'a' and manga_id = :'k' and volume_number = 1;
select 'T8 A volume 4 : resolved price kept' as test, price_eur = 6.00 as ok
  from public.user_volumes where user_id = :'a' and manga_id = :'k' and volume_number = 4;
select 'T9 A reading : read wins, known date kept' as test, (status = 'read' and finished_on = '2026-02-01') as ok
  from public.user_readings where user_id = :'a' and manga_id = :'k' and volume_number = 1;
select 'T10 A wish : one row, known price kept' as test, (count(*) = 1 and max(target_price) = 7.00) as ok
  from public.wishlist_items where user_id = :'a' and manga_id = :'k' and volume_number = 3;
select 'T11 A liked kept' as test, liked as ok from public.user_collections where user_id = :'a' and manga_id = :'k';

select 'T12 B data intact and moved (gift, 9 €, read, wish)' as test,
  exists (select 1 from public.user_volumes where user_id = :'b' and manga_id = :'k' and volume_number = 1 and price_eur = 9.00 and acquisition_type = 'gift')
  and exists (select 1 from public.user_readings where user_id = :'b' and manga_id = :'k' and volume_number = 1 and status = 'read')
  and exists (select 1 from public.wishlist_items where user_id = :'b' and manga_id = :'k' and volume_number = 2) as ok;
select 'T13 B row count unchanged (no rows mixed between readers)' as test,
  (select count(*) from (
    select id from public.user_volumes where user_id = :'b' union all
    select id from public.user_readings where user_id = :'b' union all
    select id from public.wishlist_items where user_id = :'b') x) = :b_rows_before as ok;
select 'T14 B does not get A volumes' as test,
  not exists (select 1 from public.user_volumes where user_id = :'b' and manga_id = :'k' and volume_number in (2, 4)) as ok;

select 'T15 nothing left on the dropped series' as test,
  (select count(*) from public.user_volumes where manga_id = :'d') + (select count(*) from public.user_readings where manga_id = :'d')
  + (select count(*) from public.wishlist_items where manga_id = :'d') + (select count(*) from public.user_collections where manga_id = :'d') = 0 as ok;
select 'T16 dropped series kept, marked merged' as test, merged_into = :'k'::uuid as ok from public.mangas where id = :'d';
select 'T17 kept series : cover filled, mal id and old title kept' as test,
  (cover_url = 'https://example.test/c.jpg' and external_ids->>'mal_id' = '999001' and 'serie test fusion' = any(aliases)) as ok
  from public.mangas where id = :'k';
select 'T18 replay says already merged and changes nothing' as test,
  (select kind from public.catalogue_merge(:'k', :'d', true) limit 1) = 'already_merged' as ok;
select 'T19 search no longer offers the dropped series' as test,
  not exists (select 1 from public.search_mangas('serie test fusion', 20) s where s.id = :'d') as ok;
select 'T20 legacy summary recomputed for A' as test, owned_volumes = array[1,2,4] as ok
  from public.user_collections where user_id = :'a' and manga_id = :'k';

-- Readers cannot run it
do $$
declare denied boolean := false;
begin
  set local role authenticated;
  begin
    perform public.catalogue_merge(current_setting('test.k')::uuid, current_setting('test.d')::uuid, false);
  exception when insufficient_privilege then denied := true;
  end;
  reset role;
  if not denied then raise exception 'T21 FAILED : a reader can run catalogue_merge'; end if;
end $$;
select 'T21 readers cannot run the merge' as test, true as ok;
rollback;
