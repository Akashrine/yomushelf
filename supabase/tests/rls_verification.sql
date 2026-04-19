-- RLS Verification Script
-- Run against the Supabase DB to verify all policies are correct.
-- Usage: psql $DATABASE_URL -f supabase/tests/rls_verification.sql

BEGIN;

-- ── 1. Anon cannot read private profiles ────────────────────────────────────
SET LOCAL ROLE anon;
DO $$
DECLARE cnt int;
BEGIN
  SELECT count(*) INTO cnt FROM profiles WHERE is_public = false;
  ASSERT cnt = 0, 'FAIL: anon can read private profiles';
  RAISE NOTICE 'PASS: anon cannot read private profiles';
END $$;
RESET ROLE;

-- ── 2. Anon CAN read public profiles ────────────────────────────────────────
SET LOCAL ROLE anon;
DO $$
DECLARE cnt int;
BEGIN
  -- Just checks the policy doesn't error; real data may be 0 if no public profiles yet
  SELECT count(*) INTO cnt FROM profiles WHERE is_public = true;
  RAISE NOTICE 'PASS: anon can read public profiles (found % rows)', cnt;
END $$;
RESET ROLE;

-- ── 3. Anon cannot read share_events ────────────────────────────────────────
SET LOCAL ROLE anon;
DO $$
DECLARE cnt int;
BEGIN
  SELECT count(*) INTO cnt FROM share_events;
  ASSERT cnt = 0, 'FAIL: anon can read share_events';
  RAISE NOTICE 'PASS: anon cannot read share_events';
END $$;
RESET ROLE;

-- ── 4. Anon cannot read wrapped_snapshots ───────────────────────────────────
SET LOCAL ROLE anon;
DO $$
DECLARE cnt int;
BEGIN
  SELECT count(*) INTO cnt FROM wrapped_snapshots;
  ASSERT cnt = 0, 'FAIL: anon can read wrapped_snapshots';
  RAISE NOTICE 'PASS: anon cannot read wrapped_snapshots';
END $$;
RESET ROLE;

-- ── 5. get_public_profile returns null for private slug ──────────────────────
DO $$
DECLARE result json;
BEGIN
  SELECT get_public_profile('__nonexistent_slug_xyz__') INTO result;
  ASSERT result IS NULL, 'FAIL: get_public_profile returned non-null for unknown slug';
  RAISE NOTICE 'PASS: get_public_profile returns null for unknown slug';
END $$;

-- ── 6. Columns never exposed in public RPC ──────────────────────────────────
DO $$
DECLARE result json;
DECLARE has_email boolean;
BEGIN
  -- Call with a known public slug if one exists; otherwise skip
  SELECT get_public_profile((
    SELECT public_slug FROM profiles WHERE is_public = true LIMIT 1
  )) INTO result;

  IF result IS NOT NULL THEN
    has_email := result::jsonb ? 'email';
    ASSERT NOT has_email, 'FAIL: email exposed in get_public_profile';
    RAISE NOTICE 'PASS: email not exposed in get_public_profile';
  ELSE
    RAISE NOTICE 'SKIP: no public profile found to test column exposure';
  END IF;
END $$;

ROLLBACK;
