-- Test of 20261022000200_wishlist_family_share and 20261022000400_wishlist_shared_page
-- (LOCAL / TEST DATABASES ONLY, both applied).
-- Runs inside a transaction that is rolled back : nothing persists.
-- Usage : psql -f supabase/tests/wishlist_family_share_test.sql (migration applied)
\set ON_ERROR_STOP 1
\pset footer off
begin;
create temp table results (test text, ok boolean) on commit drop;
grant all on results to anon, authenticated;

-- Three readers : under 15 with a parent's yes, under 15 waiting, 15 and over.
insert into auth.users (id, email, aud, role) values
  ('00000000-0000-4000-8000-0000000000c1', 'kid@wl.test', 'authenticated', 'authenticated'),
  ('00000000-0000-4000-8000-0000000000c2', 'waiting@wl.test', 'authenticated', 'authenticated'),
  ('00000000-0000-4000-8000-0000000000c3', 'teen@wl.test', 'authenticated', 'authenticated');
update public.profiles set age_band = 'under_15', heard_from = 'parent', parent_consent_at = now() where id = '00000000-0000-4000-8000-0000000000c1';
update public.profiles set age_band = 'under_15', heard_from = 'parent' where id = '00000000-0000-4000-8000-0000000000c2';
update public.profiles set age_band = '15_plus', heard_from = 'ami' where id = '00000000-0000-4000-8000-0000000000c3';

-- Two wishes for the kid (one with a catalogue price), one for the teen.
insert into public.volumes (manga_id, volume_number, edition, price_eur)
select id, 1, 'standard', 7.20 from public.mangas where created_by is null and merged_into is null limit 1
on conflict (manga_id, volume_number, edition) do update set price_eur = 7.20
returning manga_id, volume_number \gset
insert into public.wishlist_items (id, user_id, manga_id, volume_number, priority) values
  ('00000000-0000-4000-8000-0000000000a1', '00000000-0000-4000-8000-0000000000c1', :'manga_id', :volume_number, 'high'),
  ('00000000-0000-4000-8000-0000000000a2', '00000000-0000-4000-8000-0000000000c1', :'manga_id', null, 'low'),
  ('00000000-0000-4000-8000-0000000000a3', '00000000-0000-4000-8000-0000000000c3', :'manga_id', :volume_number, 'low');

select encode(sha256('token-1'), 'hex') as h1, encode(sha256('token-2'), 'hex') as h2, encode(sha256('token-3'), 'hex') as h3,
       encode(sha256('undo-1'), 'hex') as u1, encode(sha256('undo-2'), 'hex') as u2 \gset

-- Who may create a link.
do $$ begin
  perform public.upsert_wishlist_share('00000000-0000-4000-8000-0000000000c1', repeat('a', 64), 'Léo', false, now() + interval '30 days');
  insert into results values ('T1 a child under 15 never shares himself', false);
exception when others then insert into results values ('T1 a child under 15 never shares himself', true);
end $$;
do $$ begin
  perform public.upsert_wishlist_share('00000000-0000-4000-8000-0000000000c2', repeat('b', 64), 'Max', true, now() + interval '30 days');
  insert into results values ('T2 no link without a parent''s consent', false);
exception when others then insert into results values ('T2 no link without a parent''s consent', true);
end $$;
do $$ begin
  perform public.upsert_wishlist_share('00000000-0000-4000-8000-0000000000c3', repeat('c', 64), 'Sam', true, now() + interval '30 days');
  insert into results values ('T3 parent route refused from 15', false);
exception when others then insert into results values ('T3 parent route refused from 15', true);
end $$;
do $$ begin
  perform public.upsert_wishlist_share('00000000-0000-4000-8000-0000000000c3', repeat('c', 64), 'Sam', false, now() + interval '2 years');
  insert into results values ('T4 expiry capped at one year', false);
exception when others then insert into results values ('T4 expiry capped at one year', true);
end $$;

select public.upsert_wishlist_share('00000000-0000-4000-8000-0000000000c1', :'h1', '  Léo  ', true, now() + interval '30 days');
select public.upsert_wishlist_share('00000000-0000-4000-8000-0000000000c3', :'h3', 'Sam', false, now() + interval '30 days');
insert into results select 'T5 parent and 15+ reader create a link', count(*) = 2 from public.wishlist_shares
where user_id in ('00000000-0000-4000-8000-0000000000c1', '00000000-0000-4000-8000-0000000000c3');

