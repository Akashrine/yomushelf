-- ============================================================
-- 003 : Phase 2 — Partage public, ShareEvent, WrappedSnapshot
-- ============================================================

-- ─────────────────────────────────────────
-- 1. Extension de profiles
-- ─────────────────────────────────────────
alter table public.profiles
  add column if not exists is_public     boolean  not null default false,
  add column if not exists bio           text     check (length(bio) <= 140),
  add column if not exists public_slug   text     unique;

create index if not exists profiles_public_slug_idx
  on public.profiles (public_slug)
  where public_slug is not null;

create index if not exists profiles_is_public_idx
  on public.profiles (is_public)
  where is_public = true;

-- Auto-génère public_slug depuis username ou email
create or replace function public.generate_public_slug(
  p_username text,
  p_email    text,
  p_id       uuid
) returns text
language plpgsql
as $$
declare
  base_slug text;
  candidate text;
  suffix    int := 0;
begin
  base_slug := regexp_replace(
    lower(coalesce(nullif(trim(p_username), ''), split_part(p_email, '@', 1))),
    '[^a-z0-9]', '-', 'g'
  );
  base_slug := trim(both '-' from base_slug);
  if base_slug = '' then
    base_slug := left(replace(p_id::text, '-', ''), 8);
  end if;

  candidate := base_slug;
  loop
    if not exists (
      select 1 from public.profiles
      where public_slug = candidate and id <> p_id
    ) then
      return candidate;
    end if;
    suffix := suffix + 1;
    candidate := base_slug || '-' || suffix::text;
  end loop;
end;
$$;

-- Trigger : sync public_slug sur insert/update username
create or replace function public.sync_public_slug()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.public_slug is null
     or (new.username is distinct from old.username and new.username is not null) then
    new.public_slug := public.generate_public_slug(new.username, new.email, new.id);
  end if;
  return new;
end;
$$;

create trigger profiles_sync_public_slug
  before insert or update of username, public_slug
  on public.profiles
  for each row execute function public.sync_public_slug();

-- Backfill slug pour profils existants
update public.profiles
set public_slug = public.generate_public_slug(username, email, id)
where public_slug is null;

-- ─────────────────────────────────────────
-- 2. Nouveaux types ENUM
-- ─────────────────────────────────────────
create type public.share_type as enum (
  'profile_link', 'collection_card', 'wrapped_card'
);

create type public.share_format as enum (
  'landscape', 'story', 'link'
);

create type public.share_platform as enum (
  'x', 'tiktok', 'instagram', 'whatsapp', 'discord', 'direct', 'copy'
);

-- ─────────────────────────────────────────
-- 3. Table share_events
-- ─────────────────────────────────────────
create table public.share_events (
  id               uuid                  primary key default gen_random_uuid(),
  user_id          uuid                  not null references public.profiles(id) on delete cascade,
  share_type       public.share_type     not null,
  format           public.share_format   not null,
  target_platform  public.share_platform,
  created_at       timestamptz           not null default now()
);

create index share_events_user_id_idx    on public.share_events (user_id);
create index share_events_created_at_idx on public.share_events (created_at desc);

-- ─────────────────────────────────────────
-- 4. Table wrapped_snapshots
-- ─────────────────────────────────────────
create table public.wrapped_snapshots (
  id                           uuid         primary key default gen_random_uuid(),
  user_id                      uuid         not null references public.profiles(id) on delete cascade,
  year                         integer      not null,
  total_volumes_added          integer      not null default 0,
  total_budget_spent           numeric(8,2) not null default 0,
  top_3_series                 jsonb        not null default '[]',
  top_genre                    text,
  delta_vs_previous_year_pct   numeric(6,2),
  generated_at                 timestamptz  not null default now(),

  constraint wrapped_snapshots_unique_year unique (user_id, year),
  constraint wrapped_snapshots_year_check  check (year >= 2020 and year <= 2100)
);

create index wrapped_snapshots_user_id_idx on public.wrapped_snapshots (user_id);

-- ─────────────────────────────────────────
-- 5. RLS
-- ─────────────────────────────────────────

-- profiles : lecture publique si is_public = true
create policy "profiles: read public"
  on public.profiles for select
  using (is_public = true);

-- share_events
alter table public.share_events enable row level security;

create policy "share_events: insert own"
  on public.share_events for insert
  with check (auth.uid() = user_id);

-- wrapped_snapshots
alter table public.wrapped_snapshots enable row level security;

create policy "wrapped_snapshots: read own"
  on public.wrapped_snapshots for select
  using (auth.uid() = user_id);

create policy "wrapped_snapshots: read public profile"
  on public.wrapped_snapshots for select
  using (
    exists (
      select 1 from public.profiles p
      where p.id = user_id and p.is_public = true
    )
  );

