-- Rollback of 20261017000900_volume_number_bound.sql
alter table public.user_volumes drop constraint if exists user_volumes_volume_number_max;
alter table public.user_readings drop constraint if exists user_readings_volume_number_max;
alter table public.wishlist_items drop constraint if exists wishlist_items_volume_number_max;
