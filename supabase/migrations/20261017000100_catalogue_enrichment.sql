-- ============================================================
-- Catalogue enrichment (data only, shared catalogue only).
-- Generated from a researched list (Wikipédia FR, publishers, CNLJ
-- "Manga mania !" for ages) on 2026-10-15. Unknown volume counts are
-- left null rather than guessed.
--
-- * Existing top-50 rows get their French title, genres, demographic,
--   recommended age, synopsis and aliases. The former title is kept as
--   an alias so search still finds it. Their ids do not change : the
--   readers' collections are untouched.
-- * Missing series are inserted. A series already imported under its
--   original or English title (e.g. "Meitantei Conan") is enriched in
--   place instead : same id, the readers' rows are untouched, the former
--   title becomes an alias.
-- * Six editorial selections, configurable later in the table.
-- Rollback : supabase/rollbacks/20261017000100_catalogue_enrichment_down.sql
-- ============================================================

-- Where each recommended age comes from, and which rows were written by
-- this editorial work rather than imported by a reader. Readers cannot
-- write these columns (column grants of the catalogue migration).
--   cnlj     : age given by the CNLJ (BnF) "Manga mania !" selection,
--              as found during the research of 2026-10-15
--   estimate : estimated during that research, NOT a classification.
--              Never shown as an age ; only used to make suggestions
--              more cautious (see docs/politique-contenu.md).
alter table public.mangas
  add column if not exists audience_age_source text
    check (audience_age_source in ('cnlj', 'estimate')),
  add column if not exists curated boolean not null default false,
  -- what the CNLJ recommendation covers : the whole series, or only some
  -- volumes (a recommendation on a volume is not one for the series)
  add column if not exists audience_age_scope text check (audience_age_scope in ('series', 'volume')),
  add column if not exists audience_age_volumes integer[],
  add column if not exists audience_age_ref text, -- source URL
  add column if not exists audience_age_year smallint, -- edition / review year of the source
  -- set by catalogue_merge (20261017000600) ; created here so that running
  -- this migration again never touches a merged series
  add column if not exists merged_into uuid references public.mangas(id);

-- Series this migration creates (and only those) : the rollback deletes
-- exactly these, never a series that existed before. Service role only.
create table if not exists public.catalogue_enrichment_inserted (
  manga_id uuid primary key references public.mangas(id) on delete cascade
);
alter table public.catalogue_enrichment_inserted enable row level security;
revoke all on public.catalogue_enrichment_inserted from anon, authenticated;

-- Finds the shared, non top-50 series already known under one of these
-- titles (accents, case and punctuation ignored). Only distinctive
-- original or English titles are listed : a generic word like "kirby" or
-- "beyblade" could point at another series. Oldest match wins ; any other
-- duplicate is left untouched.
create or replace function pg_temp.catalogue_match(p_keys text[])
returns uuid
language sql
stable
as $$
  select m.id from public.mangas m
  where m.created_by is null and m.merged_into is null
    and not m.is_top_50_fr
    and public.normalize_search(m.title) in (select public.normalize_search(k) from unnest(p_keys) k)
  order by m.created_at, m.id
  limit 1
$$;

update public.mangas set
  title = 'One Piece',
  genres = array['aventure','action','comedie','fantasy']::text[],
  demographic = 'shonen',
  audience_min_age = 9,
  synopsis = 'Luffy, garçon au corps élastique, prend la mer avec son équipage pour trouver le trésor légendaire du One Piece.',
  aliases = array['op','one pièce','onepiece','one peace']::text[],
  author = coalesce('Eiichirō Oda', author),
  publisher_fr = coalesce('Glénat', publisher_fr),
  total_volumes = coalesce(113, total_volumes),
  status = 'ongoing'::public.manga_status
where title = 'One Piece' and is_top_50_fr and created_by is null;

update public.mangas set
  title = 'Naruto',
  genres = array['action','aventure','surnaturel']::text[],
  demographic = 'shonen',
  audience_min_age = 9,
  synopsis = 'Naruto, jeune ninja turbulent rejeté par son village, rêve de devenir Hokage, le chef de Konoha.',
  aliases = array['naruto shippuden','naruto shippuuden','narutoo']::text[],
  author = coalesce('Masashi Kishimoto', author),
  publisher_fr = coalesce('Kana', publisher_fr),
  total_volumes = coalesce(72, total_volumes),
  status = 'completed'::public.manga_status
where title = 'Naruto' and is_top_50_fr and created_by is null;

update public.mangas set
  title = 'Dragon Ball',
  genres = array['action','aventure','comedie','fantasy']::text[],
  demographic = 'shonen',
  audience_min_age = 9,
  synopsis = 'Son Goku, garçon à queue de singe doté d''une force hors norme, part à la recherche des sept boules de cristal.',
  aliases = array['db','dragonball','dragon ball z','dbz','dragon bal']::text[],
  author = coalesce('Akira Toriyama', author),
  publisher_fr = coalesce('Glénat', publisher_fr),
  total_volumes = coalesce(42, total_volumes),
  status = 'completed'::public.manga_status
where title = 'Dragon Ball' and is_top_50_fr and created_by is null;

update public.mangas set
  title = 'L''Attaque des Titans',
  genres = array['action','drame','fantasy','horreur']::text[],
  demographic = 'shonen',
  audience_min_age = 14,
  synopsis = 'Retranchée derrière d''immenses murs, l''humanité survit face aux Titans ; le jeune Eren jure de les exterminer.',
  aliases = array['attack on titan','shingeki no kyojin','snk','aot','attaque des titans','l''attaque des titants']::text[],
  author = coalesce('Hajime Isayama', author),
  publisher_fr = coalesce('Pika', publisher_fr),
  total_volumes = coalesce(34, total_volumes),
  status = 'completed'::public.manga_status
where title = 'Attack on Titan' and is_top_50_fr and created_by is null;

update public.mangas set
  title = 'Demon Slayer',
  genres = array['action','surnaturel','historique','aventure']::text[],
  demographic = 'shonen',
  audience_min_age = 12,
  synopsis = 'Dans le Japon de l''ère Taishō, Tanjirō devient pourfendeur de démons pour rendre son humanité à sa sœur Nezuko.',
  aliases = array['kimetsu no yaiba','kny','demon slayer kimetsu no yaiba','demon slayeur']::text[],
  author = coalesce('Koyoharu Gotōge', author),
  publisher_fr = coalesce('Panini', publisher_fr),
  total_volumes = coalesce(23, total_volumes),
  status = 'completed'::public.manga_status
where title = 'Demon Slayer' and is_top_50_fr and created_by is null;

update public.mangas set
  title = 'Jujutsu Kaisen',
  genres = array['action','surnaturel','horreur']::text[],
  demographic = 'shonen',
  audience_min_age = 11,
  synopsis = 'Après avoir avalé un doigt maudit, le lycéen Yuji Itadori rejoint une école d''exorcistes qui traquent les fléaux.',
  aliases = array['jjk','jujutsu','jujustu kaisen','jujutsu kaizen']::text[],
  author = coalesce('Gege Akutami', author),
  publisher_fr = coalesce('Ki-oon', publisher_fr),
  total_volumes = coalesce(30, total_volumes),
  status = 'completed'::public.manga_status
where title = 'Jujutsu Kaisen' and is_top_50_fr and created_by is null;

update public.mangas set
  title = 'My Hero Academia',
  genres = array['action','science-fiction','aventure']::text[],
  demographic = 'shonen',
  audience_min_age = 11,
  synopsis = 'Dans un monde où presque tous ont un super-pouvoir, Izuku, né sans Alter, rêve de devenir un grand héros.',
  aliases = array['mha','bnha','boku no hero academia','my hero academy','my hero']::text[],
  author = coalesce('Kōhei Horikoshi', author),
  publisher_fr = coalesce('Ki-oon', publisher_fr),
  total_volumes = coalesce(42, total_volumes),
  status = 'completed'::public.manga_status
where title = 'My Hero Academia' and is_top_50_fr and created_by is null;

update public.mangas set
  title = 'Bleach',
  genres = array['action','surnaturel','aventure']::text[],
  demographic = 'shonen',
  audience_min_age = 12,
  synopsis = 'Ichigo, lycéen qui voit les fantômes, hérite des pouvoirs d''une shinigami et protège les vivants des Hollows.',
  aliases = array['bleatch','blich','bleach tybw']::text[],
  author = coalesce('Tite Kubo', author),
  publisher_fr = coalesce('Glénat', publisher_fr),
  total_volumes = coalesce(74, total_volumes),
  status = 'completed'::public.manga_status
where title = 'Bleach' and is_top_50_fr and created_by is null;

update public.mangas set
  title = 'Fullmetal Alchemist',
  genres = array['action','aventure','fantasy','drame']::text[],
  demographic = 'shonen',
  audience_min_age = 12,
  synopsis = 'Les frères Elric, alchimistes, cherchent la pierre philosophale pour réparer les ravages d''une transmutation interdite.',
  aliases = array['fma','fullmetal','full metal alchemist','hagane no renkinjutsushi','fmab']::text[],
  author = coalesce('Hiromu Arakawa', author),
  publisher_fr = coalesce('Kurokawa', publisher_fr),
  total_volumes = coalesce(27, total_volumes),
  status = 'completed'::public.manga_status
where title = 'Fullmetal Alchemist' and is_top_50_fr and created_by is null;

update public.mangas set
  title = 'Death Note',
  genres = array['mystere','psychologique','surnaturel']::text[],
  demographic = 'shonen',
  audience_min_age = 14,
  synopsis = 'Le lycéen Light trouve un cahier qui tue quiconque y voit son nom écrit et décide d''épurer le monde du crime.',
  aliases = array['deathnote','dn','death not']::text[],
  author = coalesce('Tsugumi Ōba, Takeshi Obata', author),
  publisher_fr = coalesce('Kana', publisher_fr),
  total_volumes = coalesce(13, total_volumes),
  status = 'completed'::public.manga_status
where title = 'Death Note' and is_top_50_fr and created_by is null;

update public.mangas set
  title = 'Spy x Family',
  genres = array['comedie','action','tranche-de-vie']::text[],
  demographic = 'shonen',
  audience_min_age = 12,
  synopsis = 'Un espion, une tueuse à gages et une fillette télépathe forment une fausse famille, chacun cachant son secret.',
  aliases = array['spy family','spyxfamily','spy x famille','spy famiy','spy × family']::text[],
  author = coalesce('Tatsuya Endō', author),
  publisher_fr = coalesce('Kurokawa', publisher_fr),
  total_volumes = coalesce(16, total_volumes),
  status = 'ongoing'::public.manga_status
where title = 'Spy × Family' and is_top_50_fr and created_by is null;

update public.mangas set
  title = 'Chainsaw Man',
  genres = array['action','horreur','surnaturel']::text[],
  demographic = 'shonen',
  audience_min_age = 16,
  synopsis = 'Denji, jeune homme écrasé de dettes, fusionne avec son chien-tronçonneuse et devient chasseur de démons.',
  aliases = array['csm','chainsawman','chainsaw','chain saw man']::text[],
  author = coalesce('Tatsuki Fujimoto', author),
  publisher_fr = coalesce('Crunchyroll (ex-Kazé)', publisher_fr),
  total_volumes = coalesce(23, total_volumes),
  status = 'completed'::public.manga_status
where title = 'Chainsaw Man' and is_top_50_fr and created_by is null;

update public.mangas set
  title = 'Blue Lock',
  genres = array['sport','action','psychologique']::text[],
  demographic = 'shonen',
  audience_min_age = 11,
  synopsis = 'Pour forger le meilleur buteur du Japon, 300 jeunes attaquants s''affrontent dans un centre d''entraînement impitoyable.',
  aliases = array['bluelock','blue lok','blue rock']::text[],
  author = coalesce('Muneyuki Kaneshiro, Yūsuke Nomura', author),
  publisher_fr = coalesce('Pika', publisher_fr),
  total_volumes = coalesce(34, total_volumes),
  status = 'ongoing'::public.manga_status
where title = 'Blue Lock' and is_top_50_fr and created_by is null;

update public.mangas set
  title = 'Frieren',
  genres = array['fantasy','aventure','drame','tranche-de-vie']::text[],
  demographic = 'shonen',
  audience_min_age = 13,
  synopsis = 'Après la défaite du roi démon, l''elfe Frieren reprend la route pour comprendre les humains qu''elle a côtoyés.',
  aliases = array['frieren beyond journey''s end','sousou no frieren','frieren au-delà du voyage','frieren au dela du voyage','frieren beyond journeys end','frieren l''elfe','frieren : au-delà du voyage']::text[],
  author = coalesce('Kanehito Yamada, Tsukasa Abe', author),
  publisher_fr = coalesce('Ki-oon', publisher_fr),
  total_volumes = coalesce(15, total_volumes),
  status = 'paused'::public.manga_status
where title = 'Frieren : Au-delà du voyage' and is_top_50_fr and created_by is null;

update public.mangas set
  title = 'Kaiju n°8',
  genres = array['action','science-fiction']::text[],
  demographic = 'shonen',
  audience_min_age = 12,
  synopsis = 'Kafka, nettoyeur de carcasses de monstres, se change lui-même en kaiju alors qu''il rêve d''intégrer les forces de défense.',
  aliases = array['kaiju no 8','kaiju 8','kaijuu 8 gou','kaiju n 8','kaiju number 8','kaiju no. 8']::text[],
  author = coalesce('Naoya Matsumoto', author),
  publisher_fr = coalesce('Crunchyroll (ex-Kazé)', publisher_fr),
  total_volumes = coalesce(16, total_volumes),
  status = 'completed'::public.manga_status
where title = 'Kaiju No. 8' and is_top_50_fr and created_by is null;

update public.mangas set
  title = 'Solo Leveling',
  genres = array['action','fantasy','aventure']::text[],
  demographic = 'shonen',
  audience_min_age = 14,
  synopsis = 'Sung Jin-woo, le chasseur le plus faible de Corée, obtient le pouvoir unique de gagner des niveaux sans limite.',
  aliases = array['na honjaman level up','sololeveling','solo levelling','solo lvl']::text[],
  author = coalesce('Chugong, Dubu (Redice Studio)', author),
  publisher_fr = coalesce('Kbooks (Delcourt)', publisher_fr),
  total_volumes = coalesce(19, total_volumes),
  status = 'completed'::public.manga_status
where title = 'Solo Leveling' and is_top_50_fr and created_by is null;

update public.mangas set
  title = 'Tokyo Ghoul',
  genres = array['horreur','action','surnaturel','drame']::text[],
  demographic = 'seinen',
  audience_min_age = 16,
  synopsis = 'Après une attaque, l''étudiant Ken Kaneki devient mi-humain mi-goule, contraint de se nourrir de chair humaine.',
  aliases = array['tokyo goul','tokyo ghoul re','tokyo ghoul:re','tg']::text[],
  author = coalesce('Sui Ishida', author),
  publisher_fr = coalesce('Glénat', publisher_fr),
  total_volumes = coalesce(14, total_volumes),
  status = 'completed'::public.manga_status
where title = 'Tokyo Ghoul' and is_top_50_fr and created_by is null;

update public.mangas set
  title = 'Hunter x Hunter',
  genres = array['aventure','action','fantasy']::text[],
  demographic = 'shonen',
  audience_min_age = 12,
  synopsis = 'Gon, 12 ans, passe le redoutable examen de Hunter pour retrouver son père, un aventurier légendaire.',
  aliases = array['hxh','hunter hunter','hunterxhunter','hunter x hunteur']::text[],
  author = coalesce('Yoshihiro Togashi', author),
  publisher_fr = coalesce('Kana', publisher_fr),
  total_volumes = coalesce(38, total_volumes),
  status = 'paused'::public.manga_status
where title = 'Hunter x Hunter' and is_top_50_fr and created_by is null;

update public.mangas set
  title = 'Sword Art Online',
  genres = array['science-fiction','action','aventure','romance']::text[],
  demographic = 'shonen',
  audience_min_age = 12,
  synopsis = 'Des milliers de joueurs se retrouvent piégés dans un jeu vidéo en réalité virtuelle où mourir signifie mourir pour de vrai.',
  aliases = array['sao','swort art online','sword art']::text[],
  author = coalesce('Reki Kawahara', author),
  publisher_fr = coalesce('Ototo', publisher_fr),
  total_volumes = coalesce(null, total_volumes),
  status = 'ongoing'::public.manga_status
where title = 'Sword Art Online' and is_top_50_fr and created_by is null;

update public.mangas set
  title = 'Black Clover',
  genres = array['action','fantasy','aventure']::text[],
  demographic = 'shonen',
  audience_min_age = 10,
  synopsis = 'Asta, seul garçon sans magie de son royaume, vise le titre d''Empereur-Mage grâce à un grimoire anti-magie.',
  aliases = array['blackclover','black clove','black clover asta']::text[],
  author = coalesce('Yūki Tabata', author),
  publisher_fr = coalesce('Crunchyroll (ex-Kazé)', publisher_fr),
  total_volumes = coalesce(37, total_volumes),
  status = 'ongoing'::public.manga_status
