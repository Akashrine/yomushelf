-- ============================================================
-- Christmas list, under 15 : the child asks, the parent shares.
-- * wishlist_parent_links : the link emailed to the parent when the
--   child taps "Envoyer ma liste à ma famille". It opens /famille/<token>,
--   where the parent creates, renews or stops the family link. One per
--   child ; a new email replaces the previous link. Token stored hashed.
-- Emails to the parent share the consent email budget
-- (claim_consent_email : 1 per minute, 5 per day per child, 3 per day
-- per address).
-- Rollback : supabase/rollbacks/20261022000300_wishlist_parent_links_down.sql
-- ============================================================

create table if not exists public.wishlist_parent_links (
  user_id    uuid primary key references public.profiles(id) on delete cascade,
  token_hash text not null unique check (token_hash ~ '^[0-9a-f]{64}$'),
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);
comment on table public.wishlist_parent_links is
  'Link emailed to a parent to manage their child''s family wishlist link. Token stored hashed. Service role only.';

alter table public.wishlist_parent_links enable row level security;
-- No policy : anon and authenticated never see a row.
revoke all on public.wishlist_parent_links from anon, authenticated;
