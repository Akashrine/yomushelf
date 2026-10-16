-- Rollback of 20261017000100_catalogue_enrichment.sql
-- Selections are removed ; inserted series are removed only when no reader
-- uses them ; enriched top-50 rows get their former title back.
-- Lossy : rows enriched in place keep the new title and data ; overwritten
-- author/volumes/status are not restored. Only series recorded in
-- catalogue_enrichment_inserted are ever deleted.
delete from public.editorial_selections where slug in ('premiers-mangas','grandes-aventures','courtes','sport','pour-rire','enquetes');
delete from public.mangas m
where m.id in (select manga_id from public.catalogue_enrichment_inserted)
  and not exists (select 1 from public.user_collections uc where uc.manga_id = m.id)
  and not exists (select 1 from public.wishlist_items w where w.manga_id = m.id);
update public.mangas set title = 'Attack on Titan' where title = 'L''Attaque des Titans' and is_top_50_fr and created_by is null;
update public.mangas set title = 'Spy × Family' where title = 'Spy x Family' and is_top_50_fr and created_by is null;
update public.mangas set title = 'Frieren : Au-delà du voyage' where title = 'Frieren' and is_top_50_fr and created_by is null;
update public.mangas set title = 'Kaiju No. 8' where title = 'Kaiju n°8' and is_top_50_fr and created_by is null;
update public.mangas set title = 'Haikyu!!' where title = 'Haikyū!! Les As du volley' and is_top_50_fr and created_by is null;
update public.mangas set title = 'Kaguya-sama' where title = 'Kaguya-sama : Love is War' and is_top_50_fr and created_by is null;
update public.mangas set title = 'Omniscient Reader' where title = 'Omniscient Reader''s Viewpoint' and is_top_50_fr and created_by is null;
update public.mangas set title = 'Dungeon Meshi' where title = 'Gloutons & Dragons' and is_top_50_fr and created_by is null;
update public.mangas set title = 'Witch Hat Atelier' where title = 'L''Atelier des sorciers' and is_top_50_fr and created_by is null;
update public.mangas set title = 'Nausicaä' where title = 'Nausicaä de la vallée du vent' and is_top_50_fr and created_by is null;
update public.mangas set title = 'Boruto' where title = 'Boruto - Naruto Next Generations' and is_top_50_fr and created_by is null;

drop table if exists public.catalogue_enrichment_inserted;

-- Columns added by the forward migration.
alter table public.mangas drop column if exists audience_age_source, drop column if exists curated,
  drop column if exists audience_age_scope, drop column if exists audience_age_volumes, drop column if exists audience_age_ref;
