-- Upper bound on volume numbers, same as MAX_VOLUME in
-- src/lib/collection/schema.ts. Without it, one row with volume_number
-- 2000000000 (a typo, or a direct API call with the public key) makes the
-- series page draw one tile per volume and crash, and lets an account fill
-- the database. No row above 500 existed in production on 2026-10-16.
alter table public.user_volumes
  add constraint user_volumes_volume_number_max check (volume_number <= 500);
alter table public.user_readings
  add constraint user_readings_volume_number_max check (volume_number <= 500);
alter table public.wishlist_items
  add constraint wishlist_items_volume_number_max check (volume_number is null or volume_number <= 500);
