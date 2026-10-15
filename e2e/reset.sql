-- Test accounts for the end-to-end journeys. LOCAL / TEST DATABASES ONLY.
-- e2e@yomushelf.local starts empty at every run ; other@yomushelf.local
-- is a second reader used to check that private data stays private.
do $$
declare
  v_ids uuid[] := array['00000000-0000-4000-a000-0000000000e1', '00000000-0000-4000-a000-0000000000e2']::uuid[];
  v_mails text[] := array['e2e@yomushelf.local', 'other@yomushelf.local'];
  i int;
begin
  for i in 1..2 loop
    insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token, recovery_token, email_change, email_change_token_new)
    values (v_ids[i], '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', v_mails[i],
      extensions.crypt('e2e-yomushelf', extensions.gen_salt('bf')), now(),
      '{"provider":"email","providers":["email"]}', '{"username":"Testeur"}', now(), now(), '', '', '', '')
    on conflict (id) do nothing;
    insert into auth.identities (id, provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    values (gen_random_uuid(), v_ids[i]::text, v_ids[i],
      jsonb_build_object('sub', v_ids[i]::text, 'email', v_mails[i], 'email_verified', true), 'email', now(), now(), now())
    on conflict do nothing;
  end loop;
  update public.profiles set username = 'Testeur', onboarding_completed = true where id = v_ids[1];
  update public.profiles set username = 'Lecteur2', onboarding_completed = true where id = v_ids[2];
  delete from public.wishlist_items where user_id = any(v_ids);
  delete from public.user_collections where user_id = any(v_ids);
  delete from public.mangas where created_by = any(v_ids);
  delete from public.catalog_import_events where user_id = any(v_ids);
end $$;