where title = 'Black Clover' and is_top_50_fr and created_by is null;

update public.mangas set
  title = 'Fairy Tail',
  genres = array['action','aventure','fantasy','comedie']::text[],
  demographic = 'shonen',
  audience_min_age = 11,
  synopsis = 'Lucy rejoint Fairy Tail, guilde de mages bagarreurs, et part en mission avec Natsu, le chasseur de dragons.',
  aliases = array['fairytail','fairy tale','ft']::text[],
  author = coalesce('Hiro Mashima', author),
  publisher_fr = coalesce('Pika', publisher_fr),
  total_volumes = coalesce(63, total_volumes),
  status = 'completed'::public.manga_status
where title = 'Fairy Tail' and is_top_50_fr and created_by is null;

update public.mangas set
  title = 'Vinland Saga',
  genres = array['historique','action','aventure','drame']::text[],
  demographic = 'seinen',
  audience_min_age = 13,
  synopsis = 'Au XIe siècle, le jeune Thorfinn suit une troupe de Vikings pour venger son père, avant de chercher un sens à sa vie.',
  aliases = array['vinland','vinlad saga','vinland sagga']::text[],
  author = coalesce('Makoto Yukimura', author),
  publisher_fr = coalesce('Kurokawa', publisher_fr),
  total_volumes = coalesce(29, total_volumes),
  status = 'completed'::public.manga_status
where title = 'Vinland Saga' and is_top_50_fr and created_by is null;

update public.mangas set
  title = 'Kingdom',
  genres = array['historique','action','drame']::text[],
  demographic = 'seinen',
  audience_min_age = 14,
  synopsis = 'Dans la Chine des Royaumes combattants, l''orphelin Shin rêve de devenir le plus grand général sous le ciel.',
  aliases = array['kingdom manga','kindom','kingdom hara']::text[],
  author = coalesce('Yasuhisa Hara', author),
  publisher_fr = coalesce('Meian', publisher_fr),
  total_volumes = coalesce(77, total_volumes),
  status = 'ongoing'::public.manga_status
where title = 'Kingdom' and is_top_50_fr and created_by is null;

update public.mangas set
  title = 'Dr. Stone',
  genres = array['science-fiction','aventure','comedie']::text[],
  demographic = 'shonen',
  audience_min_age = 11,
  synopsis = 'L''humanité entière est pétrifiée ; des millénaires plus tard, le génie Senku veut rebâtir la civilisation par la science.',
  aliases = array['dr stone','docteur stone','drstone','dr. stone senku']::text[],
  author = coalesce('Riichirō Inagaki, Boichi', author),
  publisher_fr = coalesce('Glénat', publisher_fr),
  total_volumes = coalesce(27, total_volumes),
  status = 'completed'::public.manga_status
where title = 'Dr. Stone' and is_top_50_fr and created_by is null;

update public.mangas set
  title = 'The Promised Neverland',
  genres = array['mystere','fantasy','psychologique']::text[],
  demographic = 'shonen',
  audience_min_age = 12,
  synopsis = 'Emma et les orphelins de Grace Field découvrent la terrible vérité sur leur foyer et préparent leur évasion.',
  aliases = array['tpn','yakusoku no neverland','promised neverland','the promise neverland']::text[],
  author = coalesce('Kaiu Shirai, Posuka Demizu', author),
  publisher_fr = coalesce('Crunchyroll (ex-Kazé)', publisher_fr),
  total_volumes = coalesce(20, total_volumes),
  status = 'completed'::public.manga_status
where title = 'The Promised Neverland' and is_top_50_fr and created_by is null;

update public.mangas set
  title = 'Berserk',
  genres = array['fantasy','action','horreur','drame']::text[],
  demographic = 'seinen',
  audience_min_age = 16,
  synopsis = 'Guts, mercenaire à l''épée démesurée, traque les démons dans un monde médiéval sombre et violent.',
  aliases = array['berserk guts','berseck','berzerk']::text[],
  author = coalesce('Kentarō Miura', author),
  publisher_fr = coalesce('Glénat', publisher_fr),
  total_volumes = coalesce(43, total_volumes),
  status = 'ongoing'::public.manga_status
where title = 'Berserk' and is_top_50_fr and created_by is null;

update public.mangas set
  title = 'Vagabond',
  genres = array['historique','action','drame']::text[],
  demographic = 'seinen',
  audience_min_age = 14,
  synopsis = 'Dans le Japon du XVIIe siècle, le jeune Takezō devient Miyamoto Musashi et cherche la voie du sabre.',
  aliases = array['vagabon','vagabond musashi']::text[],
  author = coalesce('Takehiko Inoue', author),
  publisher_fr = coalesce('Delcourt/Tonkam', publisher_fr),
  total_volumes = coalesce(37, total_volumes),
  status = 'paused'::public.manga_status
where title = 'Vagabond' and is_top_50_fr and created_by is null;

update public.mangas set
  title = 'Slam Dunk',
  genres = array['sport','comedie','drame']::text[],
  demographic = 'shonen',
  audience_min_age = 10,
  synopsis = 'Hanamichi, voyou au grand cœur, rejoint l''équipe de basket de son lycée pour impressionner une fille.',
  aliases = array['slamdunk','slam dunck']::text[],
  author = coalesce('Takehiko Inoue', author),
  publisher_fr = coalesce('Kana', publisher_fr),
  total_volumes = coalesce(31, total_volumes),
  status = 'completed'::public.manga_status
where title = 'Slam Dunk' and is_top_50_fr and created_by is null;

update public.mangas set
  title = 'Haikyū!! Les As du volley',
  genres = array['sport','comedie','drame']::text[],
  demographic = 'shonen',
  audience_min_age = 11,
  synopsis = 'Malgré sa petite taille, Shōyō Hinata veut briller au volley-ball et forme un duo explosif avec le passeur Kageyama.',
  aliases = array['haikyu','haikyuu','haikyuu!!','les as du volley','haikiu','haikyu!!']::text[],
  author = coalesce('Haruichi Furudate', author),
  publisher_fr = coalesce('Crunchyroll (ex-Kazé)', publisher_fr),
  total_volumes = coalesce(45, total_volumes),
  status = 'completed'::public.manga_status
where title = 'Haikyu!!' and is_top_50_fr and created_by is null;

update public.mangas set
  title = 'Food Wars!',
  genres = array['cuisine','comedie']::text[],
  demographic = 'shonen',
  audience_min_age = 14,
  synopsis = 'Sōma, fils de cuisinier, intègre une école culinaire d''élite où chaque défi se règle par des duels de cuisine.',
  aliases = array['shokugeki no soma','shokugeki no souma','food war','food wars']::text[],
  author = coalesce('Yūto Tsukuda, Shun Saeki', author),
  publisher_fr = coalesce('Delcourt/Tonkam', publisher_fr),
  total_volumes = coalesce(36, total_volumes),
  status = 'completed'::public.manga_status
where title = 'Food Wars!' and is_top_50_fr and created_by is null;

update public.mangas set
  title = 'Kaguya-sama : Love is War',
  genres = array['romance','comedie','psychologique']::text[],
  demographic = 'seinen',
  audience_min_age = 13,
  synopsis = 'Deux élèves brillants du conseil des élèves s''aiment, mais chacun refuse d''avouer ses sentiments le premier.',
  aliases = array['kaguya sama','kaguya-sama love is war','love is war','kaguya','kaguya-sama']::text[],
  author = coalesce('Aka Akasaka', author),
  publisher_fr = coalesce('Pika', publisher_fr),
  total_volumes = coalesce(28, total_volumes),
  status = 'completed'::public.manga_status
where title = 'Kaguya-sama' and is_top_50_fr and created_by is null;

update public.mangas set
  title = 'Dandadan',
  genres = array['action','surnaturel','comedie','science-fiction']::text[],
  demographic = 'shonen',
  audience_min_age = 14,
  synopsis = 'Momo croit aux fantômes, Okarun aux extraterrestres : leur pari les plonge dans un tourbillon de phénomènes étranges.',
  aliases = array['dan da dan','dandandan','dandadan manga']::text[],
  author = coalesce('Yukinobu Tatsu', author),
  publisher_fr = coalesce('Crunchyroll (ex-Kazé)', publisher_fr),
  total_volumes = coalesce(23, total_volumes),
  status = 'ongoing'::public.manga_status
where title = 'Dandadan' and is_top_50_fr and created_by is null;

update public.mangas set
  title = 'Oshi no Ko',
  genres = array['drame','mystere','psychologique']::text[],
  demographic = 'seinen',
  audience_min_age = 14,
  synopsis = 'Réincarné en enfant d''une idole, un médecin découvre l''envers du show-business japonais et ses zones d''ombre.',
  aliases = array['[oshi no ko]','oshinoko','my star']::text[],
  author = coalesce('Aka Akasaka, Mengo Yokoyari', author),
  publisher_fr = coalesce('Kurokawa', publisher_fr),
  total_volumes = coalesce(16, total_volumes),
  status = 'completed'::public.manga_status
where title = 'Oshi no Ko' and is_top_50_fr and created_by is null;

update public.mangas set
  title = 'Omniscient Reader''s Viewpoint',
  genres = array['fantasy','action','aventure']::text[],
  demographic = 'shonen',
  audience_min_age = 14,
  synopsis = 'Le monde devient le roman que Dokja était seul à lire jusqu''au bout ; il connaît la suite et veut survivre.',
  aliases = array['lecteur omniscient','orv','jeonjijeok dokja sijeom','omniscient reader']::text[],
  author = coalesce('sing N song, Sleepy-C', author),
  publisher_fr = coalesce('Pika', publisher_fr),
  total_volumes = coalesce(null, total_volumes),
  status = 'ongoing'::public.manga_status
where title = 'Omniscient Reader' and is_top_50_fr and created_by is null;

update public.mangas set
  title = 'Gloutons & Dragons',
  genres = array['fantasy','cuisine','aventure','comedie']::text[],
  demographic = 'seinen',
  audience_min_age = 12,
  synopsis = 'Une équipe d''aventuriers explore un donjon en cuisinant les monstres qu''elle affronte pour sauver une amie.',
  aliases = array['dungeon meshi','delicious in dungeon','gloutons et dragons','gloutons dragons']::text[],
  author = coalesce('Ryōko Kui', author),
  publisher_fr = coalesce('Casterman', publisher_fr),
  total_volumes = coalesce(14, total_volumes),
  status = 'completed'::public.manga_status
where title = 'Dungeon Meshi' and is_top_50_fr and created_by is null;

update public.mangas set
  title = 'Toilet-bound Hanako-kun',
  genres = array['surnaturel','comedie','mystere']::text[],
  demographic = 'shonen',
  audience_min_age = 11,
  synopsis = 'Nene invoque Hanako, l''esprit des toilettes de son école, et se retrouve mêlée aux mystères surnaturels du lycée.',
  aliases = array['hanako kun','jibaku shounen hanako-kun','hanako-kun','toilet bound hanako kun']::text[],
  author = coalesce('AidaIro', author),
  publisher_fr = coalesce('Pika', publisher_fr),
  total_volumes = coalesce(24, total_volumes),
  status = 'ongoing'::public.manga_status
where title = 'Toilet-bound Hanako-kun' and is_top_50_fr and created_by is null;

update public.mangas set
  title = 'L''Atelier des sorciers',
  genres = array['fantasy','aventure']::text[],
  demographic = 'seinen',
  audience_min_age = 11,
  synopsis = 'Coco, fille de couturière, découvre le secret de la magie et devient l''apprentie d''un sorcier.',
  aliases = array['witch hat atelier','atelier des sorciers','tongari boshi no atelier','l''atelier des sorcier']::text[],
  author = coalesce('Kamome Shirahama', author),
  publisher_fr = coalesce('Pika', publisher_fr),
  total_volumes = coalesce(15, total_volumes),
  status = 'ongoing'::public.manga_status
where title = 'Witch Hat Atelier' and is_top_50_fr and created_by is null;

update public.mangas set
  title = 'Nausicaä de la vallée du vent',
  genres = array['science-fiction','aventure','fantasy','drame']::text[],
  demographic = 'seinen',
  audience_min_age = 10,
  synopsis = 'Dans un monde ravagé où s''étend une forêt toxique, la princesse Nausicaä tente de réconcilier humains et nature.',
  aliases = array['nausicaa','nausicaä','nausicaa de la vallee du vent','kaze no tani no naushika']::text[],
  author = coalesce('Hayao Miyazaki', author),
  publisher_fr = coalesce('Glénat', publisher_fr),
  total_volumes = coalesce(7, total_volumes),
  status = 'completed'::public.manga_status
where title = 'Nausicaä' and is_top_50_fr and created_by is null;

update public.mangas set
  title = 'Monster',
  genres = array['mystere','psychologique','drame']::text[],
  demographic = 'seinen',
  audience_min_age = 14,
  synopsis = 'Le docteur Tenma sauve la vie d''un enfant qui, des années plus tard, se révèle être un tueur redoutable.',
  aliases = array['monster urasawa','monstre','monster manga']::text[],
  author = coalesce('Naoki Urasawa', author),
  publisher_fr = coalesce('Kana', publisher_fr),
  total_volumes = coalesce(18, total_volumes),
  status = 'completed'::public.manga_status
where title = 'Monster' and is_top_50_fr and created_by is null;

update public.mangas set
  title = '20th Century Boys',
  genres = array['mystere','science-fiction','drame']::text[],
  demographic = 'seinen',
  audience_min_age = 14,
  synopsis = 'Kenji et ses amis d''enfance découvrent qu''une secte reproduit les scénarios apocalyptiques qu''ils avaient inventés.',
  aliases = array['20 century boys','20th century boy','twentieth century boys','20cb']::text[],
  author = coalesce('Naoki Urasawa', author),
  publisher_fr = coalesce('Panini', publisher_fr),
  total_volumes = coalesce(22, total_volumes),
  status = 'completed'::public.manga_status
where title = '20th Century Boys' and is_top_50_fr and created_by is null;

update public.mangas set
  title = 'Pluto',
  genres = array['science-fiction','mystere','drame']::text[],
  demographic = 'seinen',
  audience_min_age = 14,
  synopsis = 'Un inspecteur robot enquête sur une série de meurtres visant les robots les plus avancés du monde.',
  aliases = array['pluto urasawa','pluton']::text[],
  author = coalesce('Naoki Urasawa, Osamu Tezuka', author),
  publisher_fr = coalesce('Kana', publisher_fr),
  total_volumes = coalesce(8, total_volumes),
  status = 'completed'::public.manga_status
where title = 'Pluto' and is_top_50_fr and created_by is null;

update public.mangas set
  title = 'Boruto - Naruto Next Generations',
  genres = array['action','aventure','surnaturel']::text[],
  demographic = 'shonen',
  audience_min_age = 9,
  synopsis = 'Boruto, fils de Naruto devenu Hokage, cherche sa propre voie de ninja dans un Konoha en pleine modernisation.',
  aliases = array['boruto naruto next generations','boruto two blue vortex','boruto tbv','boruto']::text[],
  author = coalesce('Masashi Kishimoto, Mikio Ikemoto', author),
  publisher_fr = coalesce('Kana', publisher_fr),
  total_volumes = coalesce(20, total_volumes),
  status = 'completed'::public.manga_status
where title = 'Boruto' and is_top_50_fr and created_by is null;

update public.mangas set
  title = 'Mashle',
  genres = array['comedie','fantasy','action']::text[],
  demographic = 'shonen',
  audience_min_age = 10,
  synopsis = 'Dans un monde où la magie fait tout, Mash, sans aucun pouvoir, intègre une école de sorciers à la force des muscles.',
  aliases = array['mashle magic and muscles','mash','mashle muscles']::text[],
  author = coalesce('Hajime Kōmoto', author),
  publisher_fr = coalesce('Crunchyroll (ex-Kazé)', publisher_fr),
  total_volumes = coalesce(18, total_volumes),
  status = 'completed'::public.manga_status
where title = 'Mashle' and is_top_50_fr and created_by is null;

update public.mangas set
  title = 'Hell''s Paradise',
  genres = array['action','historique','surnaturel','horreur']::text[],
  demographic = 'shonen',
  audience_min_age = 16,
  synopsis = 'Condamné à mort, le ninja Gabimaru peut être gracié s''il rapporte l''élixir de vie d''une île mystérieuse.',
  aliases = array['jigokuraku','hells paradise','hell paradise','hell']::text[],
  author = coalesce('Yūji Kaku', author),
  publisher_fr = coalesce('Crunchyroll (ex-Kazé)', publisher_fr),
  total_volumes = coalesce(13, total_volumes),
  status = 'completed'::public.manga_status
where title = 'Hell''s Paradise' and is_top_50_fr and created_by is null;

