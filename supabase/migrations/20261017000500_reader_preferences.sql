-- ============================================================
-- What the reader says, kept apart from what they own or read.
-- * user_collections.liked : "J'ai aimé" (true), "Pas pour moi" (false),
--   nothing said (null).
-- * discovery_dismissals : suggestions the reader set aside. Never
--   proposed again until the reader brings them back.
-- * profiles.liked_genres / avoided_genres : tastes declared by the
--   reader (used to start discovery without history, and to leave out
--   genres they do not want).
-- Rollback : supabase/rollbacks/20261017000500_reader_preferences_down.sql
-- ============================================================

alter table public.user_collections add column if not exists liked boolean;

create table if not exists public.discovery_dismissals (
  user_id    uuid not null references public.profiles(id) on delete cascade,
  manga_id   uuid not null references public.mangas(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, manga_id)
);
alter table public.discovery_dismissals enable row level security;

do $$ begin
  create policy "discovery_dismissals: read own" on public.discovery_dismissals
    for select using (auth.uid() = user_id);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "discovery_dismissals: insert own" on public.discovery_dismissals
    for insert with check (auth.uid() = user_id and exists (select 1 from public.mangas m where m.id = manga_id));
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "discovery_dismissals: delete own" on public.discovery_dismissals
    for delete using (auth.uid() = user_id);
exception when duplicate_object then null; end $$;
revoke all on public.discovery_dismissals from anon;
grant select, insert, delete on public.discovery_dismissals to authenticated;

-- Same list as GENRES in src/lib/discovery/suggest.ts
alter table public.profiles
  add column if not exists liked_genres text[] not null default '{}',
  add column if not exists avoided_genres text[] not null default '{}';
do $$ begin
  alter table public.profiles add constraint profiles_declared_genres_check check (
    liked_genres <@ array['action','aventure','comedie','drame','fantasy','science-fiction','mystere','horreur',
                          'romance','sport','tranche-de-vie','surnaturel','historique','cuisine','psychologique']
    and avoided_genres <@ array['action','aventure','comedie','drame','fantasy','science-fiction','mystere','horreur',
                          'romance','sport','tranche-de-vie','surnaturel','historique','cuisine','psychologique']
    and not (liked_genres && avoided_genres)
  );
exception when duplicate_object then null; end $$;
-- profiles uses column-level grants : readers read and write only these new ones.
grant select (liked_genres, avoided_genres), update (liked_genres, avoided_genres) on public.profiles to authenticated;