-- ─────────────────────────────────────────
-- 6. RPC get_public_profile(slug)
-- ─────────────────────────────────────────
create or replace function public.get_public_profile(p_slug text)
returns table (
  username         text,
  bio              text,
  avatar_initials  text,
  public_slug      text,
  is_public        boolean,
  member_since     timestamptz,
  total_series     bigint,
  total_volumes    bigint,
  volumes_read     bigint,
  top_covers       jsonb,
  highlights       jsonb
)
language sql
stable
security definer
set search_path = public
as $$
  select
    pr.username,
    pr.bio,
    pr.avatar_initials,
    pr.public_slug,
    pr.is_public,
    pr.created_at                                                        as member_since,
    count(distinct uc.manga_id)                                          as total_series,
    coalesce(sum(array_length(uc.owned_volumes, 1)), 0)                  as total_volumes,
    coalesce(sum(coalesce(uc.last_read_volume, 0)), 0)                   as volumes_read,
    (
      select coalesce(jsonb_agg(sub), '[]'::jsonb)
      from (
        select
          m.id::text  as manga_id,
          m.title,
          m.cover_url,
          array_length(uc2.owned_volumes, 1) as owned_count
        from public.user_collections uc2
        join public.mangas m on m.id = uc2.manga_id
        where uc2.user_id = pr.id
          and m.cover_url is not null
        order by array_length(uc2.owned_volumes, 1) desc nulls last
        limit 20
      ) sub
    )                                                                    as top_covers,
    (
      select jsonb_build_object(
        'most_volumes', (
          select jsonb_build_object(
            'title', m.title,
            'cover_url', m.cover_url,
            'owned', array_length(uc3.owned_volumes, 1)
          )
          from public.user_collections uc3
          join public.mangas m on m.id = uc3.manga_id
          where uc3.user_id = pr.id
          order by array_length(uc3.owned_volumes, 1) desc nulls last
          limit 1
        ),
        'completed_series', (
          select count(*) from public.user_collections uc4
          where uc4.user_id = pr.id and uc4.status = 'completed'
        ),
        'top_genre', (
          select m.genre_primary
          from public.user_collections uc5
          join public.mangas m on m.id = uc5.manga_id
          where uc5.user_id = pr.id and m.genre_primary is not null
          group by m.genre_primary
          order by count(*) desc
          limit 1
        )
      )
    )                                                                    as highlights
  from public.profiles pr
  left join public.user_collections uc on uc.user_id = pr.id
  where pr.public_slug = p_slug
    and pr.is_public = true
  group by pr.id, pr.username, pr.bio, pr.avatar_initials,
           pr.public_slug, pr.is_public, pr.created_at;
$$;

grant execute on function public.get_public_profile(text) to anon, authenticated;

-- ─────────────────────────────────────────
-- 7. RPC generate_wrapped(user_id, year)
-- ─────────────────────────────────────────
create or replace function public.generate_wrapped(
  p_user_id uuid,
  p_year    integer
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_total_volumes   integer;
  v_total_budget    numeric(8,2);
  v_top_3           jsonb;
  v_top_genre       text;
  v_delta           numeric(6,2);
  v_prev_volumes    integer;
  v_snapshot_id     uuid;
  v_year_start      timestamptz := make_timestamptz(p_year,     1, 1, 0, 0, 0, 'UTC');
  v_year_end        timestamptz := make_timestamptz(p_year + 1, 1, 1, 0, 0, 0, 'UTC');
begin
  select
    coalesce(sum(array_length(uc.owned_volumes, 1)), 0),
    coalesce(sum(array_length(uc.owned_volumes, 1) * m.avg_price_eur), 0)
  into v_total_volumes, v_total_budget
  from public.user_collections uc
  join public.mangas m on m.id = uc.manga_id
  where uc.user_id = p_user_id
    and uc.first_added_at >= v_year_start
    and uc.first_added_at <  v_year_end;

  select coalesce(jsonb_agg(sub), '[]'::jsonb)
  into v_top_3
  from (
    select
      uc.manga_id::text                     as manga_id,
      m.title,
      m.cover_url,
      array_length(uc.owned_volumes, 1)     as volumes_owned
    from public.user_collections uc
    join public.mangas m on m.id = uc.manga_id
    where uc.user_id = p_user_id
      and uc.first_added_at >= v_year_start
      and uc.first_added_at <  v_year_end
    order by array_length(uc.owned_volumes, 1) desc nulls last
    limit 3
  ) sub;

  select m.genre_primary
  into v_top_genre
  from public.user_collections uc
  join public.mangas m on m.id = uc.manga_id
  where uc.user_id = p_user_id
    and uc.first_added_at >= v_year_start
    and uc.first_added_at <  v_year_end
    and m.genre_primary is not null
  group by m.genre_primary
  order by count(*) desc
  limit 1;

  select total_volumes_added
  into v_prev_volumes
  from public.wrapped_snapshots
  where user_id = p_user_id and year = p_year - 1;

  if v_prev_volumes is not null and v_prev_volumes > 0 then
    v_delta := round(((v_total_volumes - v_prev_volumes)::numeric / v_prev_volumes) * 100, 2);
  end if;

  insert into public.wrapped_snapshots (
    user_id, year, total_volumes_added, total_budget_spent,
    top_3_series, top_genre, delta_vs_previous_year_pct, generated_at
  ) values (
    p_user_id, p_year, v_total_volumes, v_total_budget,
    v_top_3, v_top_genre, v_delta, now()
  )
  on conflict (user_id, year) do update set
    total_volumes_added        = excluded.total_volumes_added,
    total_budget_spent         = excluded.total_budget_spent,
    top_3_series               = excluded.top_3_series,
    top_genre                  = excluded.top_genre,
    delta_vs_previous_year_pct = excluded.delta_vs_previous_year_pct,
    generated_at               = now()
  returning id into v_snapshot_id;

  return v_snapshot_id;
end;
$$;

-- generate_wrapped : service role uniquement