update public.mangas set
  title = 'Sakamoto Days',
  genres = array['action','comedie']::text[],
  demographic = 'shonen',
  audience_min_age = 12,
  synopsis = 'Ancien tueur légendaire rangé pour tenir une supérette, Sakamoto doit protéger sa famille des assassins.',
  aliases = array['sakamoto','sakamoto day','sakamotodays']::text[],
  author = coalesce('Yūto Suzuki', author),
  publisher_fr = coalesce('Glénat', publisher_fr),
  total_volumes = coalesce(23, total_volumes),
  status = 'ongoing'::public.manga_status
where title = 'Sakamoto Days' and is_top_50_fr and created_by is null;

update public.mangas set
  title = 'Undead Unluck',
  genres = array['action','comedie','surnaturel']::text[],
  demographic = 'shonen',
  audience_min_age = 12,
  synopsis = 'Fūko porte malheur à quiconque la touche ; elle s''allie à Andy, un immortel qui rêve de mourir.',
  aliases = array['undead unlock','undeadunluck','undead luck']::text[],
  author = coalesce('Yoshifumi Tozuka', author),
  publisher_fr = coalesce('Kana', publisher_fr),
  total_volumes = coalesce(26, total_volumes),
  status = 'completed'::public.manga_status
where title = 'Undead Unluck' and is_top_50_fr and created_by is null;

update public.mangas set
  title = 'Wind Breaker',
  genres = array['action','drame']::text[],
  demographic = 'shonen',
  audience_min_age = 12,
  synopsis = 'Haruka rejoint un lycée de bagarreurs qui, contre toute attente, protège son quartier.',
  aliases = array['windbreaker','wind breaker nii','wind braker']::text[],
  author = coalesce('Satoru Nii', author),
  publisher_fr = coalesce('Pika', publisher_fr),
  total_volumes = coalesce(24, total_volumes),
  status = 'ongoing'::public.manga_status
where title = 'Wind Breaker' and is_top_50_fr and created_by is null;

update public.mangas set
  title = 'Ao Ashi',
  genres = array['sport','drame']::text[],
  demographic = 'seinen',
  audience_min_age = 12,
  synopsis = 'Repéré dans sa campagne, Ashito intègre le centre de formation d''un club de foot pro de Tokyo.',
  aliases = array['aoashi','ao ashi playmaker','ao achi']::text[],
  author = coalesce('Yūgo Kobayashi', author),
  publisher_fr = coalesce('Mangetsu', publisher_fr),
  total_volumes = coalesce(36, total_volumes),
  status = 'completed'::public.manga_status
where title = 'Ao Ashi' and is_top_50_fr and created_by is null;

update public.mangas set
  title = 'Fire Force',
  genres = array['action','science-fiction','surnaturel']::text[],
  demographic = 'shonen',
  audience_min_age = 12,
  synopsis = 'Shinra rejoint une brigade spéciale de pompiers qui combat les humains changés en torches vivantes.',
  aliases = array['enen no shouboutai','fireforce','fire forse']::text[],
  author = coalesce('Atsushi Ōkubo', author),
  publisher_fr = coalesce('Kana', publisher_fr),
  total_volumes = coalesce(34, total_volumes),
  status = 'completed'::public.manga_status
where title = 'Fire Force' and is_top_50_fr and created_by is null;

update public.mangas set
  title = 'Assassination Classroom',
  genres = array['comedie','action','science-fiction']::text[],
  demographic = 'shonen',
  audience_min_age = 13,
  synopsis = 'Une classe de cancres a un an pour éliminer son professeur, une créature qui menace de détruire la Terre.',
  aliases = array['ansatsu kyoushitsu','assassination classrom','koro sensei']::text[],
  author = coalesce('Yūsei Matsui', author),
  publisher_fr = coalesce('Kana', publisher_fr),
  total_volumes = coalesce(21, total_volumes),
  status = 'completed'::public.manga_status
where title = 'Assassination Classroom' and is_top_50_fr and created_by is null;

-- Détective Conan : enrich a former import under another title, or create it.
with v(title, author, publisher_fr, total_volumes, status, genres, demographic, audience_min_age, synopsis, aliases, is_top_50_fr) as (
  select 'Détective Conan', 'Gōshō Aoyama', 'Kana', 107, 'ongoing'::public.manga_status,
  array['mystere','aventure','comedie']::text[], 'shonen', 10, 'Rajeuni par un poison, le lycéen détective Shinichi enquête sous l''apparence d''un enfant nommé Conan.', array['detective conan','case closed','meitantei conan','conan','detectiv conan']::text[], false
)
update public.mangas m set
  title = v.title, author = v.author::text, publisher_fr = v.publisher_fr::text, total_volumes = v.total_volumes::integer,
  status = v.status, genres = v.genres, demographic = v.demographic::text, audience_min_age = v.audience_min_age::smallint,
  synopsis = v.synopsis,
  aliases = array(select distinct a from unnest(coalesce(m.aliases, '{}'::text[]) || lower(m.title) || v.aliases) a where a <> lower(v.title))
from v
where m.id = pg_temp.catalogue_match(array['Détective Conan','meitantei conan','case closed','detective conan']);

with inserted as (
insert into public.mangas (title, author, publisher_fr, total_volumes, status, genres, demographic, audience_min_age, synopsis, aliases, is_top_50_fr)
select 'Détective Conan', 'Gōshō Aoyama', 'Kana', 107, 'ongoing'::public.manga_status,
  array['mystere','aventure','comedie']::text[], 'shonen', 10, 'Rajeuni par un poison, le lycéen détective Shinichi enquête sous l''apparence d''un enfant nommé Conan.', array['detective conan','case closed','meitantei conan','conan','detectiv conan']::text[], false
where pg_temp.catalogue_match(array['Détective Conan','meitantei conan','case closed','detective conan']) is null
  returning id
)
insert into public.catalogue_enrichment_inserted (manga_id) select id from inserted on conflict do nothing;

-- Doraemon : enrich a former import under another title, or create it.
with v(title, author, publisher_fr, total_volumes, status, genres, demographic, audience_min_age, synopsis, aliases, is_top_50_fr) as (
  select 'Doraemon', 'Fujiko F. Fujio', 'Kana', 45, 'completed'::public.manga_status,
  array['comedie','science-fiction','tranche-de-vie']::text[], 'kodomo', 6, 'Doraemon, chat robot venu du futur, aide le maladroit Nobita grâce aux gadgets de sa poche magique.', array['doraemon le chat venu du futur','doraemon chat','doremon']::text[], false
)
update public.mangas m set
  title = v.title, author = v.author::text, publisher_fr = v.publisher_fr::text, total_volumes = v.total_volumes::integer,
  status = v.status, genres = v.genres, demographic = v.demographic::text, audience_min_age = v.audience_min_age::smallint,
  synopsis = v.synopsis,
  aliases = array(select distinct a from unnest(coalesce(m.aliases, '{}'::text[]) || lower(m.title) || v.aliases) a where a <> lower(v.title))
from v
where m.id = pg_temp.catalogue_match(array['Doraemon']);

with inserted as (
insert into public.mangas (title, author, publisher_fr, total_volumes, status, genres, demographic, audience_min_age, synopsis, aliases, is_top_50_fr)
select 'Doraemon', 'Fujiko F. Fujio', 'Kana', 45, 'completed'::public.manga_status,
  array['comedie','science-fiction','tranche-de-vie']::text[], 'kodomo', 6, 'Doraemon, chat robot venu du futur, aide le maladroit Nobita grâce aux gadgets de sa poche magique.', array['doraemon le chat venu du futur','doraemon chat','doremon']::text[], false
where pg_temp.catalogue_match(array['Doraemon']) is null
  returning id
)
insert into public.catalogue_enrichment_inserted (manga_id) select id from inserted on conflict do nothing;

-- Chi - Une vie de chat : enrich a former import under another title, or create it.
with v(title, author, publisher_fr, total_volumes, status, genres, demographic, audience_min_age, synopsis, aliases, is_top_50_fr) as (
  select 'Chi - Une vie de chat', 'Kanata Konami', 'Glénat', 12, 'completed'::public.manga_status,
  array['comedie','tranche-de-vie']::text[], 'kodomo', 6, 'Chi, chaton perdu recueilli par une famille, découvre avec curiosité les joies et petits soucis du quotidien.', array['chi une vie de chat','chi''s sweet home','chi','chi vie de chat']::text[], false
)
update public.mangas m set
  title = v.title, author = v.author::text, publisher_fr = v.publisher_fr::text, total_volumes = v.total_volumes::integer,
  status = v.status, genres = v.genres, demographic = v.demographic::text, audience_min_age = v.audience_min_age::smallint,
  synopsis = v.synopsis,
  aliases = array(select distinct a from unnest(coalesce(m.aliases, '{}'::text[]) || lower(m.title) || v.aliases) a where a <> lower(v.title))
from v
where m.id = pg_temp.catalogue_match(array['Chi - Une vie de chat','chi''s sweet home','chi une vie de chat']);

with inserted as (
insert into public.mangas (title, author, publisher_fr, total_volumes, status, genres, demographic, audience_min_age, synopsis, aliases, is_top_50_fr)
select 'Chi - Une vie de chat', 'Kanata Konami', 'Glénat', 12, 'completed'::public.manga_status,
  array['comedie','tranche-de-vie']::text[], 'kodomo', 6, 'Chi, chaton perdu recueilli par une famille, découvre avec curiosité les joies et petits soucis du quotidien.', array['chi une vie de chat','chi''s sweet home','chi','chi vie de chat']::text[], false
where pg_temp.catalogue_match(array['Chi - Une vie de chat','chi''s sweet home','chi une vie de chat']) is null
  returning id
)
insert into public.catalogue_enrichment_inserted (manga_id) select id from inserted on conflict do nothing;

-- Pokémon - La Grande Aventure : enrich a former import under another title, or create it.
with v(title, author, publisher_fr, total_volumes, status, genres, demographic, audience_min_age, synopsis, aliases, is_top_50_fr) as (
  select 'Pokémon - La Grande Aventure', 'Hidenori Kusaka, Mato, Satoshi Yamamoto', 'Kurokawa', null, 'ongoing'::public.manga_status,
  array['aventure','fantasy','action']::text[], 'kodomo', 8, 'De jeunes dresseurs parcourent les régions du monde Pokémon, entre captures, combats et menaces d''organisations.', array['pokemon la grande aventure','pokemon adventures','pokemon special','pokémon']::text[], false
)
update public.mangas m set
  title = v.title, author = v.author::text, publisher_fr = v.publisher_fr::text, total_volumes = v.total_volumes::integer,
  status = v.status, genres = v.genres, demographic = v.demographic::text, audience_min_age = v.audience_min_age::smallint,
  synopsis = v.synopsis,
  aliases = array(select distinct a from unnest(coalesce(m.aliases, '{}'::text[]) || lower(m.title) || v.aliases) a where a <> lower(v.title))
from v
where m.id = pg_temp.catalogue_match(array['Pokémon - La Grande Aventure','pokemon adventures','pokemon special','pocket monsters special']);

with inserted as (
insert into public.mangas (title, author, publisher_fr, total_volumes, status, genres, demographic, audience_min_age, synopsis, aliases, is_top_50_fr)
select 'Pokémon - La Grande Aventure', 'Hidenori Kusaka, Mato, Satoshi Yamamoto', 'Kurokawa', null, 'ongoing'::public.manga_status,
  array['aventure','fantasy','action']::text[], 'kodomo', 8, 'De jeunes dresseurs parcourent les régions du monde Pokémon, entre captures, combats et menaces d''organisations.', array['pokemon la grande aventure','pokemon adventures','pokemon special','pokémon']::text[], false
where pg_temp.catalogue_match(array['Pokémon - La Grande Aventure','pokemon adventures','pokemon special','pocket monsters special']) is null
  returning id
)
insert into public.catalogue_enrichment_inserted (manga_id) select id from inserted on conflict do nothing;

-- Dragon Ball Super : enrich a former import under another title, or create it.
with v(title, author, publisher_fr, total_volumes, status, genres, demographic, audience_min_age, synopsis, aliases, is_top_50_fr) as (
  select 'Dragon Ball Super', 'Akira Toriyama, Toyotarō', 'Glénat', 24, 'paused'::public.manga_status,
  array['action','aventure','science-fiction']::text[], 'shonen', 9, 'Après la défaite de Majin Boo, Goku et ses amis affrontent des dieux et des guerriers venus d''autres univers.', array['dbs','dragon ball super manga','db super','dragonball super']::text[], false
)
update public.mangas m set
  title = v.title, author = v.author::text, publisher_fr = v.publisher_fr::text, total_volumes = v.total_volumes::integer,
  status = v.status, genres = v.genres, demographic = v.demographic::text, audience_min_age = v.audience_min_age::smallint,
  synopsis = v.synopsis,
  aliases = array(select distinct a from unnest(coalesce(m.aliases, '{}'::text[]) || lower(m.title) || v.aliases) a where a <> lower(v.title))
from v
where m.id = pg_temp.catalogue_match(array['Dragon Ball Super','dragonball super']);

with inserted as (
insert into public.mangas (title, author, publisher_fr, total_volumes, status, genres, demographic, audience_min_age, synopsis, aliases, is_top_50_fr)
select 'Dragon Ball Super', 'Akira Toriyama, Toyotarō', 'Glénat', 24, 'paused'::public.manga_status,
  array['action','aventure','science-fiction']::text[], 'shonen', 9, 'Après la défaite de Majin Boo, Goku et ses amis affrontent des dieux et des guerriers venus d''autres univers.', array['dbs','dragon ball super manga','db super','dragonball super']::text[], false
where pg_temp.catalogue_match(array['Dragon Ball Super','dragonball super']) is null
  returning id
)
insert into public.catalogue_enrichment_inserted (manga_id) select id from inserted on conflict do nothing;

-- Yo-kai Watch : enrich a former import under another title, or create it.
with v(title, author, publisher_fr, total_volumes, status, genres, demographic, audience_min_age, synopsis, aliases, is_top_50_fr) as (
  select 'Yo-kai Watch', 'Noriyuki Konishi', 'Crunchyroll (ex-Kazé)', null, 'completed'::public.manga_status,
  array['comedie','surnaturel']::text[], 'kodomo', 6, 'Grâce à une montre spéciale, Nathan voit les Yo-kai, esprits farceurs responsables des petits tracas du quotidien.', array['yokai watch','yo kai watch','youkai watch']::text[], false
)
update public.mangas m set
  title = v.title, author = v.author::text, publisher_fr = v.publisher_fr::text, total_volumes = v.total_volumes::integer,
  status = v.status, genres = v.genres, demographic = v.demographic::text, audience_min_age = v.audience_min_age::smallint,
  synopsis = v.synopsis,
  aliases = array(select distinct a from unnest(coalesce(m.aliases, '{}'::text[]) || lower(m.title) || v.aliases) a where a <> lower(v.title))
from v
where m.id = pg_temp.catalogue_match(array['Yo-kai Watch','yokai watch','youkai watch']);

with inserted as (
insert into public.mangas (title, author, publisher_fr, total_volumes, status, genres, demographic, audience_min_age, synopsis, aliases, is_top_50_fr)
select 'Yo-kai Watch', 'Noriyuki Konishi', 'Crunchyroll (ex-Kazé)', null, 'completed'::public.manga_status,
  array['comedie','surnaturel']::text[], 'kodomo', 6, 'Grâce à une montre spéciale, Nathan voit les Yo-kai, esprits farceurs responsables des petits tracas du quotidien.', array['yokai watch','yo kai watch','youkai watch']::text[], false
where pg_temp.catalogue_match(array['Yo-kai Watch','yokai watch','youkai watch']) is null
  returning id
)
insert into public.catalogue_enrichment_inserted (manga_id) select id from inserted on conflict do nothing;

-- Super Mario Manga Adventures : enrich a former import under another title, or create it.
with v(title, author, publisher_fr, total_volumes, status, genres, demographic, audience_min_age, synopsis, aliases, is_top_50_fr) as (
  select 'Super Mario Manga Adventures', 'Yukio Sawada', 'Soleil', 36, 'ongoing'::public.manga_status,
  array['aventure','comedie','fantasy']::text[], 'kodomo', 6, 'Mario, Luigi et leurs amis vivent des aventures loufoques inspirées des jeux vidéo Nintendo.', array['super mario','mario manga','super mario-kun','super mario adventures']::text[], false
)
update public.mangas m set
  title = v.title, author = v.author::text, publisher_fr = v.publisher_fr::text, total_volumes = v.total_volumes::integer,
  status = v.status, genres = v.genres, demographic = v.demographic::text, audience_min_age = v.audience_min_age::smallint,
  synopsis = v.synopsis,
  aliases = array(select distinct a from unnest(coalesce(m.aliases, '{}'::text[]) || lower(m.title) || v.aliases) a where a <> lower(v.title))
from v
where m.id = pg_temp.catalogue_match(array['Super Mario Manga Adventures']);

