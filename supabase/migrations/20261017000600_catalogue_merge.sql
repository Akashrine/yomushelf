-- ============================================================
-- Controlled merge of duplicate shared series.
--
-- catalogue_duplicate_candidates() lists pairs (keep, drop) of shared
-- series with the same normalised title. catalogue_merge(keep, drop,
-- apply) reports, then optionally performs, the merge of drop into keep :
--
-- * Dry run first (apply = false, the default) : nothing changes. The
--   report lists every row that would move, every value that would fill
--   an empty field, and every contradiction.
-- * A contradiction (two different known values for the same reader and
--   the same volume : price, origin, purchase date, finish date, wish
--   price or priority, "J'ai aimé") BLOCKS the merge. Nothing is
--   overwritten : resolve the rows by hand, then run again.
-- * Each reader's rows stay theirs : the merge only ever pairs rows of
--   the same user_id.
-- * Replayable : the dropped series is kept, marked merged_into = keep
--   and hidden from search. Running again reports "already merged".
-- * Service role / SQL editor only : not callable by readers.
--
-- Rollback : supabase/rollbacks/20261017000600_catalogue_merge_down.sql
-- (removes the functions ; a merge already applied is not undone).
-- ============================================================

alter table public.mangas
  add column if not exists merged_into uuid references public.mangas(id);

-- No new reader row on a merged series : its rows were moved to the kept
-- one, anything written after would be stranded.
alter policy "user_collections: insert own" on public.user_collections
  with check (auth.uid() = user_id and exists (select 1 from public.mangas m where m.id = manga_id and m.merged_into is null));
alter policy "user_collections: update own" on public.user_collections
  with check (auth.uid() = user_id and exists (select 1 from public.mangas m where m.id = manga_id and m.merged_into is null));
alter policy "user_volumes: insert own" on public.user_volumes
  with check (auth.uid() = user_id and exists (select 1 from public.mangas m where m.id = manga_id and m.merged_into is null));
alter policy "user_volumes: update own" on public.user_volumes
  with check (auth.uid() = user_id and exists (select 1 from public.mangas m where m.id = manga_id and m.merged_into is null));
alter policy "user_readings: insert own" on public.user_readings
  with check (auth.uid() = user_id and exists (select 1 from public.mangas m where m.id = manga_id and m.merged_into is null));
alter policy "user_readings: update own" on public.user_readings
  with check (auth.uid() = user_id and exists (select 1 from public.mangas m where m.id = manga_id and m.merged_into is null));
alter policy "wishlist_items: insert own" on public.wishlist_items
  with check (auth.uid() = user_id and exists (select 1 from public.mangas m where m.id = manga_id and m.merged_into is null));
alter policy "wishlist_items: update own" on public.wishlist_items
  with check (auth.uid() = user_id and exists (select 1 from public.mangas m where m.id = manga_id and m.merged_into is null));
alter policy "discovery_dismissals: insert own" on public.discovery_dismissals
  with check (auth.uid() = user_id and exists (select 1 from public.mangas m where m.id = manga_id and m.merged_into is null));

-- Search never offers a merged series (same body as 20261017000000,
-- plus the merged_into filter).
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
    and m.merged_into is null
    and (
      m.search_key like '%' || q.nq || '%'
      or extensions.word_similarity(q.nq, m.search_key) >= 0.5
    )
  order by score desc, m.top_50_rank nulls last, m.title
  limit least(greatest(p_limit, 1), 50);
$$;

