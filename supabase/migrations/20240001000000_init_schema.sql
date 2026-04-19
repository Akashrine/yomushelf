-- ============================================================
-- 001 : Initial schema — Yomushelf
-- ============================================================

-- Enable pgcrypto for uuid generation (available by default on Supabase)
create extension if not exists "pgcrypto";

-- ─────────────────────────────────────────
-- profiles
-- ─────────────────────────────────────────
create table public.profiles (
  id                    uuid        primary key references auth.users(id) on delete cascade,
  username              text        unique,
  email                 text        not null unique,
  created_at            timestamptz not null default now(),
  onboarding_completed  boolean     not null default false,
  avatar_initials       text        not null default ''
);

comment on table public.profiles is 'One row per authenticated user, linked to auth.users.';

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, avatar_initials)
  values (
    new.id,
    new.email,
    upper(left(coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)), 2))
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ─────────────────────────────────────────
-- mangas
-- ─────────────────────────────────────────
create type public.manga_status as enum ('ongoing', 'completed', 'paused');
create type public.volume_edition as enum ('standard', 'double', 'perfect', 'collector');

create table public.mangas (
  id              uuid          primary key default gen_random_uuid(),
  title           text          not null,
  author          text,
  publisher_fr    text,
  total_volumes   integer,
  status          public.manga_status not null default 'ongoing',
  avg_price_eur   numeric(5,2)  not null default 7.50,
  genre_primary   text,
  cover_url       text,
  external_ids    jsonb         not null default '{}',
  is_top_50_fr    boolean       not null default false,
  top_50_rank     integer,
  created_at      timestamptz   not null default now(),
  updated_at      timestamptz   not null default now(),

  constraint mangas_top_50_rank_check check (
    (is_top_50_fr = false and top_50_rank is null) or
    (is_top_50_fr = true and top_50_rank between 1 and 50)
  )
);

create index mangas_is_top_50_fr_idx   on public.mangas (is_top_50_fr);
create index mangas_top_50_rank_idx    on public.mangas (top_50_rank) where is_top_50_fr = true;
create index mangas_title_idx          on public.mangas using gin (to_tsvector('french', title));
create index mangas_status_idx         on public.mangas (status);

-- Auto-update updated_at
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger mangas_set_updated_at
  before update on public.mangas
  for each row execute function public.set_updated_at();

-- ─────────────────────────────────────────
-- volumes
-- ─────────────────────────────────────────
create table public.volumes (
  id               uuid         primary key default gen_random_uuid(),
  manga_id         uuid         not null references public.mangas(id) on delete cascade,
  volume_number    integer      not null,
  isbn_13          text         unique,
  release_date_fr  date,
  price_eur        numeric(5,2),
  cover_url        text,
  edition          public.volume_edition not null default 'standard',
  created_at       timestamptz  not null default now(),

  constraint volumes_unique_per_manga unique (manga_id, volume_number, edition)
);

create index volumes_manga_id_idx   on public.volumes (manga_id);
create index volumes_isbn_13_idx    on public.volumes (isbn_13) where isbn_13 is not null;

-- ─────────────────────────────────────────
-- user_collections
-- ─────────────────────────────────────────
create type public.collection_status as enum (
  'not_started', 'reading', 'caught_up', 'completed', 'dropped'
);

create table public.user_collections (
  id               uuid         primary key default gen_random_uuid(),
  user_id          uuid         not null references public.profiles(id) on delete cascade,
  manga_id         uuid         not null references public.mangas(id) on delete cascade,
  owned_volumes    integer[]    not null default '{}',
  last_read_volume integer,
  status           public.collection_status not null default 'not_started',
  first_added_at   timestamptz  not null default now(),
  updated_at       timestamptz  not null default now(),

  constraint user_collections_unique_series unique (user_id, manga_id)
);

create index user_collections_user_id_idx  on public.user_collections (user_id);
create index user_collections_manga_id_idx on public.user_collections (manga_id);

create trigger user_collections_set_updated_at
  before update on public.user_collections
  for each row execute function public.set_updated_at();

-- ─────────────────────────────────────────
-- waitlist_entries
-- ─────────────────────────────────────────
create type public.waitlist_source as enum (
  'landing_hero', 'landing_footer', 'tiktok_campaign', 'other'
);

create table public.waitlist_entries (
  id          uuid         primary key default gen_random_uuid(),
  email       text         not null unique,
  source      public.waitlist_source not null default 'landing_hero',
  created_at  timestamptz  not null default now(),
  confirmed   boolean      not null default false
);

create index waitlist_entries_confirmed_idx on public.waitlist_entries (confirmed);

-- ─────────────────────────────────────────
-- analytics_events
-- ─────────────────────────────────────────
create table public.analytics_events (
  id          uuid         primary key default gen_random_uuid(),
  user_id     uuid         references public.profiles(id) on delete set null,
  event_name  text         not null,
  properties  jsonb        not null default '{}',
  created_at  timestamptz  not null default now()
);

create index analytics_events_user_id_idx    on public.analytics_events (user_id) where user_id is not null;
create index analytics_events_event_name_idx on public.analytics_events (event_name);
create index analytics_events_created_at_idx on public.analytics_events (created_at desc);
