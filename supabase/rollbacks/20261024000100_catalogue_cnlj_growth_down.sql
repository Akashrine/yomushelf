-- Rollback of 20261024000100_catalogue_cnlj_growth.sql
-- Removes only the series this migration inserted, and only those no reader
-- uses (collection, volumes, readings, wishes, dismissals, selections).
delete from public.mangas m
where m.id in (select manga_id from public.catalogue_growth_inserted where batch = 'cnlj-2026-10')
  and not exists (select 1 from public.user_collections x where x.manga_id = m.id)
  and not exists (select 1 from public.user_volumes x where x.manga_id = m.id)
  and not exists (select 1 from public.user_readings x where x.manga_id = m.id)
  and not exists (select 1 from public.wishlist_items x where x.manga_id = m.id)
  and not exists (select 1 from public.discovery_dismissals x where x.manga_id = m.id)
  and not exists (select 1 from public.editorial_selection_items x where x.manga_id = m.id);
drop table if exists public.catalogue_growth_inserted;