with inserted as (
insert into public.mangas (title, author, publisher_fr, total_volumes, status, genres, demographic, audience_min_age, synopsis, aliases, is_top_50_fr)
select 'Super Mario Manga Adventures', 'Yukio Sawada', 'Soleil', 36, 'ongoing'::public.manga_status,
  array['aventure','comedie','fantasy']::text[], 'kodomo', 6, 'Mario, Luigi et leurs amis vivent des aventures loufoques inspirées des jeux vidéo Nintendo.', array['super mario','mario manga','super mario-kun','super mario adventures']::text[], false
where pg_temp.catalogue_match(array['Super Mario Manga Adventures']) is null
  returning id
)
insert into public.catalogue_enrichment_inserted (manga_id) select id from inserted on conflict do nothing;

-- Animal Crossing : New Horizons - Le Journal de l'île : enrich a former import under another title, or create it.
with v(title, author, publisher_fr, total_volumes, status, genres, demographic, audience_min_age, synopsis, aliases, is_top_50_fr) as (
  select 'Animal Crossing : New Horizons - Le Journal de l''île', 'Rumba Kokonasu', 'Soleil', 12, 'ongoing'::public.manga_status,
  array['comedie','tranche-de-vie']::text[], 'kodomo', 6, 'Sur une île paisible, un habitant et ses voisins animaux enchaînent gags et petits projets du quotidien.', array['animal crossing','animal crossing new horizons','ac new horizons','journal de l''ile']::text[], false
)
update public.mangas m set
  title = v.title, author = v.author::text, publisher_fr = v.publisher_fr::text, total_volumes = v.total_volumes::integer,
  status = v.status, genres = v.genres, demographic = v.demographic::text, audience_min_age = v.audience_min_age::smallint,
  synopsis = v.synopsis,
  aliases = array(select distinct a from unnest(coalesce(m.aliases, '{}'::text[]) || lower(m.title) || v.aliases) a where a <> lower(v.title))
from v
where m.id = pg_temp.catalogue_match(array['Animal Crossing : New Horizons - Le Journal de l''île']);

with inserted as (
insert into public.mangas (title, author, publisher_fr, total_volumes, status, genres, demographic, audience_min_age, synopsis, aliases, is_top_50_fr)
select 'Animal Crossing : New Horizons - Le Journal de l''île', 'Rumba Kokonasu', 'Soleil', 12, 'ongoing'::public.manga_status,
  array['comedie','tranche-de-vie']::text[], 'kodomo', 6, 'Sur une île paisible, un habitant et ses voisins animaux enchaînent gags et petits projets du quotidien.', array['animal crossing','animal crossing new horizons','ac new horizons','journal de l''ile']::text[], false
where pg_temp.catalogue_match(array['Animal Crossing : New Horizons - Le Journal de l''île']) is null
  returning id
)
insert into public.catalogue_enrichment_inserted (manga_id) select id from inserted on conflict do nothing;

-- Les Aventures de Kirby dans les étoiles : enrich a former import under another title, or create it.
with v(title, author, publisher_fr, total_volumes, status, genres, demographic, audience_min_age, synopsis, aliases, is_top_50_fr) as (
  select 'Les Aventures de Kirby dans les étoiles', 'Hirokazu Hikawa', 'Soleil', 25, 'completed'::public.manga_status,
  array['comedie','aventure','fantasy']::text[], 'kodomo', 6, 'Kirby, petite boule rose gourmande, vit des aventures pleines de gags à Dream Land face au roi Dadidou.', array['kirby','kirby manga','hoshi no kirby','aventures de kirby']::text[], false
)
update public.mangas m set
  title = v.title, author = v.author::text, publisher_fr = v.publisher_fr::text, total_volumes = v.total_volumes::integer,
  status = v.status, genres = v.genres, demographic = v.demographic::text, audience_min_age = v.audience_min_age::smallint,
  synopsis = v.synopsis,
  aliases = array(select distinct a from unnest(coalesce(m.aliases, '{}'::text[]) || lower(m.title) || v.aliases) a where a <> lower(v.title))
from v
where m.id = pg_temp.catalogue_match(array['Les Aventures de Kirby dans les étoiles','hoshi no kirby']);

with inserted as (
insert into public.mangas (title, author, publisher_fr, total_volumes, status, genres, demographic, audience_min_age, synopsis, aliases, is_top_50_fr)
select 'Les Aventures de Kirby dans les étoiles', 'Hirokazu Hikawa', 'Soleil', 25, 'completed'::public.manga_status,
  array['comedie','aventure','fantasy']::text[], 'kodomo', 6, 'Kirby, petite boule rose gourmande, vit des aventures pleines de gags à Dream Land face au roi Dadidou.', array['kirby','kirby manga','hoshi no kirby','aventures de kirby']::text[], false
where pg_temp.catalogue_match(array['Les Aventures de Kirby dans les étoiles','hoshi no kirby']) is null
  returning id
)
insert into public.catalogue_enrichment_inserted (manga_id) select id from inserted on conflict do nothing;

-- Splatoon : enrich a former import under another title, or create it.
with v(title, author, publisher_fr, total_volumes, status, genres, demographic, audience_min_age, synopsis, aliases, is_top_50_fr) as (
  select 'Splatoon', 'Sankichi Hinodeya', 'Soleil', 16, 'completed'::public.manga_status,
  array['action','comedie','aventure']::text[], 'kodomo', 8, 'Des Inklings, mi-enfants mi-calmars, s''affrontent à coups d''encre dans des matchs colorés en équipe.', array['splatoon manga','splatoon 3','splatoon la contree clabousse']::text[], false
)
update public.mangas m set
  title = v.title, author = v.author::text, publisher_fr = v.publisher_fr::text, total_volumes = v.total_volumes::integer,
  status = v.status, genres = v.genres, demographic = v.demographic::text, audience_min_age = v.audience_min_age::smallint,
  synopsis = v.synopsis,
  aliases = array(select distinct a from unnest(coalesce(m.aliases, '{}'::text[]) || lower(m.title) || v.aliases) a where a <> lower(v.title))
from v
where m.id = pg_temp.catalogue_match(array['Splatoon']);

with inserted as (
insert into public.mangas (title, author, publisher_fr, total_volumes, status, genres, demographic, audience_min_age, synopsis, aliases, is_top_50_fr)
select 'Splatoon', 'Sankichi Hinodeya', 'Soleil', 16, 'completed'::public.manga_status,
  array['action','comedie','aventure']::text[], 'kodomo', 8, 'Des Inklings, mi-enfants mi-calmars, s''affrontent à coups d''encre dans des matchs colorés en équipe.', array['splatoon manga','splatoon 3','splatoon la contree clabousse']::text[], false
where pg_temp.catalogue_match(array['Splatoon']) is null
  returning id
)
insert into public.catalogue_enrichment_inserted (manga_id) select id from inserted on conflict do nothing;

-- The Legend of Zelda - Twilight Princess : enrich a former import under another title, or create it.
with v(title, author, publisher_fr, total_volumes, status, genres, demographic, audience_min_age, synopsis, aliases, is_top_50_fr) as (
  select 'The Legend of Zelda - Twilight Princess', 'Akira Himekawa', 'Soleil', 11, 'completed'::public.manga_status,
  array['aventure','fantasy','action']::text[], 'shonen', 9, 'Le jeune Link est entraîné dans une lutte pour sauver le royaume d''Hyrule, envahi par le monde du crépuscule.', array['zelda','zelda twilight princess','legend of zelda','zelda tp']::text[], false
)
update public.mangas m set
  title = v.title, author = v.author::text, publisher_fr = v.publisher_fr::text, total_volumes = v.total_volumes::integer,
  status = v.status, genres = v.genres, demographic = v.demographic::text, audience_min_age = v.audience_min_age::smallint,
  synopsis = v.synopsis,
  aliases = array(select distinct a from unnest(coalesce(m.aliases, '{}'::text[]) || lower(m.title) || v.aliases) a where a <> lower(v.title))
from v
where m.id = pg_temp.catalogue_match(array['The Legend of Zelda - Twilight Princess']);

with inserted as (
insert into public.mangas (title, author, publisher_fr, total_volumes, status, genres, demographic, audience_min_age, synopsis, aliases, is_top_50_fr)
select 'The Legend of Zelda - Twilight Princess', 'Akira Himekawa', 'Soleil', 11, 'completed'::public.manga_status,
  array['aventure','fantasy','action']::text[], 'shonen', 9, 'Le jeune Link est entraîné dans une lutte pour sauver le royaume d''Hyrule, envahi par le monde du crépuscule.', array['zelda','zelda twilight princess','legend of zelda','zelda tp']::text[], false
where pg_temp.catalogue_match(array['The Legend of Zelda - Twilight Princess']) is null
  returning id
)
insert into public.catalogue_enrichment_inserted (manga_id) select id from inserted on conflict do nothing;

-- Beyblade X : enrich a former import under another title, or create it.
with v(title, author, publisher_fr, total_volumes, status, genres, demographic, audience_min_age, synopsis, aliases, is_top_50_fr) as (
  select 'Beyblade X', 'Homura Kawamoto, Hikaru Muno', 'Crunchyroll (ex-Kazé)', 7, 'ongoing'::public.manga_status,
  array['action','sport']::text[], 'kodomo', 8, 'Le jeune Kazami Bird se lance dans la compétition de Beyblade X pour devenir le meilleur blader.', array['beyblade','beyblade x manga','bayblade x']::text[], false
)
update public.mangas m set
  title = v.title, author = v.author::text, publisher_fr = v.publisher_fr::text, total_volumes = v.total_volumes::integer,
  status = v.status, genres = v.genres, demographic = v.demographic::text, audience_min_age = v.audience_min_age::smallint,
  synopsis = v.synopsis,
  aliases = array(select distinct a from unnest(coalesce(m.aliases, '{}'::text[]) || lower(m.title) || v.aliases) a where a <> lower(v.title))
from v
where m.id = pg_temp.catalogue_match(array['Beyblade X']);

with inserted as (
insert into public.mangas (title, author, publisher_fr, total_volumes, status, genres, demographic, audience_min_age, synopsis, aliases, is_top_50_fr)
select 'Beyblade X', 'Homura Kawamoto, Hikaru Muno', 'Crunchyroll (ex-Kazé)', 7, 'ongoing'::public.manga_status,
  array['action','sport']::text[], 'kodomo', 8, 'Le jeune Kazami Bird se lance dans la compétition de Beyblade X pour devenir le meilleur blader.', array['beyblade','beyblade x manga','bayblade x']::text[], false
where pg_temp.catalogue_match(array['Beyblade X']) is null
  returning id
)
insert into public.catalogue_enrichment_inserted (manga_id) select id from inserted on conflict do nothing;

-- Dragon Quest - The Adventure of Daï : enrich a former import under another title, or create it.
with v(title, author, publisher_fr, total_volumes, status, genres, demographic, audience_min_age, synopsis, aliases, is_top_50_fr) as (
  select 'Dragon Quest - The Adventure of Daï', 'Riku Sanjō, Kōji Inada', 'Delcourt/Tonkam', null, 'completed'::public.manga_status,
  array['aventure','fantasy','action']::text[], 'shonen', 10, 'Daï, apprenti héros élevé sur une île de monstres, part affronter le Seigneur du Mal qui menace le monde.', array['dragon quest dai','fly','la quete de dai','dai no daibouken','dragon quest daï']::text[], false
)
update public.mangas m set
  title = v.title, author = v.author::text, publisher_fr = v.publisher_fr::text, total_volumes = v.total_volumes::integer,
  status = v.status, genres = v.genres, demographic = v.demographic::text, audience_min_age = v.audience_min_age::smallint,
  synopsis = v.synopsis,
  aliases = array(select distinct a from unnest(coalesce(m.aliases, '{}'::text[]) || lower(m.title) || v.aliases) a where a <> lower(v.title))
from v
where m.id = pg_temp.catalogue_match(array['Dragon Quest - The Adventure of Daï','dai no daibouken','dragon quest dai no daibouken','dragon quest the adventure of dai']);

with inserted as (
insert into public.mangas (title, author, publisher_fr, total_volumes, status, genres, demographic, audience_min_age, synopsis, aliases, is_top_50_fr)
select 'Dragon Quest - The Adventure of Daï', 'Riku Sanjō, Kōji Inada', 'Delcourt/Tonkam', null, 'completed'::public.manga_status,
  array['aventure','fantasy','action']::text[], 'shonen', 10, 'Daï, apprenti héros élevé sur une île de monstres, part affronter le Seigneur du Mal qui menace le monde.', array['dragon quest dai','fly','la quete de dai','dai no daibouken','dragon quest daï']::text[], false
where pg_temp.catalogue_match(array['Dragon Quest - The Adventure of Daï','dai no daibouken','dragon quest dai no daibouken','dragon quest the adventure of dai']) is null
  returning id
)
insert into public.catalogue_enrichment_inserted (manga_id) select id from inserted on conflict do nothing;

-- Shaman King : enrich a former import under another title, or create it.
with v(title, author, publisher_fr, total_volumes, status, genres, demographic, audience_min_age, synopsis, aliases, is_top_50_fr) as (
  select 'Shaman King', 'Hiroyuki Takei', 'Kana', 32, 'completed'::public.manga_status,
  array['action','surnaturel','aventure']::text[], 'shonen', 10, 'Yoh, shaman nonchalant, participe avec son esprit samouraï au tournoi qui désignera le Shaman King.', array['shaman kin','shaman king star edition','shamanking']::text[], false
)
update public.mangas m set
  title = v.title, author = v.author::text, publisher_fr = v.publisher_fr::text, total_volumes = v.total_volumes::integer,
  status = v.status, genres = v.genres, demographic = v.demographic::text, audience_min_age = v.audience_min_age::smallint,
  synopsis = v.synopsis,
  aliases = array(select distinct a from unnest(coalesce(m.aliases, '{}'::text[]) || lower(m.title) || v.aliases) a where a <> lower(v.title))
from v
where m.id = pg_temp.catalogue_match(array['Shaman King']);

with inserted as (
insert into public.mangas (title, author, publisher_fr, total_volumes, status, genres, demographic, audience_min_age, synopsis, aliases, is_top_50_fr)
select 'Shaman King', 'Hiroyuki Takei', 'Kana', 32, 'completed'::public.manga_status,
  array['action','surnaturel','aventure']::text[], 'shonen', 10, 'Yoh, shaman nonchalant, participe avec son esprit samouraï au tournoi qui désignera le Shaman King.', array['shaman kin','shaman king star edition','shamanking']::text[], false
where pg_temp.catalogue_match(array['Shaman King']) is null
  returning id
)
insert into public.catalogue_enrichment_inserted (manga_id) select id from inserted on conflict do nothing;

-- Astro Boy : enrich a former import under another title, or create it.
with v(title, author, publisher_fr, total_volumes, status, genres, demographic, audience_min_age, synopsis, aliases, is_top_50_fr) as (
  select 'Astro Boy', 'Osamu Tezuka', 'Kana', null, 'completed'::public.manga_status,
  array['science-fiction','aventure','action']::text[], 'shonen', 8, 'Astro, robot-enfant au cœur humain et aux pouvoirs prodigieux, défend la paix entre humains et robots.', array['astro','astro le petit robot','tetsuwan atom','atom']::text[], false
)
update public.mangas m set
  title = v.title, author = v.author::text, publisher_fr = v.publisher_fr::text, total_volumes = v.total_volumes::integer,
  status = v.status, genres = v.genres, demographic = v.demographic::text, audience_min_age = v.audience_min_age::smallint,
  synopsis = v.synopsis,
  aliases = array(select distinct a from unnest(coalesce(m.aliases, '{}'::text[]) || lower(m.title) || v.aliases) a where a <> lower(v.title))
from v
where m.id = pg_temp.catalogue_match(array['Astro Boy','tetsuwan atom']);

with inserted as (
insert into public.mangas (title, author, publisher_fr, total_volumes, status, genres, demographic, audience_min_age, synopsis, aliases, is_top_50_fr)
select 'Astro Boy', 'Osamu Tezuka', 'Kana', null, 'completed'::public.manga_status,
  array['science-fiction','aventure','action']::text[], 'shonen', 8, 'Astro, robot-enfant au cœur humain et aux pouvoirs prodigieux, défend la paix entre humains et robots.', array['astro','astro le petit robot','tetsuwan atom','atom']::text[], false
where pg_temp.catalogue_match(array['Astro Boy','tetsuwan atom']) is null
  returning id
)
insert into public.catalogue_enrichment_inserted (manga_id) select id from inserted on conflict do nothing;

