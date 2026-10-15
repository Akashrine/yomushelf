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

alter table public.mangas drop column if exists merged_into;
