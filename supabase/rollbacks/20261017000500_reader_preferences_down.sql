-- Rollback of 20261017000500_reader_preferences.sql
-- Lossy : "J'ai aimé", set-aside suggestions and declared tastes are deleted.
revoke select (liked_genres, avoided_genres, discovery_scope), update (liked_genres, avoided_genres, discovery_scope) on public.profiles from authenticated;
alter table public.profiles drop constraint if exists profiles_declared_genres_check;
alter table public.profiles drop column if exists liked_genres, drop column if exists avoided_genres, drop column if exists discovery_scope;
drop table if exists public.discovery_dismissals;
alter table public.user_collections drop column if exists liked;