-- Captain Tsubasa : enrich a former import under another title, or create it.
with v(title, author, publisher_fr, total_volumes, status, genres, demographic, audience_min_age, synopsis, aliases, is_top_50_fr) as (
  select 'Captain Tsubasa', 'Yōichi Takahashi', 'Glénat', 37, 'completed'::public.manga_status,
  array['sport','drame']::text[], 'shonen', 8, 'Tsubasa, prodige du ballon rond, vit pour le football et rêve de mener le Japon au sommet mondial.', array['olive et tom','captain tsubasa olive et tom','tsubasa','olive & tom']::text[], false
)
update public.mangas m set
  title = v.title, author = v.author::text, publisher_fr = v.publisher_fr::text, total_volumes = v.total_volumes::integer,
  status = v.status, genres = v.genres, demographic = v.demographic::text, audience_min_age = v.audience_min_age::smallint,
  synopsis = v.synopsis,
  aliases = array(select distinct a from unnest(coalesce(m.aliases, '{}'::text[]) || lower(m.title) || v.aliases) a where a <> lower(v.title))
from v
where m.id = pg_temp.catalogue_match(array['Captain Tsubasa']);

with inserted as (
insert into public.mangas (title, author, publisher_fr, total_volumes, status, genres, demographic, audience_min_age, synopsis, aliases, is_top_50_fr)
select 'Captain Tsubasa', 'Yōichi Takahashi', 'Glénat', 37, 'completed'::public.manga_status,
  array['sport','drame']::text[], 'shonen', 8, 'Tsubasa, prodige du ballon rond, vit pour le football et rêve de mener le Japon au sommet mondial.', array['olive et tom','captain tsubasa olive et tom','tsubasa','olive & tom']::text[], false
where pg_temp.catalogue_match(array['Captain Tsubasa']) is null
  returning id
)
insert into public.catalogue_enrichment_inserted (manga_id) select id from inserted on conflict do nothing;

-- Dr Slump : enrich a former import under another title, or create it.
with v(title, author, publisher_fr, total_volumes, status, genres, demographic, audience_min_age, synopsis, aliases, is_top_50_fr) as (
  select 'Dr Slump', 'Akira Toriyama', 'Glénat', 18, 'completed'::public.manga_status,
  array['comedie','science-fiction']::text[], 'shonen', 8, 'Au village Pingouin, l''inventeur Senbei crée Arale, une fillette robot surpuissante et complètement loufoque.', array['dr. slump','docteur slump','arale','dr slump arale']::text[], false
)
update public.mangas m set
  title = v.title, author = v.author::text, publisher_fr = v.publisher_fr::text, total_volumes = v.total_volumes::integer,
  status = v.status, genres = v.genres, demographic = v.demographic::text, audience_min_age = v.audience_min_age::smallint,
  synopsis = v.synopsis,
  aliases = array(select distinct a from unnest(coalesce(m.aliases, '{}'::text[]) || lower(m.title) || v.aliases) a where a <> lower(v.title))
from v
where m.id = pg_temp.catalogue_match(array['Dr Slump','dr. slump']);

with inserted as (
insert into public.mangas (title, author, publisher_fr, total_volumes, status, genres, demographic, audience_min_age, synopsis, aliases, is_top_50_fr)
select 'Dr Slump', 'Akira Toriyama', 'Glénat', 18, 'completed'::public.manga_status,
  array['comedie','science-fiction']::text[], 'shonen', 8, 'Au village Pingouin, l''inventeur Senbei crée Arale, une fillette robot surpuissante et complètement loufoque.', array['dr. slump','docteur slump','arale','dr slump arale']::text[], false
where pg_temp.catalogue_match(array['Dr Slump','dr. slump']) is null
  returning id
)
insert into public.catalogue_enrichment_inserted (manga_id) select id from inserted on conflict do nothing;

-- Gunnm : enrich a former import under another title, or create it.
with v(title, author, publisher_fr, total_volumes, status, genres, demographic, audience_min_age, synopsis, aliases, is_top_50_fr) as (
  select 'Gunnm', 'Yukito Kishiro', 'Glénat', 9, 'completed'::public.manga_status,
  array['science-fiction','action','drame']::text[], 'seinen', 13, 'Dans une décharge, le docteur Ido répare une cyborg amnésique, Gally, qui se révèle une combattante redoutable.', array['battle angel alita','alita','gunm','gunnm alita']::text[], false
)
update public.mangas m set
  title = v.title, author = v.author::text, publisher_fr = v.publisher_fr::text, total_volumes = v.total_volumes::integer,
  status = v.status, genres = v.genres, demographic = v.demographic::text, audience_min_age = v.audience_min_age::smallint,
  synopsis = v.synopsis,
  aliases = array(select distinct a from unnest(coalesce(m.aliases, '{}'::text[]) || lower(m.title) || v.aliases) a where a <> lower(v.title))
from v
where m.id = pg_temp.catalogue_match(array['Gunnm','battle angel alita']);

with inserted as (
insert into public.mangas (title, author, publisher_fr, total_volumes, status, genres, demographic, audience_min_age, synopsis, aliases, is_top_50_fr)
select 'Gunnm', 'Yukito Kishiro', 'Glénat', 9, 'completed'::public.manga_status,
  array['science-fiction','action','drame']::text[], 'seinen', 13, 'Dans une décharge, le docteur Ido répare une cyborg amnésique, Gally, qui se révèle une combattante redoutable.', array['battle angel alita','alita','gunm','gunnm alita']::text[], false
where pg_temp.catalogue_match(array['Gunnm','battle angel alita']) is null
  returning id
)
insert into public.catalogue_enrichment_inserted (manga_id) select id from inserted on conflict do nothing;

-- Les Carnets de l'apothicaire : enrich a former import under another title, or create it.
with v(title, author, publisher_fr, total_volumes, status, genres, demographic, audience_min_age, synopsis, aliases, is_top_50_fr) as (
  select 'Les Carnets de l''apothicaire', 'Natsu Hyūga, Nekokurage, Itsuki Nanao', 'Ki-oon', 16, 'ongoing'::public.manga_status,
  array['mystere','historique','drame']::text[], 'seinen', 13, 'Enlevée et placée au palais impérial, la jeune apothicaire Mao Mao résout les mystères qui agitent le harem.', array['the apothecary diaries','kusuriya no hitorigoto','carnets de l''apothicaire','apothicaire','maomao']::text[], false
)
update public.mangas m set
  title = v.title, author = v.author::text, publisher_fr = v.publisher_fr::text, total_volumes = v.total_volumes::integer,
  status = v.status, genres = v.genres, demographic = v.demographic::text, audience_min_age = v.audience_min_age::smallint,
  synopsis = v.synopsis,
  aliases = array(select distinct a from unnest(coalesce(m.aliases, '{}'::text[]) || lower(m.title) || v.aliases) a where a <> lower(v.title))
from v
where m.id = pg_temp.catalogue_match(array['Les Carnets de l''apothicaire','the apothecary diaries','kusuriya no hitorigoto']);

with inserted as (
insert into public.mangas (title, author, publisher_fr, total_volumes, status, genres, demographic, audience_min_age, synopsis, aliases, is_top_50_fr)
select 'Les Carnets de l''apothicaire', 'Natsu Hyūga, Nekokurage, Itsuki Nanao', 'Ki-oon', 16, 'ongoing'::public.manga_status,
  array['mystere','historique','drame']::text[], 'seinen', 13, 'Enlevée et placée au palais impérial, la jeune apothicaire Mao Mao résout les mystères qui agitent le harem.', array['the apothecary diaries','kusuriya no hitorigoto','carnets de l''apothicaire','apothicaire','maomao']::text[], false
where pg_temp.catalogue_match(array['Les Carnets de l''apothicaire','the apothecary diaries','kusuriya no hitorigoto']) is null
  returning id
)
insert into public.catalogue_enrichment_inserted (manga_id) select id from inserted on conflict do nothing;

-- Yotsuba&! : enrich a former import under another title, or create it.
with v(title, author, publisher_fr, total_volumes, status, genres, demographic, audience_min_age, synopsis, aliases, is_top_50_fr) as (
  select 'Yotsuba&!', 'Kiyohiko Azuma', 'Kurokawa', 16, 'ongoing'::public.manga_status,
  array['comedie','tranche-de-vie']::text[], 'shonen', 9, 'Yotsuba, fillette espiègle et curieuse, découvre le monde avec émerveillement dans son nouveau quartier.', array['yotsuba','yotsuba to','yotsubato','yotsuba &!']::text[], false
)
update public.mangas m set
  title = v.title, author = v.author::text, publisher_fr = v.publisher_fr::text, total_volumes = v.total_volumes::integer,
  status = v.status, genres = v.genres, demographic = v.demographic::text, audience_min_age = v.audience_min_age::smallint,
  synopsis = v.synopsis,
  aliases = array(select distinct a from unnest(coalesce(m.aliases, '{}'::text[]) || lower(m.title) || v.aliases) a where a <> lower(v.title))
from v
where m.id = pg_temp.catalogue_match(array['Yotsuba&!','yotsubato','yotsuba to']);

with inserted as (
insert into public.mangas (title, author, publisher_fr, total_volumes, status, genres, demographic, audience_min_age, synopsis, aliases, is_top_50_fr)
select 'Yotsuba&!', 'Kiyohiko Azuma', 'Kurokawa', 16, 'ongoing'::public.manga_status,
  array['comedie','tranche-de-vie']::text[], 'shonen', 9, 'Yotsuba, fillette espiègle et curieuse, découvre le monde avec émerveillement dans son nouveau quartier.', array['yotsuba','yotsuba to','yotsubato','yotsuba &!']::text[], false
where pg_temp.catalogue_match(array['Yotsuba&!','yotsubato','yotsuba to']) is null
  returning id
)
insert into public.catalogue_enrichment_inserted (manga_id) select id from inserted on conflict do nothing;

-- Le Voyage de Chihiro : enrich a former import under another title, or create it.
with v(title, author, publisher_fr, total_volumes, status, genres, demographic, audience_min_age, synopsis, aliases, is_top_50_fr) as (
  select 'Le Voyage de Chihiro', 'Hayao Miyazaki', 'Glénat', null, 'completed'::public.manga_status,
  array['fantasy','aventure']::text[], 'kodomo', 8, 'Égarée dans un monde d''esprits, la jeune Chihiro doit travailler dans un établissement de bains pour sauver ses parents.', array['chihiro','spirited away','sen to chihiro','voyage de chihiro']::text[], false
)
update public.mangas m set
  title = v.title, author = v.author::text, publisher_fr = v.publisher_fr::text, total_volumes = v.total_volumes::integer,
  status = v.status, genres = v.genres, demographic = v.demographic::text, audience_min_age = v.audience_min_age::smallint,
  synopsis = v.synopsis,
  aliases = array(select distinct a from unnest(coalesce(m.aliases, '{}'::text[]) || lower(m.title) || v.aliases) a where a <> lower(v.title))
from v
where m.id = pg_temp.catalogue_match(array['Le Voyage de Chihiro','sen to chihiro no kamikakushi','spirited away']);

with inserted as (
insert into public.mangas (title, author, publisher_fr, total_volumes, status, genres, demographic, audience_min_age, synopsis, aliases, is_top_50_fr)
select 'Le Voyage de Chihiro', 'Hayao Miyazaki', 'Glénat', null, 'completed'::public.manga_status,
  array['fantasy','aventure']::text[], 'kodomo', 8, 'Égarée dans un monde d''esprits, la jeune Chihiro doit travailler dans un établissement de bains pour sauver ses parents.', array['chihiro','spirited away','sen to chihiro','voyage de chihiro']::text[], false
where pg_temp.catalogue_match(array['Le Voyage de Chihiro','sen to chihiro no kamikakushi','spirited away']) is null
  returning id
)
insert into public.catalogue_enrichment_inserted (manga_id) select id from inserted on conflict do nothing;

-- Fruits Basket : enrich a former import under another title, or create it.
with v(title, author, publisher_fr, total_volumes, status, genres, demographic, audience_min_age, synopsis, aliases, is_top_50_fr) as (
  select 'Fruits Basket', 'Natsuki Takaya', 'Delcourt/Tonkam', 23, 'completed'::public.manga_status,
  array['romance','comedie','drame','surnaturel']::text[], 'shojo', 12, 'Tohru, orpheline, vit chez les Sōma, une famille dont les membres se changent en animaux du zodiaque.', array['furuba','fruit basket','fruits basquet']::text[], false
)
update public.mangas m set
  title = v.title, author = v.author::text, publisher_fr = v.publisher_fr::text, total_volumes = v.total_volumes::integer,
  status = v.status, genres = v.genres, demographic = v.demographic::text, audience_min_age = v.audience_min_age::smallint,
  synopsis = v.synopsis,
  aliases = array(select distinct a from unnest(coalesce(m.aliases, '{}'::text[]) || lower(m.title) || v.aliases) a where a <> lower(v.title))
from v
where m.id = pg_temp.catalogue_match(array['Fruits Basket']);

with inserted as (
insert into public.mangas (title, author, publisher_fr, total_volumes, status, genres, demographic, audience_min_age, synopsis, aliases, is_top_50_fr)
select 'Fruits Basket', 'Natsuki Takaya', 'Delcourt/Tonkam', 23, 'completed'::public.manga_status,
  array['romance','comedie','drame','surnaturel']::text[], 'shojo', 12, 'Tohru, orpheline, vit chez les Sōma, une famille dont les membres se changent en animaux du zodiaque.', array['furuba','fruit basket','fruits basquet']::text[], false
where pg_temp.catalogue_match(array['Fruits Basket']) is null
  returning id
)
insert into public.catalogue_enrichment_inserted (manga_id) select id from inserted on conflict do nothing;

-- Card Captor Sakura : enrich a former import under another title, or create it.
with v(title, author, publisher_fr, total_volumes, status, genres, demographic, audience_min_age, synopsis, aliases, is_top_50_fr) as (
  select 'Card Captor Sakura', 'CLAMP', 'Pika', 12, 'completed'::public.manga_status,
  array['fantasy','comedie','romance']::text[], 'shojo', 9, 'Sakura, écolière, doit retrouver les cartes magiques de Clow qu''elle a accidentellement dispersées.', array['cardcaptor sakura','sakura chasseuse de cartes','ccs','card captor']::text[], false
)
update public.mangas m set
  title = v.title, author = v.author::text, publisher_fr = v.publisher_fr::text, total_volumes = v.total_volumes::integer,
  status = v.status, genres = v.genres, demographic = v.demographic::text, audience_min_age = v.audience_min_age::smallint,
  synopsis = v.synopsis,
  aliases = array(select distinct a from unnest(coalesce(m.aliases, '{}'::text[]) || lower(m.title) || v.aliases) a where a <> lower(v.title))
from v
where m.id = pg_temp.catalogue_match(array['Card Captor Sakura','cardcaptor sakura']);

with inserted as (
insert into public.mangas (title, author, publisher_fr, total_volumes, status, genres, demographic, audience_min_age, synopsis, aliases, is_top_50_fr)
select 'Card Captor Sakura', 'CLAMP', 'Pika', 12, 'completed'::public.manga_status,
  array['fantasy','comedie','romance']::text[], 'shojo', 9, 'Sakura, écolière, doit retrouver les cartes magiques de Clow qu''elle a accidentellement dispersées.', array['cardcaptor sakura','sakura chasseuse de cartes','ccs','card captor']::text[], false
where pg_temp.catalogue_match(array['Card Captor Sakura','cardcaptor sakura']) is null
  returning id
)
insert into public.catalogue_enrichment_inserted (manga_id) select id from inserted on conflict do nothing;

-- Sailor Moon : enrich a former import under another title, or create it.
with v(title, author, publisher_fr, total_volumes, status, genres, demographic, audience_min_age, synopsis, aliases, is_top_50_fr) as (
  select 'Sailor Moon', 'Naoko Takeuchi', 'Pika', 12, 'completed'::public.manga_status,
  array['fantasy','romance','action']::text[], 'shojo', 10, 'Usagi, collégienne maladroite, devient Sailor Moon et protège la Terre avec les autres guerrières Sailor.', array['pretty guardian sailor moon','sailormoon','bishoujo senshi sailor moon','sailor moon eternal']::text[], false
)
update public.mangas m set
  title = v.title, author = v.author::text, publisher_fr = v.publisher_fr::text, total_volumes = v.total_volumes::integer,
  status = v.status, genres = v.genres, demographic = v.demographic::text, audience_min_age = v.audience_min_age::smallint,
  synopsis = v.synopsis,
  aliases = array(select distinct a from unnest(coalesce(m.aliases, '{}'::text[]) || lower(m.title) || v.aliases) a where a <> lower(v.title))
from v
where m.id = pg_temp.catalogue_match(array['Sailor Moon','bishoujo senshi sailor moon','pretty guardian sailor moon']);

with inserted as (
insert into public.mangas (title, author, publisher_fr, total_volumes, status, genres, demographic, audience_min_age, synopsis, aliases, is_top_50_fr)
select 'Sailor Moon', 'Naoko Takeuchi', 'Pika', 12, 'completed'::public.manga_status,
  array['fantasy','romance','action']::text[], 'shojo', 10, 'Usagi, collégienne maladroite, devient Sailor Moon et protège la Terre avec les autres guerrières Sailor.', array['pretty guardian sailor moon','sailormoon','bishoujo senshi sailor moon','sailor moon eternal']::text[], false
where pg_temp.catalogue_match(array['Sailor Moon','bishoujo senshi sailor moon','pretty guardian sailor moon']) is null
  returning id
)
insert into public.catalogue_enrichment_inserted (manga_id) select id from inserted on conflict do nothing;