-- The shared page : first name and items only.
select public.get_shared_wishlist(:'h1') as page \gset
insert into results values
  ('T6 page shows the trimmed first name', (:'page'::jsonb ->> 'display_name') = 'Léo'),
  ('T7 page lists only this reader''s 2 wishes, high priority first',
     jsonb_array_length(:'page'::jsonb -> 'items') = 2 and (:'page'::jsonb -> 'items' -> 0 ->> 'id') = '00000000-0000-4000-8000-0000000000a1'),
  ('T8 catalogue price when none typed', (:'page'::jsonb -> 'items' -> 0 ->> 'price_eur') is not null),
  ('T9 nothing personal on the page',
     not (:'page'::jsonb ?| array['email', 'user_id', 'age_band']) and not (:'page'::jsonb -> 'items' -> 0 ?| array['user_id', 'manga_id'])),
  ('T10 unknown token gives nothing', public.get_shared_wishlist(repeat('f', 64)) is null);

-- "Je l'offre" : first one wins, only this reader's items. One statement
-- each : the page function sees the data as of the statement's start.
insert into results values ('T11 reserve', public.reserve_wishlist_item(:'h1', '00000000-0000-4000-8000-0000000000a1', :'u1') = 'reserved');
insert into results values ('T12 second relative sees it taken', public.reserve_wishlist_item(:'h1', '00000000-0000-4000-8000-0000000000a1', :'u2') = 'taken');
insert into results values ('T13 another reader''s item refused', public.reserve_wishlist_item(:'h1', '00000000-0000-4000-8000-0000000000a3', :'u1') = 'not_found');
insert into results values ('T14 page shows it reserved', (public.get_shared_wishlist(:'h1') -> 'items' -> 0 ->> 'reserved')::boolean);
insert into results values ('T15 wrong undo secret keeps it', public.release_wishlist_item(:'h1', '00000000-0000-4000-8000-0000000000a1', :'u2') = 'not_found');
insert into results values ('T16 own undo secret releases it', public.release_wishlist_item(:'h1', '00000000-0000-4000-8000-0000000000a1', :'u1') = 'released');
select public.reserve_wishlist_item(:'h1', '00000000-0000-4000-8000-0000000000a1', :'u1');
-- The page tells this browser what it offers, and nobody else.
insert into results values ('T32 the offering browser sees it as its own',
  (public.get_shared_wishlist(:'h1', :'u1') -> 'items' -> 0 ->> 'mine')::boolean);
insert into results values ('T33 another browser does not',
  not (public.get_shared_wishlist(:'h1', :'u2') -> 'items' -> 0 ->> 'mine')::boolean
  and not (public.get_shared_wishlist(:'h1') -> 'items' -> 0 ->> 'mine')::boolean);

-- The surprise : the reader sees their link's status, never the reservations.
set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', '00000000-0000-4000-8000-0000000000c1', 'role', 'authenticated')::text, true);
insert into results select 'T17 reader sees own link status', count(*) = 1 from public.wishlist_shares;
do $$ begin
  perform 1 from public.wishlist_reservations;
  insert into results values ('T18 reader never reads reservations', false);
exception when insufficient_privilege then insert into results values ('T18 reader never reads reservations', true);
end $$;
do $$ begin
  perform token_hash from public.wishlist_shares;
  insert into results values ('T19 reader never reads the token hash', false);
exception when insufficient_privilege then insert into results values ('T19 reader never reads the token hash', true);
end $$;
do $$ begin
  perform public.get_shared_wishlist(repeat('a', 64));
  insert into results values ('T20 functions closed to the reader', false);
exception when insufficient_privilege then insert into results values ('T20 functions closed to the reader', true);
end $$;
do $$ begin
  update public.wishlist_shares set expires_at = now() + interval '5 years';
  insert into results values ('T21 reader cannot extend the link', false);
exception when insufficient_privilege then insert into results values ('T21 reader cannot extend the link', true);
end $$;
reset role;
set local role anon;
do $$ begin
  perform public.reserve_wishlist_item(repeat('a', 64), gen_random_uuid(), repeat('a', 64));
  insert into results values ('T22 functions closed to anon', false);
exception when insufficient_privilege then insert into results values ('T22 functions closed to anon', true);
end $$;
reset role;

