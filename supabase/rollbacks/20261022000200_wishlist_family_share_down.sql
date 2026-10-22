-- Rollback of 20261022000200_wishlist_family_share.sql
drop trigger if exists profiles_revoke_disallowed_wishlist_share on public.profiles;
drop function if exists public.revoke_disallowed_wishlist_share();
drop function if exists public.release_wishlist_item(text, uuid, text);
drop function if exists public.reserve_wishlist_item(text, uuid, text);
drop function if exists public.get_shared_wishlist(text);
drop function if exists public.upsert_wishlist_share(uuid, text, text, boolean, timestamptz);
drop table if exists public.wishlist_reservations;
drop table if exists public.wishlist_shares;
