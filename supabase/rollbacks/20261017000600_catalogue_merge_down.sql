-- Rollback of 20261017000600_catalogue_merge.sql
-- Removes the merge tools and restores the previous search. A merge already
-- applied is NOT undone : rows moved to the kept series stay there, and the
-- merged series reappear in search (empty) once merged_into is dropped.
drop function if exists public.catalogue_merge(uuid, uuid, boolean);
drop function if exists public.catalogue_duplicate_candidates();

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

-- Policies as left by 20261017000300 / 20261017000500.
alter policy "user_collections: insert own" on public.user_collections
  with check (auth.uid() = user_id and exists (select 1 from public.mangas m where m.id = manga_id));
alter policy "user_collections: update own" on public.user_collections
  with check (auth.uid() = user_id and exists (select 1 from public.mangas m where m.id = manga_id));
alter policy "user_volumes: insert own" on public.user_volumes
  with check (auth.uid() = user_id and exists (select 1 from public.mangas m where m.id = manga_id));
alter policy "user_volumes: update own" on public.user_volumes
  with check (auth.uid() = user_id and exists (select 1 from public.mangas m where m.id = manga_id));
alter policy "user_readings: insert own" on public.user_readings
  with check (auth.uid() = user_id and exists (select 1 from public.mangas m where m.id = manga_id));
alter policy "user_readings: update own" on public.user_readings
  with check (auth.uid() = user_id and exists (select 1 from public.mangas m where m.id = manga_id));
alter policy "wishlist_items: insert own" on public.wishlist_items
  with check (auth.uid() = user_id and exists (select 1 from public.mangas m where m.id = manga_id));
alter policy "wishlist_items: update own" on public.wishlist_items
  with check (auth.uid() = user_id and exists (select 1 from public.mangas m where m.id = manga_id));
alter policy "discovery_dismissals: insert own" on public.discovery_dismissals
  with check (auth.uid() = user_id and exists (select 1 from public.mangas m where m.id = manga_id));

alter table public.mangas drop column if exists merged_into;
