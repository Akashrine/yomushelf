-- Production-like data in the OLD format (before 20261015), for the
-- switch-over rehearsal. LOCAL ONLY. Mirrors the production shape seen
-- read-only on 2026-10-16 : one reader, 9 series, ~113 volumes as arrays,
-- reading progress as last_read_volume, no public profile.
do $$
declare
  v_id uuid := '00000000-0000-4000-a000-00000000aaaa';
  m record;
  n int := 0;
begin
  insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token, recovery_token, email_change, email_change_token_new)
  values (v_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'prodlike@yomushelf.local',
    extensions.crypt('e2e-yomushelf', extensions.gen_salt('bf')), now(),
    '{"provider":"email","providers":["email"]}', '{"username":"Prodlike"}', now(), now(), '', '', '', '')
  on conflict (id) do nothing;
  insert into auth.identities (id, provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  values (gen_random_uuid(), v_id::text, v_id,
    jsonb_build_object('sub', v_id::text, 'email', 'prodlike@yomushelf.local', 'email_verified', true), 'email', now(), now(), now())
  on conflict do nothing;
  update public.profiles set username = 'Prodlike', onboarding_completed = true where id = v_id;

  -- 9 series from the top 50, 1 to 25 volumes each, some with gaps.
  for m in select id, top_50_rank from public.mangas where is_top_50_fr order by top_50_rank limit 9 loop
    n := n + 1;
    insert into public.user_collections (user_id, manga_id, owned_volumes, last_read_volume, status)
    values (
      v_id, m.id,
      array(select g from generate_series(1, 4 + n * 2) g where g % 7 <> 0),
      case when n % 3 = 0 then 0 else n + 1 end,
      case when n % 3 = 0 then 'not_started' else 'reading' end::public.collection_status
    )
    on conflict (user_id, manga_id) do nothing;
  end loop;
end $$;
