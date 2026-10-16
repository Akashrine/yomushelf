-- ============================================================
-- Demo collection — fictional data for public screenshots. LOCAL ONLY.
-- Requires seeds/top_50_fr.sql. Dates are relative to today so the
-- 12-month chart is always full.
--
-- Login : demo@yomushelf.local / demo-yomushelf
-- ============================================================

do $$
declare
  v_user  uuid := '00000000-0000-4000-a000-00000000d3e0';
  v_month date := date_trunc('month', current_date)::date;
begin
  -- ── Demo account ─────────────────────────────────────────
  insert into auth.users (
    id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
    confirmation_token, recovery_token, email_change, email_change_token_new
  ) values (
    v_user, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
    'demo@yomushelf.local', extensions.crypt('demo-yomushelf', extensions.gen_salt('bf')), now(),
    '{"provider":"email","providers":["email"]}', '{"username":"Yuki"}',
    now() - interval '1 year', now(), '', '', '', ''
  ) on conflict (id) do nothing;

  insert into auth.identities (
    id, provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at
  ) values (
    gen_random_uuid(), v_user::text, v_user,
    jsonb_build_object('sub', v_user::text, 'email', 'demo@yomushelf.local', 'email_verified', true),
    'email', now(), now(), now()
  ) on conflict do nothing;

  update public.profiles
  set username = 'Yuki', onboarding_completed = true
  where id = v_user;

  -- Re-runnable : start from a clean collection
  delete from public.wishlist_items where user_id = v_user;
  delete from public.user_collections where user_id = v_user;

  -- ── Volumes and readings ─────────────────────────────────
  -- months_ago / read_months_ago are counted from the current month.
  -- acq null = origin not specified. at_home = false : read, then given back.
  create temp table demo_volumes (
    title text, vol_from int, vol_to int, months_ago int, day int,
    price numeric, acq public.acquisition_type, read_months_ago int, at_home boolean
  ) on commit drop;

  insert into demo_volumes values
    -- One Piece : the long run, Christmas gift in December
    ('One Piece',                    1,  4, 11,  8, 7.20, 'bought',   10, true),
    ('One Piece',                    5,  6, 10, 24, 7.20, 'gift',      9, true),
    ('One Piece',                    7, 10,  7, 14, 7.20, 'bought',    5, true),
    ('One Piece',                   11, 12,  4,  3, 7.20, 'bought',    2, true),
    ('One Piece',                   13, 14,  1, 18, 7.20, 'bought',   null, true),
    -- Spy × Family : birthday gift
    ('Spy x Family',                 1,  3, 10,  5, 6.95, 'bought',    9, true),
    ('Spy x Family',                 4,  6,  6, 12, 6.95, 'gift',      4, true),
    ('Spy x Family',                 7,  7,  2,  9, 6.95, 'bought',    1, true),
    ('Spy x Family',                 8,  9,  2,  9, 6.95, 'bought',   null, true),
    -- Dr. Stone : bought steadily, reading lags behind
    ('Dr. Stone',                    1,  2,  9, 20, 6.99, 'bought',    8, true),
    ('Dr. Stone',                    3,  4,  6, 20, 6.99, 'bought',    3, true),
    ('Dr. Stone',                    5,  6,  3, 15, 6.99, 'bought',   null, true),
    ('Dr. Stone',                    7,  8,  0,  2, 6.99, 'bought',   null, true),
    -- Frieren : started as a gift, tome 5 in progress
    ('Frieren',  1,  3, 10, 24, 7.65, 'gift',      7, true),
    ('Frieren',  4,  4,  1, 25, 7.65, 'bought',    0, true),
    ('Frieren',  5,  5,  1, 25, 7.65, 'bought',   null, true),
    -- Mashle
    ('Mashle',                       1,  3,  8, 11, 6.99, 'bought',    7, true),
    -- Blue Lock : 1-4 borrowed from a friend and given back, then bought the next ones
    ('Blue Lock',                    1,  4,  5,  6, null, 'borrowed',  4, false),
    ('Blue Lock',                    5,  5,  1,  8, 7.20, 'bought',   null, true),
    ('Blue Lock',                    6,  6,  1,  8, null, 'bought',   null, true),
    -- Dragon Ball : found on the shelf, origin and date not specified
    ('Dragon Ball',                  1,  2, null, null, null, null,   null, true);

  -- Series rows first : readings of volumes no longer at home need them.
  insert into public.user_collections (user_id, manga_id, first_added_at)
  select v_user, m.id, min(
    case when d.months_ago is null then now()
    else ((v_month - make_interval(months => d.months_ago))::date + (d.day - 1))::timestamptz end
  )
  from demo_volumes d join public.mangas m on m.title = d.title
  group by m.id;

  insert into public.user_volumes (
    user_id, manga_id, volume_number, price_eur, acquisition_type, acquired_at
  )
  select
    v_user, m.id, n, d.price, d.acq,
    case when d.months_ago is null then null else least(
      (v_month - make_interval(months => d.months_ago))::date + (d.day - 1),
      current_date
    ) end
  from demo_volumes d
  join public.mangas m on m.title = d.title
  cross join lateral generate_series(d.vol_from, d.vol_to) as n
  where d.at_home;

  insert into public.user_readings (user_id, manga_id, volume_number, status, finished_on)
  select
    v_user, m.id, n, 'read',
    least(
      (v_month - make_interval(months => d.read_months_ago))::date + (d.day + 6 - 1),
      current_date
    )
  from demo_volumes d
  join public.mangas m on m.title = d.title
  cross join lateral generate_series(d.vol_from, d.vol_to) as n
  where d.read_months_ago is not null;

  -- In progress right now
  insert into public.user_readings (user_id, manga_id, volume_number, status)
  select v_user, m.id, 5, 'reading'
  from public.mangas m where m.title = 'Frieren';

  -- ── Wishlist ─────────────────────────────────────────────
  insert into public.wishlist_items (user_id, manga_id, volume_number, target_price)
  select v_user, m.id, w.vol, w.price
  from (values
    ('One Piece',                   15, 7.20),
    ('Dr. Stone',                    9, 7.29),
    ('Frieren',  6, 7.65),
    ('Mashle',                       4, 6.99)
  ) as w(title, vol, price)
  join public.mangas m on m.title = w.title;
end;
$$;