-- Divine Nanami : enrich a former import under another title, or create it.
with v(title, author, publisher_fr, total_volumes, status, genres, demographic, audience_min_age, synopsis, aliases, is_top_50_fr) as (
  select 'Divine Nanami', 'Julietta Suzuki', 'Delcourt/Tonkam', 25, 'completed'::public.manga_status,
  array['romance','comedie','surnaturel']::text[], 'shojo', 12, 'Sans toit, Nanami devient par hasard la divinité d''un temple, servie par Tomoe, un renard démon peu aimable.', array['kamisama kiss','kamisama hajimemashita','kamisama']::text[], false
)
update public.mangas m set
  title = v.title, author = v.author::text, publisher_fr = v.publisher_fr::text, total_volumes = v.total_volumes::integer,
  status = v.status, genres = v.genres, demographic = v.demographic::text, audience_min_age = v.audience_min_age::smallint,
  synopsis = v.synopsis,
  aliases = array(select distinct a from unnest(coalesce(m.aliases, '{}'::text[]) || lower(m.title) || v.aliases) a where a <> lower(v.title))
from v
where m.id = pg_temp.catalogue_match(array['Divine Nanami','kamisama hajimemashita','kamisama kiss']);

with inserted as (
insert into public.mangas (title, author, publisher_fr, total_volumes, status, genres, demographic, audience_min_age, synopsis, aliases, is_top_50_fr)
select 'Divine Nanami', 'Julietta Suzuki', 'Delcourt/Tonkam', 25, 'completed'::public.manga_status,
  array['romance','comedie','surnaturel']::text[], 'shojo', 12, 'Sans toit, Nanami devient par hasard la divinité d''un temple, servie par Tomoe, un renard démon peu aimable.', array['kamisama kiss','kamisama hajimemashita','kamisama']::text[], false
where pg_temp.catalogue_match(array['Divine Nanami','kamisama hajimemashita','kamisama kiss']) is null
  returning id
)
insert into public.catalogue_enrichment_inserted (manga_id) select id from inserted on conflict do nothing;

-- Blue Period : enrich a former import under another title, or create it.
with v(title, author, publisher_fr, total_volumes, status, genres, demographic, audience_min_age, synopsis, aliases, is_top_50_fr) as (
  select 'Blue Period', 'Tsubasa Yamaguchi', 'Pika', 18, 'ongoing'::public.manga_status,
  array['drame','tranche-de-vie']::text[], 'seinen', 13, 'Yatora, lycéen brillant mais blasé, se découvre une passion pour la peinture et vise les Beaux-Arts de Tokyo.', array['bluperiod','blue periode','blue period manga']::text[], false
)
update public.mangas m set
  title = v.title, author = v.author::text, publisher_fr = v.publisher_fr::text, total_volumes = v.total_volumes::integer,
  status = v.status, genres = v.genres, demographic = v.demographic::text, audience_min_age = v.audience_min_age::smallint,
  synopsis = v.synopsis,
  aliases = array(select distinct a from unnest(coalesce(m.aliases, '{}'::text[]) || lower(m.title) || v.aliases) a where a <> lower(v.title))
from v
where m.id = pg_temp.catalogue_match(array['Blue Period']);

with inserted as (
insert into public.mangas (title, author, publisher_fr, total_volumes, status, genres, demographic, audience_min_age, synopsis, aliases, is_top_50_fr)
select 'Blue Period', 'Tsubasa Yamaguchi', 'Pika', 18, 'ongoing'::public.manga_status,
  array['drame','tranche-de-vie']::text[], 'seinen', 13, 'Yatora, lycéen brillant mais blasé, se découvre une passion pour la peinture et vise les Beaux-Arts de Tokyo.', array['bluperiod','blue periode','blue period manga']::text[], false
where pg_temp.catalogue_match(array['Blue Period']) is null
  returning id
)
insert into public.catalogue_enrichment_inserted (manga_id) select id from inserted on conflict do nothing;

-- Kiki la petite sorcière : enrich a former import under another title, or create it.
with v(title, author, publisher_fr, total_volumes, status, genres, demographic, audience_min_age, synopsis, aliases, is_top_50_fr) as (
  select 'Kiki la petite sorcière', 'Hayao Miyazaki', 'Glénat', 1, 'completed'::public.manga_status,
  array['fantasy','tranche-de-vie']::text[], 'kodomo', 6, 'À 13 ans, la sorcière Kiki s''installe seule dans une ville portuaire et lance un service de livraison en balai.', array['kiki','kiki''s delivery service','majo no takkyubin','kiki la petite sorciere']::text[], false
)
update public.mangas m set
  title = v.title, author = v.author::text, publisher_fr = v.publisher_fr::text, total_volumes = v.total_volumes::integer,
  status = v.status, genres = v.genres, demographic = v.demographic::text, audience_min_age = v.audience_min_age::smallint,
  synopsis = v.synopsis,
  aliases = array(select distinct a from unnest(coalesce(m.aliases, '{}'::text[]) || lower(m.title) || v.aliases) a where a <> lower(v.title))
from v
where m.id = pg_temp.catalogue_match(array['Kiki la petite sorcière','majo no takkyuubin','majo no takkyubin']);

with inserted as (
insert into public.mangas (title, author, publisher_fr, total_volumes, status, genres, demographic, audience_min_age, synopsis, aliases, is_top_50_fr)
select 'Kiki la petite sorcière', 'Hayao Miyazaki', 'Glénat', 1, 'completed'::public.manga_status,
  array['fantasy','tranche-de-vie']::text[], 'kodomo', 6, 'À 13 ans, la sorcière Kiki s''installe seule dans une ville portuaire et lance un service de livraison en balai.', array['kiki','kiki''s delivery service','majo no takkyubin','kiki la petite sorciere']::text[], false
where pg_temp.catalogue_match(array['Kiki la petite sorcière','majo no takkyuubin','majo no takkyubin']) is null
  returning id
)
insert into public.catalogue_enrichment_inserted (manga_id) select id from inserted on conflict do nothing;

-- Beastars : enrich a former import under another title, or create it.
with v(title, author, publisher_fr, total_volumes, status, genres, demographic, audience_min_age, synopsis, aliases, is_top_50_fr) as (
  select 'Beastars', 'Paru Itagaki', 'Ki-oon', 22, 'completed'::public.manga_status,
  array['drame','mystere','romance','psychologique']::text[], 'shonen', 13, 'Dans un lycée d''animaux anthropomorphes, le loup Legoshi lutte contre ses instincts de prédateur.', array['beastar','beastars manga','beast stars']::text[], false
)
update public.mangas m set
  title = v.title, author = v.author::text, publisher_fr = v.publisher_fr::text, total_volumes = v.total_volumes::integer,
  status = v.status, genres = v.genres, demographic = v.demographic::text, audience_min_age = v.audience_min_age::smallint,
  synopsis = v.synopsis,
  aliases = array(select distinct a from unnest(coalesce(m.aliases, '{}'::text[]) || lower(m.title) || v.aliases) a where a <> lower(v.title))
from v
where m.id = pg_temp.catalogue_match(array['Beastars']);

with inserted as (
insert into public.mangas (title, author, publisher_fr, total_volumes, status, genres, demographic, audience_min_age, synopsis, aliases, is_top_50_fr)
select 'Beastars', 'Paru Itagaki', 'Ki-oon', 22, 'completed'::public.manga_status,
  array['drame','mystere','romance','psychologique']::text[], 'shonen', 13, 'Dans un lycée d''animaux anthropomorphes, le loup Legoshi lutte contre ses instincts de prédateur.', array['beastar','beastars manga','beast stars']::text[], false
where pg_temp.catalogue_match(array['Beastars']) is null
  returning id
)
insert into public.catalogue_enrichment_inserted (manga_id) select id from inserted on conflict do nothing;

-- Tokyo Revengers : enrich a former import under another title, or create it.
with v(title, author, publisher_fr, total_volumes, status, genres, demographic, audience_min_age, synopsis, aliases, is_top_50_fr) as (
  select 'Tokyo Revengers', 'Ken Wakui', 'Glénat', 31, 'completed'::public.manga_status,
  array['action','drame','science-fiction']::text[], 'shonen', 14, 'Renvoyé douze ans en arrière, Takemichi infiltre un gang de délinquants pour sauver son ex-petite amie.', array['tokyo revenger','tokyo revengers manga','tokrev']::text[], false
)
update public.mangas m set
  title = v.title, author = v.author::text, publisher_fr = v.publisher_fr::text, total_volumes = v.total_volumes::integer,
  status = v.status, genres = v.genres, demographic = v.demographic::text, audience_min_age = v.audience_min_age::smallint,
  synopsis = v.synopsis,
  aliases = array(select distinct a from unnest(coalesce(m.aliases, '{}'::text[]) || lower(m.title) || v.aliases) a where a <> lower(v.title))
from v
where m.id = pg_temp.catalogue_match(array['Tokyo Revengers']);

with inserted as (
insert into public.mangas (title, author, publisher_fr, total_volumes, status, genres, demographic, audience_min_age, synopsis, aliases, is_top_50_fr)
select 'Tokyo Revengers', 'Ken Wakui', 'Glénat', 31, 'completed'::public.manga_status,
  array['action','drame','science-fiction']::text[], 'shonen', 14, 'Renvoyé douze ans en arrière, Takemichi infiltre un gang de délinquants pour sauver son ex-petite amie.', array['tokyo revenger','tokyo revengers manga','tokrev']::text[], false
where pg_temp.catalogue_match(array['Tokyo Revengers']) is null
  returning id
)
insert into public.catalogue_enrichment_inserted (manga_id) select id from inserted on conflict do nothing;

-- Dorohedoro : enrich a former import under another title, or create it.
with v(title, author, publisher_fr, total_volumes, status, genres, demographic, audience_min_age, synopsis, aliases, is_top_50_fr) as (
  select 'Dorohedoro', 'Q Hayashida', 'Soleil', 23, 'completed'::public.manga_status,
  array['fantasy','horreur','action','comedie']::text[], 'seinen', 16, 'Caïman, homme à tête de reptile amnésique, traque les sorciers pour retrouver celui qui l''a transformé.', array['doro hedoro','dorohedro']::text[], false
)
update public.mangas m set
  title = v.title, author = v.author::text, publisher_fr = v.publisher_fr::text, total_volumes = v.total_volumes::integer,
  status = v.status, genres = v.genres, demographic = v.demographic::text, audience_min_age = v.audience_min_age::smallint,
  synopsis = v.synopsis,
  aliases = array(select distinct a from unnest(coalesce(m.aliases, '{}'::text[]) || lower(m.title) || v.aliases) a where a <> lower(v.title))
from v
where m.id = pg_temp.catalogue_match(array['Dorohedoro']);

with inserted as (
insert into public.mangas (title, author, publisher_fr, total_volumes, status, genres, demographic, audience_min_age, synopsis, aliases, is_top_50_fr)
select 'Dorohedoro', 'Q Hayashida', 'Soleil', 23, 'completed'::public.manga_status,
  array['fantasy','horreur','action','comedie']::text[], 'seinen', 16, 'Caïman, homme à tête de reptile amnésique, traque les sorciers pour retrouver celui qui l''a transformé.', array['doro hedoro','dorohedro']::text[], false
where pg_temp.catalogue_match(array['Dorohedoro']) is null
  returning id
)
insert into public.catalogue_enrichment_inserted (manga_id) select id from inserted on conflict do nothing;

-- Hirayasumi : enrich a former import under another title, or create it.
with v(title, author, publisher_fr, total_volumes, status, genres, demographic, audience_min_age, synopsis, aliases, is_top_50_fr) as (
  select 'Hirayasumi', 'Keigo Shinzō', 'Le Lézard Noir', 10, 'ongoing'::public.manga_status,
  array['tranche-de-vie','comedie','drame']::text[], 'seinen', 14, 'Hiroto, trentenaire sans ambition, hérite d''une maison à Tokyo et y accueille sa jeune cousine venue étudier.', array['hira yasumi','hirayasumi manga']::text[], false
)
update public.mangas m set
  title = v.title, author = v.author::text, publisher_fr = v.publisher_fr::text, total_volumes = v.total_volumes::integer,
  status = v.status, genres = v.genres, demographic = v.demographic::text, audience_min_age = v.audience_min_age::smallint,
  synopsis = v.synopsis,
  aliases = array(select distinct a from unnest(coalesce(m.aliases, '{}'::text[]) || lower(m.title) || v.aliases) a where a <> lower(v.title))
from v
where m.id = pg_temp.catalogue_match(array['Hirayasumi']);

with inserted as (
insert into public.mangas (title, author, publisher_fr, total_volumes, status, genres, demographic, audience_min_age, synopsis, aliases, is_top_50_fr)
select 'Hirayasumi', 'Keigo Shinzō', 'Le Lézard Noir', 10, 'ongoing'::public.manga_status,
  array['tranche-de-vie','comedie','drame']::text[], 'seinen', 14, 'Hiroto, trentenaire sans ambition, hérite d''une maison à Tokyo et y accueille sa jeune cousine venue étudier.', array['hira yasumi','hirayasumi manga']::text[], false
where pg_temp.catalogue_match(array['Hirayasumi']) is null
  returning id
)
insert into public.catalogue_enrichment_inserted (manga_id) select id from inserted on conflict do nothing;

-- L'Ère des cristaux : enrich a former import under another title, or create it.
with v(title, author, publisher_fr, total_volumes, status, genres, demographic, audience_min_age, synopsis, aliases, is_top_50_fr) as (
  select 'L''Ère des cristaux', 'Haruko Ichikawa', 'Glénat', 12, 'completed'::public.manga_status,
  array['fantasy','drame','science-fiction']::text[], 'seinen', 14, 'Sur une terre lointaine, des êtres de pierres précieuses luttent contre les Séléniens ; la fragile Phos cherche sa place.', array['houseki no kuni','land of the lustrous','le pays des cristaux','pays des cristaux','ere des cristaux']::text[], false
)
update public.mangas m set
  title = v.title, author = v.author::text, publisher_fr = v.publisher_fr::text, total_volumes = v.total_volumes::integer,
  status = v.status, genres = v.genres, demographic = v.demographic::text, audience_min_age = v.audience_min_age::smallint,
  synopsis = v.synopsis,
  aliases = array(select distinct a from unnest(coalesce(m.aliases, '{}'::text[]) || lower(m.title) || v.aliases) a where a <> lower(v.title))
from v
where m.id = pg_temp.catalogue_match(array['L''Ère des cristaux','houseki no kuni','land of the lustrous']);

with inserted as (
insert into public.mangas (title, author, publisher_fr, total_volumes, status, genres, demographic, audience_min_age, synopsis, aliases, is_top_50_fr)
select 'L''Ère des cristaux', 'Haruko Ichikawa', 'Glénat', 12, 'completed'::public.manga_status,
  array['fantasy','drame','science-fiction']::text[], 'seinen', 14, 'Sur une terre lointaine, des êtres de pierres précieuses luttent contre les Séléniens ; la fragile Phos cherche sa place.', array['houseki no kuni','land of the lustrous','le pays des cristaux','pays des cristaux','ere des cristaux']::text[], false
where pg_temp.catalogue_match(array['L''Ère des cristaux','houseki no kuni','land of the lustrous']) is null
  returning id
)
insert into public.catalogue_enrichment_inserted (manga_id) select id from inserted on conflict do nothing;

-- Look Back : enrich a former import under another title, or create it.
with v(title, author, publisher_fr, total_volumes, status, genres, demographic, audience_min_age, synopsis, aliases, is_top_50_fr) as (
  select 'Look Back', 'Tatsuki Fujimoto', 'Crunchyroll (ex-Kazé)', 1, 'completed'::public.manga_status,
  array['drame','tranche-de-vie']::text[], 'shonen', 14, 'Deux collégiennes que tout oppose se lient par leur passion commune du dessin de manga.', array['lookback','look back fujimoto']::text[], false
)
update public.mangas m set
  title = v.title, author = v.author::text, publisher_fr = v.publisher_fr::text, total_volumes = v.total_volumes::integer,
  status = v.status, genres = v.genres, demographic = v.demographic::text, audience_min_age = v.audience_min_age::smallint,
  synopsis = v.synopsis,
  aliases = array(select distinct a from unnest(coalesce(m.aliases, '{}'::text[]) || lower(m.title) || v.aliases) a where a <> lower(v.title))
from v
where m.id = pg_temp.catalogue_match(array['Look Back']);

