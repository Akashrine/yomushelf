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

  -- ── Volumes ──────────────────────────────────────────────
  -- months_ago / read_months_ago are counted from the current month.
  create temp table demo_volumes (
    title text, vol_from int, vol_to int, months_ago int, day int,
    price numeric, acq public.acquisition_type, read_months_ago int
  ) on commit drop;

  insert into demo_volumes values
    -- One Piece : the long run, Christmas gift in December
    ('One Piece',                    1,  4, 11,  8, 7.20, 'bought',   10),
    ('One Piece',                    5,  6, 10, 24, 7.20, 'gift',      9),
    ('One Piece',                    7, 10,  7, 14, 7.20, 'bought',    5),
    ('One Piece',                   11, 12,  4,  3, 7.20, 'bought',    2),
    ('One Piece',                   13, 14,  1, 18, 7.20, 'bought',   null),
    -- Spy × Family : birthday gift
    ('Spy × Family',                 1,  3, 10,  5, 6.95, 'bought',    9),
    ('Spy × Family',                 4,  6,  6, 12, 6.95, 'gift',      4),
    ('Spy × Family',                 7,  7,  2,  9, 6.95, 'bought',    1),
    ('Spy × Family',                 8,  9,  2,  9, 6.95, 'bought',   null),
    -- Chainsaw Man : bought steadily, reading lags behind
    ('Chainsaw Man',                 1,  2,  9, 20, 7.29, 'bought',    8),
    ('Chainsaw Man',                 3,  4,  6, 20, 7.29, 'bought',    3),
    ('Chainsaw Man',                 5,  6,  3, 15, 7.29, 'bought',   null),
    ('Chainsaw Man',                 7,  8,  0,  2, 7.29, 'bought',   null),
    -- Frieren : started as a gift
    ('Frieren : Au-delà du voyage',  1,  3, 10, 24, 7.65, 'gift',      7),
    ('Frieren : Au-delà du voyage',  4,  4,  1, 25, 7.65, 'bought',    0),
    ('Frieren : Au-delà du voyage',  5,  5,  1, 25, 7.65, 'bought',   null),
    -- Kaiju No. 8
    ('Kaiju No. 8',                  1,  3,  8, 11, 7.20, 'bought',    7),
    -- Blue Lock : borrowed from a friend, then bought the next ones
    ('Blue Lock',                    1,  4,  5,  6, null, 'borrowed',  4),
    ('Blue Lock',                    5,  5,  1,  8, 7.20, 'bought',   null),
    ('Blue Lock',                    6,  6,  1,  8, null, 'bought',   null),
    -- Dragon Ball : just started, one price not typed yet
    ('Dragon Ball',                  1,  1,  0,  1, 6.90, 'bought',   null),
    ('Dragon Ball',                  2,  2,  0,  1, null, 'bought',   null);

  insert into public.user_volumes (
    user_id, manga_id, volume_number, price_eur, acquisition_type,
    acquired_at, read_status, read_at
  )
  select
    v_user,
    m.id,
    n,
    d.price,
    d.acq,
    least(
      (v_month - make_interval(months => d.months_ago))::date + (d.day - 1),
      current_date
    ),
    case when d.read_months_ago is null then 'unread' else 'read' end::public.volume_read_status,
    case when d.read_months_ago is null then null else
      least(
        (v_month - make_interval(months => d.read_months_ago))::date + (d.day + 6 - 1),
        current_date
      )
    end
  from demo_volumes d
  join public.mangas m on m.title = d.title
  cross join lateral generate_series(d.vol_from, d.vol_to) as n;

  update public.user_collections
  set first_added_at = sub.first_at
  from (
    select manga_id, min(acquired_at)::timestamptz as first_at
    from public.user_volumes where user_id = v_user group by manga_id
  ) sub
  where user_collections.user_id = v_user and user_collections.manga_id = sub.manga_id;

  -- ── Wishlist ─────────────────────────────────────────────
  insert into public.wishlist_items (user_id, manga_id, volume_number, target_price, priority)
  select v_user, m.id, w.vol, w.price, w.priority::public.wishlist_priority
  from (values
    ('One Piece',                   15, 7.20, 'high'),
    ('Chainsaw Man',                 9, 7.29, 'high'),
    ('Frieren : Au-delà du voyage',  6, 7.65, 'low'),
    ('Kaiju No. 8',                  4, 7.20, 'low')
  ) as w(title, vol, price, priority)
  join public.mangas m on m.title = w.title;
end;
$$;
