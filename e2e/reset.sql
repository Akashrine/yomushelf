-- Test accounts for the end-to-end journeys. LOCAL / TEST DATABASES ONLY.
--   e2e@yomushelf.local    reader of 15 and over, empty library
--   other@yomushelf.local  second reader of 15 and over (privacy checks, teen of the family list)
--   kid@yomushelf.local    reader under 15 with a parent's consent (family list, youth restrictions)
-- All three have answered the age and source questions, so the app is open.
-- Everything they own is erased at every run. Password : e2e-yomushelf.
do $$
declare
  v_ids uuid[] := array['00000000-0000-4000-a000-0000000000e1', '00000000-0000-4000-a000-0000000000e2', '00000000-0000-4000-a000-0000000000e3']::uuid[];
  v_mails text[] := array['e2e@yomushelf.local', 'other@yomushelf.local', 'kid@yomushelf.local'];
  i int;
begin
  for i in 1..3 loop
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

  -- Wipe what the accounts own (dependent rows first).
  delete from public.wishlist_reservations where user_id = any(v_ids);
  delete from public.wishlist_shares where user_id = any(v_ids);
  delete from public.wishlist_parent_links where user_id = any(v_ids);
  delete from public.consent_email_sends where user_id = any(v_ids);
  delete from public.discovery_dismissals where user_id = any(v_ids);
  delete from public.wishlist_items where user_id = any(v_ids);
  delete from public.user_readings where user_id = any(v_ids);
  delete from public.user_volumes where user_id = any(v_ids);
  delete from public.user_collections where user_id = any(v_ids);
  delete from public.mangas where created_by = any(v_ids);
  delete from public.catalog_import_events where user_id = any(v_ids);
  delete from public.parental_consents where user_id = any(v_ids);

  -- Profiles : ready to use. Under 15, the consent is already given.
  update public.profiles set username = 'Testeur', onboarding_completed = true, age_band = '15_plus', age_band_set_at = now(),
    heard_from = 'ami', parent_consent_at = null, discovery_scope = 'all', liked_genres = '{}', avoided_genres = '{}' where id = v_ids[1];
  update public.profiles set username = 'Lecteur2', onboarding_completed = true, age_band = '15_plus', age_band_set_at = now(),
    heard_from = 'ami', parent_consent_at = null, discovery_scope = 'all', liked_genres = '{}', avoided_genres = '{}' where id = v_ids[2];
  update public.profiles set username = 'Petit', onboarding_completed = true, age_band = 'under_15', age_band_set_at = now(),
    heard_from = 'parent', parent_consent_at = now(), liked_genres = '{}', avoided_genres = '{}' where id = v_ids[3];
  insert into public.parental_consents (user_id, parent_email, token_hash, expires_at, sent_count, last_sent_at, confirmed_at)
  values (v_ids[3], 'parent.leo@yomushelf.local', encode(extensions.digest('e2e-parent-consent', 'sha256'), 'hex'),
    now() + interval '14 days', 1, now(), now());
end $$;
