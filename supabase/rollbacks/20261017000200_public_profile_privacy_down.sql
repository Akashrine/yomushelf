-- Restores the previous get_public_profile (shows private and archived series).
-- 5. RPC get_public_profile
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