-- A new link cuts the old one and keeps the reservations.
select public.upsert_wishlist_share('00000000-0000-4000-8000-0000000000c1', :'h2', 'Léo', true, now() + interval '30 days');
insert into results values
  ('T23 old link dead after a new one', public.get_shared_wishlist(:'h1') is null),
  ('T24 reservations survive a new link', (public.get_shared_wishlist(:'h2') -> 'items' -> 0 ->> 'reserved')::boolean);

-- Revoked or expired : nothing to see, nothing to reserve.
update public.wishlist_shares set revoked_at = now() where user_id = '00000000-0000-4000-8000-0000000000c1';
insert into results values
  ('T25 revoked link gives nothing', public.get_shared_wishlist(:'h2') is null),
  ('T26 revoked link reserves nothing', public.reserve_wishlist_item(:'h2', '00000000-0000-4000-8000-0000000000a2', :'u1') = 'not_found');
update public.wishlist_shares set expires_at = now() - interval '1 second' where user_id = '00000000-0000-4000-8000-0000000000c3';
insert into results values ('T27 expired link gives nothing', public.get_shared_wishlist(:'h3') is null);

-- Limit per link : 40 actions per 10 minutes, then "busy".
update public.wishlist_shares set revoked_at = null, action_window_start = now(), action_count = 40 where user_id = '00000000-0000-4000-8000-0000000000c1';
insert into results values ('T34 busy link refuses to reserve', public.reserve_wishlist_item(:'h2', '00000000-0000-4000-8000-0000000000a2', :'u1') = 'busy');
insert into results values ('T35 busy link refuses to release', public.release_wishlist_item(:'h2', '00000000-0000-4000-8000-0000000000a1', :'u1') = 'busy');
update public.wishlist_shares set action_window_start = now() - interval '11 minutes' where user_id = '00000000-0000-4000-8000-0000000000c1';
insert into results values ('T36 limit resets after 10 minutes', public.reserve_wishlist_item(:'h2', '00000000-0000-4000-8000-0000000000a2', :'u1') = 'reserved');
update public.wishlist_shares set action_window_start = now(), action_count = 40 where user_id = '00000000-0000-4000-8000-0000000000c1';
select public.upsert_wishlist_share('00000000-0000-4000-8000-0000000000c1', :'h1', 'Léo', true, now() + interval '30 days');
insert into results select 'T37 a new link starts with a fresh limit', action_count = 0 and action_window_start is null from public.wishlist_shares where user_id = '00000000-0000-4000-8000-0000000000c1';
select public.upsert_wishlist_share('00000000-0000-4000-8000-0000000000c1', :'h2', 'Léo', true, now() + interval '30 days');
insert into results values ('T38 same browser tapping twice keeps it', public.reserve_wishlist_item(:'h2', '00000000-0000-4000-8000-0000000000a2', :'u1') = 'reserved');
insert into results values ('T39 another browser still sees it taken', public.reserve_wishlist_item(:'h2', '00000000-0000-4000-8000-0000000000a2', :'u2') = 'taken');

-- No longer allowed : the link stops by itself.
update public.wishlist_shares set revoked_at = null where user_id = '00000000-0000-4000-8000-0000000000c1';
update public.profiles set parent_consent_at = null where id = '00000000-0000-4000-8000-0000000000c1';
insert into results values ('T30 consent taken back revokes the link', public.get_shared_wishlist(:'h2') is null);
select public.upsert_wishlist_share('00000000-0000-4000-8000-0000000000c3', :'h3', 'Sam', false, now() + interval '30 days');
update public.profiles set age_band = 'under_15' where id = '00000000-0000-4000-8000-0000000000c3';
insert into results values ('T31 15+ link revoked when the age answer changes', public.get_shared_wishlist(:'h3') is null);

-- Removing a wish removes its reservation ; deleting the account removes all.
delete from public.wishlist_items where id = '00000000-0000-4000-8000-0000000000a1';
insert into results select 'T28 reservation follows the wish', count(*) = 0 from public.wishlist_reservations where wishlist_item_id = '00000000-0000-4000-8000-0000000000a1';
delete from auth.users where id = '00000000-0000-4000-8000-0000000000c1';
insert into results select 'T29 account deletion removes the link', count(*) = 0 from public.wishlist_shares where user_id = '00000000-0000-4000-8000-0000000000c1';

select test, case when ok then 'ok' else 'FAIL' end as result from results;
select count(*) filter (where not ok) as failures, count(*) as total from results;
rollback;