with inserted as (
insert into public.mangas (title, author, publisher_fr, total_volumes, status, genres, demographic, audience_min_age, synopsis, aliases, is_top_50_fr)
select 'Look Back', 'Tatsuki Fujimoto', 'Crunchyroll (ex-Kazé)', 1, 'completed'::public.manga_status,
  array['drame','tranche-de-vie']::text[], 'shonen', 14, 'Deux collégiennes que tout oppose se lient par leur passion commune du dessin de manga.', array['lookback','look back fujimoto']::text[], false
where pg_temp.catalogue_match(array['Look Back']) is null
  returning id
)
insert into public.catalogue_enrichment_inserted (manga_id) select id from inserted on conflict do nothing;

-- Ranma ½ : enrich a former import under another title, or create it.
with v(title, author, publisher_fr, total_volumes, status, genres, demographic, audience_min_age, synopsis, aliases, is_top_50_fr) as (
  select 'Ranma ½', 'Rumiko Takahashi', 'Glénat', 38, 'completed'::public.manga_status,
  array['comedie','romance','action']::text[], 'shonen', 12, 'Ranma, adepte des arts martiaux, se transforme en fille au contact de l''eau froide, au grand dam de sa fiancée.', array['ranma','ranma 1/2','ranma un demi','ranma nibunnoichi']::text[], false
)
update public.mangas m set
  title = v.title, author = v.author::text, publisher_fr = v.publisher_fr::text, total_volumes = v.total_volumes::integer,
  status = v.status, genres = v.genres, demographic = v.demographic::text, audience_min_age = v.audience_min_age::smallint,
  synopsis = v.synopsis,
  aliases = array(select distinct a from unnest(coalesce(m.aliases, '{}'::text[]) || lower(m.title) || v.aliases) a where a <> lower(v.title))
from v
where m.id = pg_temp.catalogue_match(array['Ranma ½','ranma 1/2','ranma nibunnoichi']);

with inserted as (
insert into public.mangas (title, author, publisher_fr, total_volumes, status, genres, demographic, audience_min_age, synopsis, aliases, is_top_50_fr)
select 'Ranma ½', 'Rumiko Takahashi', 'Glénat', 38, 'completed'::public.manga_status,
  array['comedie','romance','action']::text[], 'shonen', 12, 'Ranma, adepte des arts martiaux, se transforme en fille au contact de l''eau froide, au grand dam de sa fiancée.', array['ranma','ranma 1/2','ranma un demi','ranma nibunnoichi']::text[], false
where pg_temp.catalogue_match(array['Ranma ½','ranma 1/2','ranma nibunnoichi']) is null
  returning id
)
insert into public.catalogue_enrichment_inserted (manga_id) select id from inserted on conflict do nothing;

-- Saint Seiya : enrich a former import under another title, or create it.
with v(title, author, publisher_fr, total_volumes, status, genres, demographic, audience_min_age, synopsis, aliases, is_top_50_fr) as (
  select 'Saint Seiya', 'Masami Kurumada', 'Kana', 28, 'completed'::public.manga_status,
  array['action','fantasy','aventure']::text[], 'shonen', 10, 'Seiya et les chevaliers de bronze protègent la déesse Athéna face aux forces qui menacent la Terre.', array['les chevaliers du zodiaque','saint seiya chevaliers du zodiaque','chevaliers du zodiaque','seiya']::text[], false
)
update public.mangas m set
  title = v.title, author = v.author::text, publisher_fr = v.publisher_fr::text, total_volumes = v.total_volumes::integer,
  status = v.status, genres = v.genres, demographic = v.demographic::text, audience_min_age = v.audience_min_age::smallint,
  synopsis = v.synopsis,
  aliases = array(select distinct a from unnest(coalesce(m.aliases, '{}'::text[]) || lower(m.title) || v.aliases) a where a <> lower(v.title))
from v
where m.id = pg_temp.catalogue_match(array['Saint Seiya']);

with inserted as (
insert into public.mangas (title, author, publisher_fr, total_volumes, status, genres, demographic, audience_min_age, synopsis, aliases, is_top_50_fr)
select 'Saint Seiya', 'Masami Kurumada', 'Kana', 28, 'completed'::public.manga_status,
  array['action','fantasy','aventure']::text[], 'shonen', 10, 'Seiya et les chevaliers de bronze protègent la déesse Athéna face aux forces qui menacent la Terre.', array['les chevaliers du zodiaque','saint seiya chevaliers du zodiaque','chevaliers du zodiaque','seiya']::text[], false
where pg_temp.catalogue_match(array['Saint Seiya']) is null
  returning id
)
insert into public.catalogue_enrichment_inserted (manga_id) select id from inserted on conflict do nothing;

insert into public.editorial_selections (slug, title, description, position)
values ('premiers-mangas', 'Pour un premier manga', 'Faciles à lire, drôles ou doux, parfaits pour commencer.', 0)
on conflict (slug) do update set title = excluded.title, description = excluded.description, position = excluded.position;

insert into public.editorial_selection_items (selection_id, manga_id, position, note)
select s.id, m.id, 0, null
from public.editorial_selections s, lateral (
  select id from public.mangas where created_by is null and merged_into is null and lower(title) = lower('Chi - Une vie de chat') order by is_top_50_fr desc, created_at limit 1
) m
where s.slug = 'premiers-mangas'
on conflict (selection_id, manga_id) do update set position = excluded.position, note = excluded.note;

insert into public.editorial_selection_items (selection_id, manga_id, position, note)
select s.id, m.id, 1, null
from public.editorial_selections s, lateral (
  select id from public.mangas where created_by is null and merged_into is null and lower(title) = lower('Yotsuba&!') order by is_top_50_fr desc, created_at limit 1
) m
where s.slug = 'premiers-mangas'
on conflict (selection_id, manga_id) do update set position = excluded.position, note = excluded.note;

insert into public.editorial_selection_items (selection_id, manga_id, position, note)
select s.id, m.id, 2, null
from public.editorial_selections s, lateral (
  select id from public.mangas where created_by is null and merged_into is null and lower(title) = lower('Les Aventures de Kirby dans les étoiles') order by is_top_50_fr desc, created_at limit 1
) m
where s.slug = 'premiers-mangas'
on conflict (selection_id, manga_id) do update set position = excluded.position, note = excluded.note;

insert into public.editorial_selection_items (selection_id, manga_id, position, note)
select s.id, m.id, 3, null
from public.editorial_selections s, lateral (
  select id from public.mangas where created_by is null and merged_into is null and lower(title) = lower('Doraemon') order by is_top_50_fr desc, created_at limit 1
) m
where s.slug = 'premiers-mangas'
on conflict (selection_id, manga_id) do update set position = excluded.position, note = excluded.note;

insert into public.editorial_selection_items (selection_id, manga_id, position, note)
select s.id, m.id, 4, null
from public.editorial_selections s, lateral (
  select id from public.mangas where created_by is null and merged_into is null and lower(title) = lower('Animal Crossing : New Horizons - Le Journal de l''île') order by is_top_50_fr desc, created_at limit 1
) m
where s.slug = 'premiers-mangas'
on conflict (selection_id, manga_id) do update set position = excluded.position, note = excluded.note;

insert into public.editorial_selection_items (selection_id, manga_id, position, note)
select s.id, m.id, 5, null
from public.editorial_selections s, lateral (
  select id from public.mangas where created_by is null and merged_into is null and lower(title) = lower('Pokémon - La Grande Aventure') order by is_top_50_fr desc, created_at limit 1
) m
where s.slug = 'premiers-mangas'
on conflict (selection_id, manga_id) do update set position = excluded.position, note = excluded.note;

insert into public.editorial_selections (slug, title, description, position)
values ('grandes-aventures', 'Grandes aventures', 'Des voyages au long cours, des équipages et des mondes à explorer.', 1)
on conflict (slug) do update set title = excluded.title, description = excluded.description, position = excluded.position;

insert into public.editorial_selection_items (selection_id, manga_id, position, note)
select s.id, m.id, 0, null
from public.editorial_selections s, lateral (
  select id from public.mangas where created_by is null and merged_into is null and lower(title) = lower('One Piece') order by is_top_50_fr desc, created_at limit 1
) m
where s.slug = 'grandes-aventures'
on conflict (selection_id, manga_id) do update set position = excluded.position, note = excluded.note;

insert into public.editorial_selection_items (selection_id, manga_id, position, note)
select s.id, m.id, 1, null
from public.editorial_selections s, lateral (
  select id from public.mangas where created_by is null and merged_into is null and lower(title) = lower('Dragon Quest - The Adventure of Daï') order by is_top_50_fr desc, created_at limit 1
) m
where s.slug = 'grandes-aventures'
on conflict (selection_id, manga_id) do update set position = excluded.position, note = excluded.note;

insert into public.editorial_selection_items (selection_id, manga_id, position, note)
select s.id, m.id, 2, null
from public.editorial_selections s, lateral (
  select id from public.mangas where created_by is null and merged_into is null and lower(title) = lower('L''Atelier des sorciers') order by is_top_50_fr desc, created_at limit 1
) m
where s.slug = 'grandes-aventures'
on conflict (selection_id, manga_id) do update set position = excluded.position, note = excluded.note;

insert into public.editorial_selection_items (selection_id, manga_id, position, note)
select s.id, m.id, 3, null
from public.editorial_selections s, lateral (
  select id from public.mangas where created_by is null and merged_into is null and lower(title) = lower('Dr. Stone') order by is_top_50_fr desc, created_at limit 1
) m
where s.slug = 'grandes-aventures'
on conflict (selection_id, manga_id) do update set position = excluded.position, note = excluded.note;

insert into public.editorial_selection_items (selection_id, manga_id, position, note)
select s.id, m.id, 4, null
from public.editorial_selections s, lateral (
  select id from public.mangas where created_by is null and merged_into is null and lower(title) = lower('Naruto') order by is_top_50_fr desc, created_at limit 1
) m
where s.slug = 'grandes-aventures'
on conflict (selection_id, manga_id) do update set position = excluded.position, note = excluded.note;

insert into public.editorial_selection_items (selection_id, manga_id, position, note)
select s.id, m.id, 5, null
from public.editorial_selections s, lateral (
  select id from public.mangas where created_by is null and merged_into is null and lower(title) = lower('Fullmetal Alchemist') order by is_top_50_fr desc, created_at limit 1
) m
where s.slug = 'grandes-aventures'
on conflict (selection_id, manga_id) do update set position = excluded.position, note = excluded.note;

insert into public.editorial_selections (slug, title, description, position)
values ('courtes', 'Courtes, à finir vite', 'Des histoires complètes en 12 tomes ou moins.', 2)
on conflict (slug) do update set title = excluded.title, description = excluded.description, position = excluded.position;

insert into public.editorial_selection_items (selection_id, manga_id, position, note)
select s.id, m.id, 0, null
from public.editorial_selections s, lateral (
  select id from public.mangas where created_by is null and merged_into is null and lower(title) = lower('Nausicaä de la vallée du vent') order by is_top_50_fr desc, created_at limit 1
) m
where s.slug = 'courtes'
on conflict (selection_id, manga_id) do update set position = excluded.position, note = excluded.note;

insert into public.editorial_selection_items (selection_id, manga_id, position, note)
select s.id, m.id, 1, null
from public.editorial_selections s, lateral (
  select id from public.mangas where created_by is null and merged_into is null and lower(title) = lower('Pluto') order by is_top_50_fr desc, created_at limit 1
) m
where s.slug = 'courtes'
on conflict (selection_id, manga_id) do update set position = excluded.position, note = excluded.note;

insert into public.editorial_selection_items (selection_id, manga_id, position, note)
select s.id, m.id, 2, null
from public.editorial_selections s, lateral (
  select id from public.mangas where created_by is null and merged_into is null and lower(title) = lower('Chi - Une vie de chat') order by is_top_50_fr desc, created_at limit 1
) m
where s.slug = 'courtes'
on conflict (selection_id, manga_id) do update set position = excluded.position, note = excluded.note;

insert into public.editorial_selection_items (selection_id, manga_id, position, note)
select s.id, m.id, 3, null
from public.editorial_selections s, lateral (
  select id from public.mangas where created_by is null and merged_into is null and lower(title) = lower('The Legend of Zelda - Twilight Princess') order by is_top_50_fr desc, created_at limit 1
) m
where s.slug = 'courtes'
on conflict (selection_id, manga_id) do update set position = excluded.position, note = excluded.note;

insert into public.editorial_selection_items (selection_id, manga_id, position, note)
select s.id, m.id, 4, null
from public.editorial_selections s, lateral (
  select id from public.mangas where created_by is null and merged_into is null and lower(title) = lower('Gunnm') order by is_top_50_fr desc, created_at limit 1
) m
where s.slug = 'courtes'
on conflict (selection_id, manga_id) do update set position = excluded.position, note = excluded.note;

insert into public.editorial_selection_items (selection_id, manga_id, position, note)
select s.id, m.id, 5, null
from public.editorial_selections s, lateral (
  select id from public.mangas where created_by is null and merged_into is null and lower(title) = lower('Card Captor Sakura') order by is_top_50_fr desc, created_at limit 1
) m
where s.slug = 'courtes'
on conflict (selection_id, manga_id) do update set position = excluded.position, note = excluded.note;

insert into public.editorial_selection_items (selection_id, manga_id, position, note)
select s.id, m.id, 6, null
from public.editorial_selections s, lateral (
  select id from public.mangas where created_by is null and merged_into is null and lower(title) = lower('Sailor Moon') order by is_top_50_fr desc, created_at limit 1
) m
where s.slug = 'courtes'
on conflict (selection_id, manga_id) do update set position = excluded.position, note = excluded.note;

insert into public.editorial_selection_items (selection_id, manga_id, position, note)
select s.id, m.id, 7, null
from public.editorial_selections s, lateral (
  select id from public.mangas where created_by is null and merged_into is null and lower(title) = lower('Kiki la petite sorcière') order by is_top_50_fr desc, created_at limit 1
) m
where s.slug = 'courtes'
on conflict (selection_id, manga_id) do update set position = excluded.position, note = excluded.note;

insert into public.editorial_selections (slug, title, description, position)
values ('sport', 'Sport et dépassement', 'Des matchs, des équipes, et l''envie de progresser.', 3)
on conflict (slug) do update set title = excluded.title, description = excluded.description, position = excluded.position;

insert into public.editorial_selection_items (selection_id, manga_id, position, note)
select s.id, m.id, 0, null
from public.editorial_selections s, lateral (
  select id from public.mangas where created_by is null and merged_into is null and lower(title) = lower('Haikyū!! Les As du volley') order by is_top_50_fr desc, created_at limit 1
) m
where s.slug = 'sport'
on conflict (selection_id, manga_id) do update set position = excluded.position, note = excluded.note;

insert into public.editorial_selection_items (selection_id, manga_id, position, note)
select s.id, m.id, 1, null
from public.editorial_selections s, lateral (
  select id from public.mangas where created_by is null and merged_into is null and lower(title) = lower('Slam Dunk') order by is_top_50_fr desc, created_at limit 1
) m
where s.slug = 'sport'
on conflict (selection_id, manga_id) do update set position = excluded.position, note = excluded.note;

insert into public.editorial_selection_items (selection_id, manga_id, position, note)
select s.id, m.id, 2, null
from public.editorial_selections s, lateral (
  select id from public.mangas where created_by is null and merged_into is null and lower(title) = lower('Captain Tsubasa') order by is_top_50_fr desc, created_at limit 1
) m
where s.slug = 'sport'
on conflict (selection_id, manga_id) do update set position = excluded.position, note = excluded.note;

insert into public.editorial_selection_items (selection_id, manga_id, position, note)
select s.id, m.id, 3, null
from public.editorial_selections s, lateral (
  select id from public.mangas where created_by is null and merged_into is null and lower(title) = lower('Blue Lock') order by is_top_50_fr desc, created_at limit 1
) m
where s.slug = 'sport'
on conflict (selection_id, manga_id) do update set position = excluded.position, note = excluded.note;

insert into public.editorial_selection_items (selection_id, manga_id, position, note)
select s.id, m.id, 4, null
from public.editorial_selections s, lateral (
  select id from public.mangas where created_by is null and merged_into is null and lower(title) = lower('Ao Ashi') order by is_top_50_fr desc, created_at limit 1
) m
where s.slug = 'sport'
on conflict (selection_id, manga_id) do update set position = excluded.position, note = excluded.note;

insert into public.editorial_selections (slug, title, description, position)
values ('pour-rire', 'Pour rire', 'Des séries où l''humour est roi.', 4)
on conflict (slug) do update set title = excluded.title, description = excluded.description, position = excluded.position;

insert into public.editorial_selection_items (selection_id, manga_id, position, note)
select s.id, m.id, 0, null
from public.editorial_selections s, lateral (
  select id from public.mangas where created_by is null and merged_into is null and lower(title) = lower('Spy x Family') order by is_top_50_fr desc, created_at limit 1
) m
where s.slug = 'pour-rire'
on conflict (selection_id, manga_id) do update set position = excluded.position, note = excluded.note;