-- Pairs of shared, unmerged series with the same normalised title.
-- keep : the editorial row if any, else the oldest.
create or replace function public.catalogue_duplicate_candidates()
returns table (keep_id uuid, keep_title text, drop_id uuid, drop_title text)
language sql
stable
security invoker
set search_path = public
as $$
  with shared as (
    select m.id, m.title, m.aliases, m.created_at, m.curated, m.is_top_50_fr,
           public.normalize_search(m.title) as k
    from public.mangas m
    where m.created_by is null and m.merged_into is null
  ),
  -- Every name a series is known by : its title and its aliases.
  names as (
    select s.id, s.k as n from shared s where s.k <> ''
    union
    select s.id, public.normalize_search(a) from shared s, unnest(coalesce(s.aliases, '{}')) a
    where public.normalize_search(a) <> ''
  ),
  pairs as (
    -- a row whose title is a name of another row
    select distinct a.id as x, b.id as y
    from shared a join names b on b.n = a.k and b.id <> a.id
  ),
  ranked as (
    select p.x, p.y,
      -- keep : the editorial row, then the top 50, then the oldest
      case when (ka.curated, ka.is_top_50_fr, kb.created_at, kb.id) > (kb.curated, kb.is_top_50_fr, ka.created_at, ka.id)
           then p.x else p.y end as keep_id,
      case when (ka.curated, ka.is_top_50_fr, kb.created_at, kb.id) > (kb.curated, kb.is_top_50_fr, ka.created_at, ka.id)
           then p.y else p.x end as drop_id
    from pairs p join shared ka on ka.id = p.x join shared kb on kb.id = p.y
  )
  select distinct r.keep_id, k.title, r.drop_id, d.title
  from ranked r join shared k on k.id = r.keep_id join shared d on d.id = r.drop_id
  -- a row only drops into an editorial or older row, never the other way
  where not exists (select 1 from ranked r2 where r2.drop_id = r.keep_id)
  order by 2, 4;
$$;

create or replace function public.catalogue_merge(p_keep uuid, p_drop uuid, p_apply boolean default false)
returns table (kind text, user_id uuid, volume_number integer, detail text)
language plpgsql
security invoker
set search_path = public
as $$
#variable_conflict use_column
declare
  k public.mangas%rowtype;
  d public.mangas%rowtype;
  conflicts integer;
  r record;
