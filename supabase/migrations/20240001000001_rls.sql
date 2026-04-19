-- ============================================================
-- 002 : Row Level Security policies
-- ============================================================

-- ─────────────────────────────────────────
-- profiles
-- ─────────────────────────────────────────
alter table public.profiles enable row level security;

create policy "profiles: read own"
  on public.profiles for select
  using (auth.uid() = id);

create policy "profiles: update own"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- ─────────────────────────────────────────
-- mangas — public read, service role write
-- ─────────────────────────────────────────
alter table public.mangas enable row level security;

create policy "mangas: read public"
  on public.mangas for select
  using (true);

-- INSERT / UPDATE / DELETE restricted to service role (no policy = anon/authed blocked)

-- ─────────────────────────────────────────
-- volumes — public read, service role write
-- ─────────────────────────────────────────
alter table public.volumes enable row level security;

create policy "volumes: read public"
  on public.volumes for select
  using (true);

-- ─────────────────────────────────────────
-- user_collections — CRUD own rows only
-- ─────────────────────────────────────────
alter table public.user_collections enable row level security;

create policy "user_collections: read own"
  on public.user_collections for select
  using (auth.uid() = user_id);

create policy "user_collections: insert own"
  on public.user_collections for insert
  with check (auth.uid() = user_id);

create policy "user_collections: update own"
  on public.user_collections for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "user_collections: delete own"
  on public.user_collections for delete
  using (auth.uid() = user_id);

-- ─────────────────────────────────────────
-- waitlist_entries — anonymous insert, service role read
-- ─────────────────────────────────────────
alter table public.waitlist_entries enable row level security;

create policy "waitlist_entries: public insert"
  on public.waitlist_entries for insert
  with check (true);

-- SELECT / UPDATE / DELETE restricted to service role

-- ─────────────────────────────────────────
-- analytics_events — insert self, service role read
-- ─────────────────────────────────────────
alter table public.analytics_events enable row level security;

create policy "analytics_events: insert own or anonymous"
  on public.analytics_events for insert
  with check (
    user_id is null or auth.uid() = user_id
  );

-- SELECT restricted to service role
