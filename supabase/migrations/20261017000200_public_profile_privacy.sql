-- Public profiles never show private series (free-text titles typed by the
-- reader) nor archived ones. Same signature and output as before.
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
  with visible as (
    select uc.*, m.title, m.cover_url, m.genre_primary
    from public.user_collections uc
    join public.mangas m on m.id = uc.manga_id
    join public.profiles p on p.id = uc.user_id
    where p.public_slug = p_slug
      and p.is_public = true
      and uc.archived_at is null
      and m.created_by is null
  )
  select
    pr.username,
    pr.bio,
    pr.avatar_initials,
    pr.public_slug,
    pr.is_public,
    pr.created_at,
    (select count(distinct v.manga_id) from visible v),
    (select coalesce(sum(array_length(v.owned_volumes, 1)), 0) from visible v),
    (select coalesce(sum(coalesce(v.last_read_volume, 0)), 0) from visible v),
    (
      select coalesce(jsonb_agg(sub), '[]'::jsonb)
      from (
        select v.manga_id::text as manga_id, v.title, v.cover_url,
               array_length(v.owned_volumes, 1) as owned_count
        from visible v
        where v.cover_url is not null
        order by array_length(v.owned_volumes, 1) desc nulls last
        limit 20
      ) sub
    ),
    jsonb_build_object(
      'most_volumes', (
        select jsonb_build_object('title', v.title, 'cover_url', v.cover_url,
                                  'owned', array_length(v.owned_volumes, 1))
        from visible v
        order by array_length(v.owned_volumes, 1) desc nulls last
        limit 1
      ),
      'completed_series', (select count(*) from visible v where v.status = 'completed'),
      'top_genre', (
        select v.genre_primary from visible v
        where v.genre_primary is not null
        group by v.genre_primary
        order by count(*) desc
        limit 1
      )
    )
  from public.profiles pr
  where pr.public_slug = p_slug
    and pr.is_public = true;
$$;

grant execute on function public.get_public_profile(text) to anon, authenticated;