begin
  -- Row locks : no concurrent merge, cron update or deletion of these two
  -- series while the report is built and applied.
  select * into k from public.mangas m where m.id = p_keep for update;
  select * into d from public.mangas m where m.id = p_drop for update;
  if k.id is null or d.id is null then raise exception 'unknown series'; end if;
  if p_keep = p_drop then raise exception 'keep and drop are the same series'; end if;
  if d.merged_into = p_keep then
    return query select 'already_merged'::text, null::uuid, null::integer, format('%s est déjà fusionnée dans %s', d.title, k.title);
    return;
  end if;
  if d.merged_into is not null then raise exception 'drop is already merged into another series'; end if;
  if k.merged_into is not null then raise exception 'keep is itself merged'; end if;
  if k.created_by is not null or d.created_by is not null then
    raise exception 'only shared series can be merged';
  end if;

  create temp table if not exists merge_report (kind text, user_id uuid, volume_number integer, detail text) on commit drop;
  truncate merge_report;

  -- ── Owned volumes : same reader, same volume on both series ──
  insert into merge_report
  select case when (a.price_eur is not null and b.price_eur is not null and a.price_eur <> b.price_eur)
                or (a.acquisition_type is not null and b.acquisition_type is not null and a.acquisition_type <> b.acquisition_type)
                or (a.acquired_at is not null and b.acquired_at is not null and a.acquired_at <> b.acquired_at)
              then 'conflict' else 'combine' end,
         a.user_id, a.volume_number,
         format('tome possédé : prix %s / %s, origine %s / %s, date %s / %s',
                coalesce(a.price_eur::text, '?'), coalesce(b.price_eur::text, '?'),
                coalesce(a.acquisition_type::text, '?'), coalesce(b.acquisition_type::text, '?'),
                coalesce(a.acquired_at::text, '?'), coalesce(b.acquired_at::text, '?'))
  from public.user_volumes a
  join public.user_volumes b on b.user_id = a.user_id and b.volume_number = a.volume_number and b.manga_id = p_drop
  where a.manga_id = p_keep;

  insert into merge_report
  select 'move', b.user_id, b.volume_number, 'tome possédé déplacé'
  from public.user_volumes b
  where b.manga_id = p_drop
    and not exists (select 1 from public.user_volumes a where a.manga_id = p_keep and a.user_id = b.user_id and a.volume_number = b.volume_number);

  -- ── Readings ──
  insert into merge_report
  select case when a.finished_on is not null and b.finished_on is not null and a.finished_on <> b.finished_on
              then 'conflict' else 'combine' end,
         a.user_id, a.volume_number,
         format('lecture : %s (%s) / %s (%s)%s', a.status, coalesce(a.finished_on::text, 'sans date'),
                b.status, coalesce(b.finished_on::text, 'sans date'),
                case when a.status <> b.status then ' ; « lu » retenu' else '' end)
  from public.user_readings a
  join public.user_readings b on b.user_id = a.user_id and b.volume_number = a.volume_number and b.manga_id = p_drop
  where a.manga_id = p_keep;

  insert into merge_report
  select 'move', b.user_id, b.volume_number, 'lecture déplacée'
  from public.user_readings b
  where b.manga_id = p_drop
    and not exists (select 1 from public.user_readings a where a.manga_id = p_keep and a.user_id = b.user_id and a.volume_number = b.volume_number);

  -- ── Wishes (volume_number null = the whole series) ──
  insert into merge_report
  select case when (a.target_price is not null and b.target_price is not null and a.target_price <> b.target_price)
                or (a.priority is not null and b.priority is not null and a.priority <> b.priority)
              then 'conflict' else 'combine' end,
         a.user_id, a.volume_number,
         format('envie : prix %s / %s, priorité %s / %s',
                coalesce(a.target_price::text, '?'), coalesce(b.target_price::text, '?'),
                coalesce(a.priority::text, '?'), coalesce(b.priority::text, '?'))
  from public.wishlist_items a
  join public.wishlist_items b on b.user_id = a.user_id and b.volume_number is not distinct from a.volume_number and b.manga_id = p_drop
  where a.manga_id = p_keep;

  insert into merge_report
  select 'move', b.user_id, b.volume_number, 'envie déplacée'
  from public.wishlist_items b
  where b.manga_id = p_drop
    and not exists (select 1 from public.wishlist_items a where a.manga_id = p_keep and a.user_id = b.user_id
                    and a.volume_number is not distinct from b.volume_number);

  -- ── Series on the shelf ──
  insert into merge_report
  select case when (a.liked is not null and b.liked is not null and a.liked <> b.liked)
                or (a.status <> b.status and a.status <> 'not_started' and b.status <> 'not_started')
              then 'conflict' else 'combine' end,
         a.user_id, null,
         format('série dans la bibliothèque des deux côtés : %s / %s, statut %s / %s, « j''ai aimé » %s / %s',
                case when a.archived_at is null then 'active' else 'retirée' end,
                case when b.archived_at is null then 'active' else 'retirée' end,
                a.status, b.status,
                coalesce(a.liked::text, '?'), coalesce(b.liked::text, '?'))
  from public.user_collections a
  join public.user_collections b on b.user_id = a.user_id and b.manga_id = p_drop
  where a.manga_id = p_keep;

  insert into merge_report
  select 'move', b.user_id, null, 'série dans la bibliothèque déplacée'
  from public.user_collections b
  where b.manga_id = p_drop
    and not exists (select 1 from public.user_collections a where a.manga_id = p_keep and a.user_id = b.user_id);

  insert into merge_report
  select 'move', b.user_id, null, 'suggestion écartée déplacée'
  from public.discovery_dismissals b where b.manga_id = p_drop;

  -- ── Catalogue volumes (editions) ──
  insert into merge_report
  select case when a.isbn_13 is not null and b.isbn_13 is not null and a.isbn_13 <> b.isbn_13 then 'conflict' else 'combine' end,
         null, a.volume_number,
         format('tome du catalogue (%s) : ISBN %s / %s', a.edition, coalesce(a.isbn_13, '?'), coalesce(b.isbn_13, '?'))
  from public.volumes a
  join public.volumes b on b.manga_id = p_drop and b.volume_number = a.volume_number and b.edition = a.edition
  where a.manga_id = p_keep;

  -- ── Catalogue metadata ──
  if (k.external_ids ? 'mal_id') and (d.external_ids ? 'mal_id') and k.external_ids->'mal_id' <> d.external_ids->'mal_id' then
    insert into merge_report values ('conflict', null, null,
      format('identifiants MyAnimeList différents : %s / %s', k.external_ids->>'mal_id', d.external_ids->>'mal_id'));
  end if;
  insert into merge_report
  select 'fill', null, null, format('fiche : %s vide, repris de la fiche fusionnée (%s)', f.field, f.val)
  from (values
    ('couverture', k.cover_url is null and d.cover_url is not null, d.cover_url),
    ('auteur', k.author is null and d.author is not null, d.author),
    ('nombre de tomes', k.total_volumes is null and d.total_volumes is not null, d.total_volumes::text),
    ('éditeur', k.publisher_fr is null and d.publisher_fr is not null, d.publisher_fr)
  ) as f(field, missing, val)
  where f.missing;
  if lower(d.title) <> lower(k.title) then
    insert into merge_report values ('info', null, null,
      format('« %s » devient un autre nom de « %s »', d.title, k.title));
  end if;

  select count(*) into conflicts from merge_report mr where mr.kind = 'conflict';

  if p_apply then
    if conflicts > 0 then
      raise exception 'merge blocked : % contradiction(s). Run the dry run, resolve them, then retry.', conflicts;
    end if;

    -- 1. Shelf rows first : volumes and readings reference them.
    -- Mark the dropped series first : from now on readers cannot attach new
    -- rows to it (policies check merged_into), so nothing is lost below.
    update public.mangas set merged_into = p_keep where id = p_drop;

    insert into public.user_collections (user_id, manga_id, first_added_at, archived_at, liked, status)
    select b.user_id, p_keep, b.first_added_at, b.archived_at, b.liked, b.status
    from public.user_collections b
    where b.manga_id = p_drop
    on conflict (user_id, manga_id) do update set
      -- a known status wins over "not started" ; two known statuses were a contradiction
      status = case when public.user_collections.status = 'not_started' then excluded.status else public.user_collections.status end,
      first_added_at = least(public.user_collections.first_added_at, excluded.first_added_at),
      -- active on either side means active
      archived_at = case when public.user_collections.archived_at is null or excluded.archived_at is null then null
                         else public.user_collections.archived_at end,
      liked = coalesce(public.user_collections.liked, excluded.liked);

    -- 2. Owned volumes : fill empty fields, then move the rest.
    update public.user_volumes a set
      price_eur = coalesce(a.price_eur, b.price_eur),
      acquisition_type = coalesce(a.acquisition_type, b.acquisition_type),
      acquired_at = coalesce(a.acquired_at, b.acquired_at)
    from public.user_volumes b
    where a.manga_id = p_keep and b.manga_id = p_drop and b.user_id = a.user_id and b.volume_number = a.volume_number;
    delete from public.user_volumes b
    where b.manga_id = p_drop
      and exists (select 1 from public.user_volumes a where a.manga_id = p_keep and a.user_id = b.user_id and a.volume_number = b.volume_number);
    update public.user_volumes set manga_id = p_keep where manga_id = p_drop;

    -- 3. Readings : "read" wins over "reading", known date kept.
    update public.user_readings a set
      status = case when 'read' in (a.status::text, b.status::text) then 'read'::public.reading_status else a.status end,
      finished_on = coalesce(a.finished_on, b.finished_on)
    from public.user_readings b
    where a.manga_id = p_keep and b.manga_id = p_drop and b.user_id = a.user_id and b.volume_number = a.volume_number;
    delete from public.user_readings b
    where b.manga_id = p_drop
      and exists (select 1 from public.user_readings a where a.manga_id = p_keep and a.user_id = b.user_id and a.volume_number = b.volume_number);
    update public.user_readings set manga_id = p_keep where manga_id = p_drop;

    -- 4. Wishes.
    update public.wishlist_items a set
      target_price = coalesce(a.target_price, b.target_price),
      priority = coalesce(a.priority, b.priority)
    from public.wishlist_items b
    where a.manga_id = p_keep and b.manga_id = p_drop and b.user_id = a.user_id
      and b.volume_number is not distinct from a.volume_number;
    delete from public.wishlist_items b
    where b.manga_id = p_drop
      and exists (select 1 from public.wishlist_items a where a.manga_id = p_keep and a.user_id = b.user_id
                  and a.volume_number is not distinct from b.volume_number);
    update public.wishlist_items set manga_id = p_keep where manga_id = p_drop;
    -- A wish for a volume the reader now owns on the kept series is fulfilled.
    delete from public.wishlist_items w
    where w.manga_id = p_keep and w.volume_number is not null
      and exists (select 1 from public.user_volumes v where v.user_id = w.user_id and v.manga_id = p_keep and v.volume_number = w.volume_number);

    -- 5. Set-aside suggestions.
    insert into public.discovery_dismissals (user_id, manga_id, created_at)
    select b.user_id, p_keep, b.created_at from public.discovery_dismissals b where b.manga_id = p_drop
    on conflict do nothing;
    delete from public.discovery_dismissals where manga_id = p_drop;

    -- 6. The old shelf rows are now empty.
    delete from public.user_collections where manga_id = p_drop;

    -- 7. Catalogue volumes and editorial items. The dropped volume's values
    -- are kept aside first : its ISBN is unique, it must leave that row
    -- before it can fill the kept one.
    create temp table merge_volumes on commit drop as
      select b.volume_number, b.edition, b.isbn_13, b.release_date_fr, b.price_eur, b.cover_url
      from public.volumes b
      where b.manga_id = p_drop
        and exists (select 1 from public.volumes a where a.manga_id = p_keep and a.volume_number = b.volume_number and a.edition = b.edition);
    update public.volumes b set isbn_13 = null
    where b.manga_id = p_drop and (b.volume_number, b.edition) in (select volume_number, edition from merge_volumes);
    update public.volumes a set
      isbn_13 = coalesce(a.isbn_13, b.isbn_13),
      release_date_fr = coalesce(a.release_date_fr, b.release_date_fr),
      price_eur = coalesce(a.price_eur, b.price_eur),
      cover_url = coalesce(a.cover_url, b.cover_url)
    from merge_volumes b
    where a.manga_id = p_keep and b.volume_number = a.volume_number and b.edition = a.edition;
    delete from public.volumes b
    where b.manga_id = p_drop
      and exists (select 1 from public.volumes a where a.manga_id = p_keep and a.volume_number = b.volume_number and a.edition = b.edition);
    update public.volumes set manga_id = p_keep where manga_id = p_drop;

    insert into public.editorial_selection_items (selection_id, manga_id, position, note)
    select b.selection_id, p_keep, b.position, b.note from public.editorial_selection_items b where b.manga_id = p_drop
    on conflict do nothing;
    delete from public.editorial_selection_items where manga_id = p_drop;

    -- 8. Catalogue row : fill empty fields, keep the old title as an alias.
    update public.mangas m set
      cover_url = coalesce(m.cover_url, d.cover_url),
      author = coalesce(m.author, d.author),
      total_volumes = coalesce(m.total_volumes, d.total_volumes),
      publisher_fr = coalesce(m.publisher_fr, d.publisher_fr),
      external_ids = d.external_ids || m.external_ids,
      aliases = array(select distinct a from unnest(coalesce(m.aliases, '{}') || lower(d.title) || coalesce(d.aliases, '{}')) a
                      where a <> lower(m.title))
    where m.id = p_keep;
    -- The dropped row keeps nothing that could make it found again : its
    -- external ids moved to the kept row above.
    update public.mangas set merged_into = p_keep, curated = false, is_top_50_fr = false, top_50_rank = null,
      external_ids = '{}'::jsonb
    where id = p_drop;

    -- 9. Recompute the legacy summary of every reader concerned.
    for r in select distinct uc.user_id from public.user_collections uc where uc.manga_id = p_keep loop
      perform public.refresh_user_collection(r.user_id, p_keep);
    end loop;

    insert into merge_report values ('applied', null, null, format('« %s » fusionnée dans « %s »', d.title, k.title));
  end if;

  return query select mr.kind, mr.user_id, mr.volume_number, mr.detail from merge_report mr
  order by case mr.kind when 'conflict' then 0 when 'combine' then 1 when 'move' then 2 when 'fill' then 3 else 4 end,
           mr.user_id nulls first, mr.volume_number nulls first;
end;
$$;

revoke all on function public.catalogue_merge(uuid, uuid, boolean) from public, anon, authenticated;
revoke all on function public.catalogue_duplicate_candidates() from public, anon, authenticated;
grant execute on function public.catalogue_merge(uuid, uuid, boolean) to service_role;
grant execute on function public.catalogue_duplicate_candidates() to service_role;