insert into public.editorial_selection_items (selection_id, manga_id, position, note)
select s.id, m.id, 1, null
from public.editorial_selections s, lateral (
  select id from public.mangas where created_by is null and merged_into is null and lower(title) = lower('Mashle') order by is_top_50_fr desc, created_at limit 1
) m
where s.slug = 'pour-rire'
on conflict (selection_id, manga_id) do update set position = excluded.position, note = excluded.note;

insert into public.editorial_selection_items (selection_id, manga_id, position, note)
select s.id, m.id, 2, null
from public.editorial_selections s, lateral (
  select id from public.mangas where created_by is null and merged_into is null and lower(title) = lower('Dr Slump') order by is_top_50_fr desc, created_at limit 1
) m
where s.slug = 'pour-rire'
on conflict (selection_id, manga_id) do update set position = excluded.position, note = excluded.note;

insert into public.editorial_selection_items (selection_id, manga_id, position, note)
select s.id, m.id, 3, null
from public.editorial_selections s, lateral (
  select id from public.mangas where created_by is null and merged_into is null and lower(title) = lower('Yo-kai Watch') order by is_top_50_fr desc, created_at limit 1
) m
where s.slug = 'pour-rire'
on conflict (selection_id, manga_id) do update set position = excluded.position, note = excluded.note;

insert into public.editorial_selection_items (selection_id, manga_id, position, note)
select s.id, m.id, 4, null
from public.editorial_selections s, lateral (
  select id from public.mangas where created_by is null and merged_into is null and lower(title) = lower('Sakamoto Days') order by is_top_50_fr desc, created_at limit 1
) m
where s.slug = 'pour-rire'
on conflict (selection_id, manga_id) do update set position = excluded.position, note = excluded.note;

insert into public.editorial_selection_items (selection_id, manga_id, position, note)
select s.id, m.id, 5, null
from public.editorial_selections s, lateral (
  select id from public.mangas where created_by is null and merged_into is null and lower(title) = lower('Kaguya-sama : Love is War') order by is_top_50_fr desc, created_at limit 1
) m
where s.slug = 'pour-rire'
on conflict (selection_id, manga_id) do update set position = excluded.position, note = excluded.note;

insert into public.editorial_selections (slug, title, description, position)
values ('enquetes', 'Mystères et enquêtes', 'Des énigmes à résoudre, des secrets à percer.', 5)
on conflict (slug) do update set title = excluded.title, description = excluded.description, position = excluded.position;

insert into public.editorial_selection_items (selection_id, manga_id, position, note)
select s.id, m.id, 0, null
from public.editorial_selections s, lateral (
  select id from public.mangas where created_by is null and merged_into is null and lower(title) = lower('Détective Conan') order by is_top_50_fr desc, created_at limit 1
) m
where s.slug = 'enquetes'
on conflict (selection_id, manga_id) do update set position = excluded.position, note = excluded.note;

insert into public.editorial_selection_items (selection_id, manga_id, position, note)
select s.id, m.id, 1, null
from public.editorial_selections s, lateral (
  select id from public.mangas where created_by is null and merged_into is null and lower(title) = lower('Les Carnets de l''apothicaire') order by is_top_50_fr desc, created_at limit 1
) m
where s.slug = 'enquetes'
on conflict (selection_id, manga_id) do update set position = excluded.position, note = excluded.note;

insert into public.editorial_selection_items (selection_id, manga_id, position, note)
select s.id, m.id, 2, null
from public.editorial_selections s, lateral (
  select id from public.mangas where created_by is null and merged_into is null and lower(title) = lower('The Promised Neverland') order by is_top_50_fr desc, created_at limit 1
) m
where s.slug = 'enquetes'
on conflict (selection_id, manga_id) do update set position = excluded.position, note = excluded.note;

insert into public.editorial_selection_items (selection_id, manga_id, position, note)
select s.id, m.id, 3, null
from public.editorial_selections s, lateral (
  select id from public.mangas where created_by is null and merged_into is null and lower(title) = lower('Death Note') order by is_top_50_fr desc, created_at limit 1
) m
where s.slug = 'enquetes'
on conflict (selection_id, manga_id) do update set position = excluded.position, note = excluded.note;

insert into public.editorial_selection_items (selection_id, manga_id, position, note)
select s.id, m.id, 4, null
from public.editorial_selections s, lateral (
  select id from public.mangas where created_by is null and merged_into is null and lower(title) = lower('Monster') order by is_top_50_fr desc, created_at limit 1
) m
where s.slug = 'enquetes'
on conflict (selection_id, manga_id) do update set position = excluded.position, note = excluded.note;

insert into public.editorial_selection_items (selection_id, manga_id, position, note)
select s.id, m.id, 5, null
from public.editorial_selections s, lateral (
  select id from public.mangas where created_by is null and merged_into is null and lower(title) = lower('20th Century Boys') order by is_top_50_fr desc, created_at limit 1
) m
where s.slug = 'enquetes'
on conflict (selection_id, manga_id) do update set position = excluded.position, note = excluded.note;


-- Editorial flag for the series above.
update public.mangas set curated = true
where created_by is null and merged_into is null and title in ('20th Century Boys', 'Animal Crossing : New Horizons - Le Journal de l''île', 'Ao Ashi', 'Assassination Classroom', 'Astro Boy', 'Beastars', 'Berserk', 'Beyblade X', 'Black Clover', 'Bleach', 'Blue Lock', 'Blue Period', 'Boruto - Naruto Next Generations', 'Captain Tsubasa', 'Card Captor Sakura', 'Chainsaw Man', 'Chi - Une vie de chat', 'Dandadan', 'Death Note', 'Demon Slayer', 'Divine Nanami', 'Doraemon', 'Dorohedoro', 'Dr Slump', 'Dr. Stone', 'Dragon Ball', 'Dragon Ball Super', 'Dragon Quest - The Adventure of Daï', 'Détective Conan', 'Fairy Tail', 'Fire Force', 'Food Wars!', 'Frieren', 'Fruits Basket', 'Fullmetal Alchemist', 'Gloutons & Dragons', 'Gunnm', 'Haikyū!! Les As du volley', 'Hell''s Paradise', 'Hirayasumi', 'Hunter x Hunter', 'Jujutsu Kaisen', 'Kaguya-sama : Love is War', 'Kaiju n°8', 'Kiki la petite sorcière', 'Kingdom', 'L''Atelier des sorciers', 'L''Attaque des Titans', 'L''Ère des cristaux', 'Le Voyage de Chihiro', 'Les Aventures de Kirby dans les étoiles', 'Les Carnets de l''apothicaire', 'Look Back', 'Mashle', 'Monster', 'My Hero Academia', 'Naruto', 'Nausicaä de la vallée du vent', 'Omniscient Reader''s Viewpoint', 'One Piece', 'Oshi no Ko', 'Pluto', 'Pokémon - La Grande Aventure', 'Ranma ½', 'Sailor Moon', 'Saint Seiya', 'Sakamoto Days', 'Shaman King', 'Slam Dunk', 'Solo Leveling', 'Splatoon', 'Spy x Family', 'Super Mario Manga Adventures', 'Sword Art Online', 'The Legend of Zelda - Twilight Princess', 'The Promised Neverland', 'Toilet-bound Hanako-kun', 'Tokyo Ghoul', 'Tokyo Revengers', 'Undead Unluck', 'Vagabond', 'Vinland Saga', 'Wind Breaker', 'Yo-kai Watch', 'Yotsuba&!');

-- Ages : ONLY recommendations of the CNLJ (Centre national de la littérature
-- pour la jeunesse, BnF), checked one by one on 2026-10-16 in the "Manga mania !"
-- selections (cnlj.bnf.fr) and the BnF catalogue. Everything else is unknown :
-- the estimates of the first research pass are removed, not hidden.
-- scope 'series' : the selection lists the whole series under an age heading.
-- scope 'volume' : only some volumes were reviewed ; never used for the series.
update public.mangas set audience_min_age = null, audience_age_source = null,
  audience_age_scope = null, audience_age_volumes = null, audience_age_ref = null, audience_age_year = null
where created_by is null and merged_into is null and curated;
update public.mangas set audience_min_age = 9, audience_age_source = 'cnlj', audience_age_scope = 'series', audience_age_ref = 'https://cnlj.bnf.fr/sites/default/files/bibliographies/mangamania-2026.pdf' where created_by is null and merged_into is null and title = 'One Piece';
update public.mangas set audience_min_age = 9, audience_age_source = 'cnlj', audience_age_scope = 'series', audience_age_ref = 'https://cnlj.bnf.fr/sites/default/files/bibliographies/mangamania-2026.pdf' where created_by is null and merged_into is null and title = 'Naruto';
update public.mangas set audience_min_age = 9, audience_age_source = 'cnlj', audience_age_scope = 'series', audience_age_ref = 'https://cnlj.bnf.fr/sites/default/files/bibliographies/mangamania-2026.pdf' where created_by is null and merged_into is null and title = 'Dragon Ball';
update public.mangas set audience_min_age = 14, audience_age_source = 'cnlj', audience_age_scope = 'series', audience_age_ref = 'https://cnlj.bnf.fr/sites/default/files/bibliographies/mangamania-2026.pdf' where created_by is null and merged_into is null and title = 'L''Attaque des Titans';
update public.mangas set audience_min_age = 12, audience_age_source = 'cnlj', audience_age_scope = 'series', audience_age_ref = 'https://cnlj.bnf.fr/sites/default/files/bibliographies/mangamania-2026.pdf' where created_by is null and merged_into is null and title = 'Demon Slayer';
update public.mangas set audience_min_age = 11, audience_age_source = 'cnlj', audience_age_scope = 'series', audience_age_ref = 'https://cnlj.bnf.fr/sites/default/files/bibliographies/mangamania-2026.pdf' where created_by is null and merged_into is null and title = 'Jujutsu Kaisen';
update public.mangas set audience_min_age = 11, audience_age_source = 'cnlj', audience_age_scope = 'series', audience_age_ref = 'https://cnlj.bnf.fr/sites/default/files/bibliographies/mangamania-2026.pdf' where created_by is null and merged_into is null and title = 'My Hero Academia';
update public.mangas set audience_min_age = 12, audience_age_source = 'cnlj', audience_age_scope = 'series', audience_age_ref = 'https://cnlj.bnf.fr/sites/default/files/bibliographies/mangamania-2026.pdf' where created_by is null and merged_into is null and title = 'Spy x Family';
update public.mangas set audience_min_age = 11, audience_age_source = 'cnlj', audience_age_scope = 'series', audience_age_ref = 'https://cnlj.bnf.fr/sites/default/files/cnlj-mangamania-2024.pdf' where created_by is null and merged_into is null and title = 'Blue Lock';
update public.mangas set audience_min_age = 13, audience_age_source = 'cnlj', audience_age_scope = 'series', audience_age_ref = 'https://cnlj.bnf.fr/sites/default/files/bibliographies/mangamania-2026.pdf' where created_by is null and merged_into is null and title = 'Frieren';
update public.mangas set audience_min_age = 11, audience_age_source = 'cnlj', audience_age_scope = 'series', audience_age_ref = 'https://cnlj.bnf.fr/sites/default/files/bibliographies/mangamania-2026.pdf' where created_by is null and merged_into is null and title = 'Fairy Tail';
update public.mangas set audience_min_age = 13, audience_age_source = 'cnlj', audience_age_scope = 'series', audience_age_ref = 'https://cnlj.bnf.fr/sites/default/files/bibliographies/mangamania-2026.pdf' where created_by is null and merged_into is null and title = 'Vinland Saga';
update public.mangas set audience_min_age = 14, audience_age_source = 'cnlj', audience_age_scope = 'series', audience_age_ref = 'https://cnlj.bnf.fr/sites/default/files/bibliographies/mangamania-2026.pdf' where created_by is null and merged_into is null and title = 'Kingdom';
update public.mangas set audience_min_age = 11, audience_age_source = 'cnlj', audience_age_scope = 'series', audience_age_ref = 'https://cnlj.bnf.fr/sites/default/files/bibliographies/mangamania-2026.pdf' where created_by is null and merged_into is null and title = 'Dr. Stone';
update public.mangas set audience_min_age = 12, audience_age_source = 'cnlj', audience_age_scope = 'series', audience_age_ref = 'https://cnlj.bnf.fr/sites/default/files/bibliographies/mangamania-2026.pdf' where created_by is null and merged_into is null and title = 'The Promised Neverland';
update public.mangas set audience_min_age = 11, audience_age_source = 'cnlj', audience_age_scope = 'series', audience_age_ref = 'https://cnlj.bnf.fr/sites/default/files/bibliographies/mangamania-2026.pdf' where created_by is null and merged_into is null and title = 'Haikyū!! Les As du volley';
update public.mangas set audience_min_age = 13, audience_age_source = 'cnlj', audience_age_scope = 'series', audience_age_ref = 'https://cnlj.bnf.fr/sites/default/files/bibliographies/mangamania-2026.pdf' where created_by is null and merged_into is null and title = 'Kaguya-sama : Love is War';
update public.mangas set audience_min_age = 11, audience_age_source = 'cnlj', audience_age_scope = 'series', audience_age_ref = 'https://cnlj.bnf.fr/sites/default/files/bibliographies/mangamania-2026.pdf' where created_by is null and merged_into is null and title = 'Toilet-bound Hanako-kun';
update public.mangas set audience_min_age = 11, audience_age_source = 'cnlj', audience_age_scope = 'series', audience_age_ref = 'https://cnlj.bnf.fr/sites/default/files/bibliographies/mangamania-2026.pdf' where created_by is null and merged_into is null and title = 'L''Atelier des sorciers';
update public.mangas set audience_min_age = 9, audience_age_source = 'cnlj', audience_age_scope = 'series', audience_age_ref = 'https://cnlj.bnf.fr/sites/default/files/cnlj-mangamania-2022.pdf' where created_by is null and merged_into is null and title = 'Boruto - Naruto Next Generations';
update public.mangas set audience_min_age = 13, audience_age_source = 'cnlj', audience_age_scope = 'series', audience_age_ref = 'https://cnlj.bnf.fr/sites/default/files/bibliographies/mangamania-2026.pdf' where created_by is null and merged_into is null and title = 'Assassination Classroom';
update public.mangas set audience_min_age = 6, audience_age_source = 'cnlj', audience_age_scope = 'series', audience_age_ref = 'https://cnlj.bnf.fr/sites/default/files/bibliographies/mangamania-2026.pdf' where created_by is null and merged_into is null and title = 'Chi - Une vie de chat';
update public.mangas set audience_min_age = 13, audience_age_source = 'cnlj', audience_age_scope = 'series', audience_age_ref = 'https://cnlj.bnf.fr/sites/default/files/bibliographies/mangamania-2026.pdf' where created_by is null and merged_into is null and title = 'Les Carnets de l''apothicaire';
update public.mangas set audience_min_age = 9, audience_age_source = 'cnlj', audience_age_scope = 'series', audience_age_ref = 'https://cnlj.bnf.fr/sites/default/files/bibliographies/mangamania-2026.pdf' where created_by is null and merged_into is null and title = 'Yotsuba&!';
update public.mangas set audience_min_age = 13, audience_age_source = 'cnlj', audience_age_scope = 'series', audience_age_ref = 'https://cnlj.bnf.fr/sites/default/files/bibliographies/mangamania-2026.pdf' where created_by is null and merged_into is null and title = 'Blue Period';
update public.mangas set audience_min_age = 13, audience_age_source = 'cnlj', audience_age_scope = 'series', audience_age_ref = 'https://cnlj.bnf.fr/sites/default/files/bibliographies/mangamania-2026.pdf' where created_by is null and merged_into is null and title = 'Beastars';
update public.mangas set audience_min_age = 13, audience_age_source = 'cnlj', audience_age_scope = 'volume', audience_age_volumes = array[1,2,3,4]::integer[], audience_age_ref = 'https://catalogue.bnf.fr/ark:/12148/cb467357159' where created_by is null and merged_into is null and title = 'Solo Leveling';
update public.mangas set audience_min_age = 15, audience_age_source = 'cnlj', audience_age_scope = 'volume', audience_age_volumes = array[1,3]::integer[], audience_age_ref = 'https://catalogue.bnf.fr/ark:/12148/cb47401740j' where created_by is null and merged_into is null and title = 'Omniscient Reader''s Viewpoint';

-- Selection notes carried estimated ages in an earlier version : no age is
-- ever stated without a verified source.
update public.editorial_selection_items set note = null where note ~ '^dès [0-9]+ ans$';

-- Year of each source, shown with the age : a reference from an earlier
-- selection stays dated, never presented as the current selection.
update public.mangas set audience_age_year = (regexp_match(audience_age_ref, 'mangamania-(\d{4})'))[1]::smallint
where audience_age_source = 'cnlj' and audience_age_ref ~ 'mangamania-\d{4}';
