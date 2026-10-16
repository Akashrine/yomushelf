-- ============================================================
-- Catalogue for discovery and tolerant search, private series,
-- editorial selections, archived series.
-- Rollback : supabase/rollbacks/20261017000000_catalogue_discovery_down.sql
--
-- * mangas gets genres, demographic, recommended age, synopsis, aliases.
-- * A reader can create a series missing from every source ("Ajouter
--   quand même"). It stays private (created_by = the reader) : RLS hides
--   it from everyone else, it never pollutes the shared catalogue.
-- * search_mangas() matches titles and aliases without accents, with
--   typos and kid spellings ("atake titan", "spi famili", "one pis").
-- * Removing a series from the shelf archives it : volumes and readings
--   stay. Only an explicit permanent deletion removes them.
-- ============================================================

create extension if not exists unaccent with schema extensions;
create extension if not exists pg_trgm with schema extensions;

-- ─────────────────────────────────────────
-- 1. Search normalisation
-- ─────────────────────────────────────────

-- unaccent() is only STABLE ; this wrapper pins the dictionary so it can
-- be IMMUTABLE and used to maintain an indexed column.
create or replace function public.f_unaccent(p text)
returns text
language sql
immutable
parallel safe
set search_path = extensions, public
as $$ select extensions.unaccent('extensions.unaccent'::regdictionary, p) $$;

-- Lowercase, no accents, no punctuation, then a light phonetic pass so a
-- child's spelling meets the real title : qu→k, c+a/o/u→k, ph→f, y→i,
-- silent h dropped, doubled letters collapsed, final s/e dropped.
create or replace function public.normalize_search(p text)
returns text
language plpgsql
immutable
parallel safe
set search_path = public
as $$
declare
  words text[];
  w text;
  out text[] := '{}';
begin
  if p is null then return ''; end if;
  p := lower(public.f_unaccent(replace(p, '×', 'x')));
  p := regexp_replace(p, '[^a-z0-9]+', ' ', 'g');
  words := regexp_split_to_array(btrim(p), '\s+');
  foreach w in array words loop
    continue when w = '';
    w := replace(w, 'qu', 'k');
    w := regexp_replace(w, 'c([aou])', 'k\1', 'g');
    w := replace(w, 'ph', 'f');
    w := replace(w, 'y', 'i');
    w := replace(w, 'h', '');
    w := regexp_replace(w, '(.)\1+', '\1', 'g');
    if length(w) > 3 then
      w := regexp_replace(w, '[se]$', '');
    end if;
    out := out || w;
  end loop;
  return array_to_string(out, ' ');
end;
$$;

-- ─────────────────────────────────────────
-- 2. Catalogue enrichment
-- ─────────────────────────────────────────
alter table public.mangas
  add column if not exists genres text[] not null default '{}',
  add column if not exists demographic text
    check (demographic in ('kodomo', 'shonen', 'shojo', 'seinen', 'josei')),
  add column if not exists audience_min_age smallint
    check (audience_min_age between 0 and 18),
  add column if not exists synopsis text check (char_length(synopsis) <= 400),
  add column if not exists aliases text[] not null default '{}',
  -- null = shared catalogue ; a user id = private series of that reader
  add column if not exists created_by uuid references auth.users(id) on delete cascade,
  add column if not exists search_key text not null default '';

comment on column public.mangas.created_by is
  'null = shared catalogue. Set = private series, visible to its creator only.';

create or replace function public.mangas_set_search_key()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.search_key := public.normalize_search(
    new.title || ' ' || coalesce(array_to_string(new.aliases, ' '), '')
  );
  return new;
end;
$$;

drop trigger if exists mangas_search_key on public.mangas;
create trigger mangas_search_key
  before insert or update of title, aliases on public.mangas
  for each row execute function public.mangas_set_search_key();

update public.mangas set search_key = public.normalize_search(
  title || ' ' || coalesce(array_to_string(aliases, ' '), '')
);

create index if not exists mangas_search_key_trgm
  on public.mangas using gin (search_key extensions.gin_trgm_ops);
create index if not exists mangas_created_by_idx
  on public.mangas (created_by) where created_by is not null;

-- ─────────────────────────────────────────
-- 3. Private series : RLS + column privileges
-- ─────────────────────────────────────────
drop policy if exists "mangas: read public" on public.mangas;
drop policy if exists "mangas: read shared or own" on public.mangas;
create policy "mangas: read shared or own"
  on public.mangas for select
  using (created_by is null or created_by = auth.uid());

drop policy if exists "mangas: insert own private" on public.mangas;
create policy "mangas: insert own private"
  on public.mangas for insert
  to authenticated
  with check (created_by = auth.uid() and is_top_50_fr = false and top_50_rank is null);

drop policy if exists "mangas: update own private" on public.mangas;
create policy "mangas: update own private"
  on public.mangas for update
  to authenticated
  using (created_by = auth.uid())
  with check (created_by = auth.uid());

drop policy if exists "mangas: delete own private" on public.mangas;
create policy "mangas: delete own private"
  on public.mangas for delete
  to authenticated
  using (created_by = auth.uid());

-- Clients may only write the fields a reader can type. Catalogue fields
-- (cover, editorial data, top 50) stay service-role only.
revoke insert, update, delete, truncate on public.mangas from anon, authenticated;
grant insert (title, author, total_volumes, status, created_by) on public.mangas to authenticated;
grant update (title, author, total_volumes, status) on public.mangas to authenticated;
grant delete on public.mangas to authenticated;

-- ─────────────────────────────────────────
-- 4. Tolerant search (RLS applies : private series of others never match)
-- ─────────────────────────────────────────
create or replace function public.search_mangas(p_query text, p_limit integer default 20)
returns table (
  id uuid,
  title text,
  author text,
  publisher_fr text,
  total_volumes integer,
  status public.manga_status,
  cover_url text,
  genres text[],
  demographic text,
  audience_min_age smallint,
  external_ids jsonb,
  is_private boolean,
  score real
)
language sql
stable
security invoker
set search_path = public, extensions
as $$
  with q as (select public.normalize_search(p_query) as nq)
  select
    m.id, m.title, m.author, m.publisher_fr, m.total_volumes, m.status, m.cover_url,
    m.genres, m.demographic, m.audience_min_age, m.external_ids,
    m.created_by is not null as is_private,
    greatest(
      case when m.search_key like q.nq || '%' then 1.0 else 0 end,
      case when m.search_key like '%' || q.nq || '%' then 0.9 else 0 end,
      extensions.word_similarity(q.nq, m.search_key)
    )::real as score
  from public.mangas m, q
  where length(q.nq) >= 2
    and (
      m.search_key like '%' || q.nq || '%'
      or extensions.word_similarity(q.nq, m.search_key) >= 0.5
    )
  order by score desc, m.top_50_rank nulls last, m.title
  limit least(greatest(p_limit, 1), 50);
$$;

grant execute on function public.search_mangas(text, integer) to anon, authenticated;
grant execute on function public.normalize_search(text) to anon, authenticated;

-- ─────────────────────────────────────────
-- 5. Editorial selections (configurable, not tied to an age)
-- ─────────────────────────────────────────
create table if not exists public.editorial_selections (
  id           uuid        primary key default gen_random_uuid(),
  slug         text        not null unique,
  title        text        not null,
  description  text,
  position     integer     not null default 0,
  published    boolean     not null default true,
  created_at   timestamptz not null default now()
);

create table if not exists public.editorial_selection_items (
  selection_id uuid    not null references public.editorial_selections(id) on delete cascade,
  manga_id     uuid    not null references public.mangas(id) on delete cascade,
  position     integer not null default 0,
  note         text,
  primary key (selection_id, manga_id)
);

alter table public.editorial_selections enable row level security;
alter table public.editorial_selection_items enable row level security;

drop policy if exists "editorial_selections: read published" on public.editorial_selections;
create policy "editorial_selections: read published"
  on public.editorial_selections for select
  using (published);

drop policy if exists "editorial_selection_items: read published" on public.editorial_selection_items;
create policy "editorial_selection_items: read published"
  on public.editorial_selection_items for select
  using (exists (
    select 1 from public.editorial_selections s
    where s.id = selection_id and s.published
  ));

revoke insert, update, delete, truncate on public.editorial_selections from anon, authenticated;
revoke insert, update, delete, truncate on public.editorial_selection_items from anon, authenticated;

-- ─────────────────────────────────────────
-- 6. Archived series : off the shelf, history kept
-- ─────────────────────────────────────────
alter table public.user_collections
  add column if not exists archived_at timestamptz;

comment on column public.user_collections.archived_at is
  'Set = removed from the shelf by the reader. Volumes and readings are kept.';
