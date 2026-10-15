-- Rollback of 20261017000100_catalogue_enrichment.sql
-- Selections are removed ; inserted series are removed only when no reader
-- uses them ; enriched top-50 rows get their former title back.
delete from public.editorial_selections where slug in ('premiers-mangas','grandes-aventures','courtes','sport','pour-rire','enquetes');
delete from public.mangas m where m.created_by is null and not m.is_top_50_fr and m.title in ('Détective Conan','Doraemon','Chi - Une vie de chat','Pokémon - La Grande Aventure','Dragon Ball Super','Yo-kai Watch','Super Mario Manga Adventures','Animal Crossing : New Horizons - Le Journal de l''île','Les Aventures de Kirby dans les étoiles','Splatoon','The Legend of Zelda - Twilight Princess','Beyblade X','Dragon Quest - The Adventure of Daï','Shaman King','Astro Boy','Captain Tsubasa','Dr Slump','Gunnm','Les Carnets de l''apothicaire','Yotsuba&!','Le Voyage de Chihiro','Fruits Basket','Card Captor Sakura','Sailor Moon','Divine Nanami','Blue Period','Kiki la petite sorcière','Beastars','Tokyo Revengers','Dorohedoro','Hirayasumi','L''Ère des cristaux','Look Back','Ranma ½','Saint Seiya')
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
