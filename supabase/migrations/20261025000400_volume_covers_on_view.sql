-- ============================================================
-- Volume covers filled when a series is viewed, not only at night : the
-- nightly job runs out of time when Google Books answers 503s, and a
-- series a reader opens should not wait for its turn.
-- volume_covers_checked_at : last time a viewed series asked Google
-- Books, so one series is asked at most every 6 hours whatever the
-- number of views. Written by the service role only.
-- Rollback : alter table public.mangas drop column volume_covers_checked_at;
-- ============================================================
alter table public.mangas add column if not exists volume_covers_checked_at timestamptz;
