-- ============================================================
-- Catalogue growth : 139 series from the CNLJ (BnF) "Manga mania !"
-- selections (2022, 2024, 2025, 2026) and "Flash" booklets, with the age
-- they give. Researched on 2026-10-24 : one agent filled each entry from
-- publisher sites, Manga-news, Nautiljon, Wikipédia FR and the BnF
-- catalogue, a second agent fact-checked it (31 corrections applied).
-- Synopses are written for Yomushelf, not copied. Unknown volume counts
-- are left null.
--
-- * Only inserts : a series is skipped when a shared row already has its
--   title, one of its aliases or its MyAnimeList id. Readers' rows are
--   never touched.
-- * Ages : audience_age_source 'cnlj' with scope 'series' when the
--   selection lists the whole series, 'volume' when only some volumes
--   were reviewed (never used as the series' age).
-- * Covers come from the nightly catalogue-covers job (MyAnimeList id, else
--   the French volume 1 on Google Books, same publisher).
-- * "GE, good ending" (CNLJ 13+) is left out : MyAnimeList flags its
--   content, and the import rules refuse such entries.
-- Rollback : supabase/rollbacks/20261024000100_catalogue_cnlj_growth_down.sql
-- ============================================================

create table if not exists public.catalogue_growth_inserted (
  manga_id uuid primary key references public.mangas(id) on delete cascade,
  batch text not null,
  inserted_at timestamptz not null default now()
);
alter table public.catalogue_growth_inserted enable row level security;
revoke all on public.catalogue_growth_inserted from anon, authenticated;

create or replace function pg_temp.catalogue_has(p_keys text[], p_mal integer)
returns boolean
language sql
stable
as $$
  -- Keys in another script (kana, hangul) normalise to '' or to a stray
  -- digit or letter : only keys of 3 characters or more count. The
  -- MyAnimeList id still catches a real duplicate.
  with keys as (
    select public.normalize_search(k) as key from unnest(p_keys) k
    where length(public.normalize_search(k)) >= 3
  )
  select exists (
    select 1 from public.mangas m
    where m.created_by is null and m.merged_into is null
      and (
        public.normalize_search(m.title) in (select key from keys)
        or exists (select 1 from unnest(coalesce(m.aliases, '{}'::text[])) a
                   where public.normalize_search(a) in (select key from keys))
        or (p_mal is not null and m.external_ids ->> 'mal_id' = p_mal::text)
      )
  )
$$;

with inserted as (
insert into public.mangas (title, author, publisher_fr, total_volumes, status, genres, demographic, synopsis, aliases, external_ids, curated, is_top_50_fr,
  audience_min_age, audience_age_source, audience_age_scope, audience_age_volumes, audience_age_ref, audience_age_year)
select 'Lucika Lucika', 'Yoshitoshi Abe', 'Ki-oon', 10, 'completed'::public.manga_status,
  array['tranche-de-vie','comedie','fantasy']::text[], 'shonen', 'Une fillette pleine d''imagination transforme chaque petit moment du quotidien familial en aventure, dans un manga tout en couleurs.', array['ryushika ryushika','リューシカ・リューシカ','ryuushika ryuushika']::text[], '{"mal_id":21676}'::jsonb, true, false,
  6, 'cnlj', 'series', null, 'https://cnlj.bnf.fr/sites/default/files/bibliographies/mangamania-2026.pdf', 2026
where not pg_temp.catalogue_has(array['Lucika Lucika','ryushika ryushika','リューシカ・リューシカ','ryuushika ryuushika']::text[], 21676)
returning id
)
insert into public.catalogue_growth_inserted (manga_id, batch) select id, 'cnlj-2026-10' from inserted;

with inserted as (
insert into public.mangas (title, author, publisher_fr, total_volumes, status, genres, demographic, synopsis, aliases, external_ids, curated, is_top_50_fr,
  audience_min_age, audience_age_source, audience_age_scope, audience_age_volumes, audience_age_ref, audience_age_year)
select 'Ochibi et ses amis', 'Moyoco Anno', 'Rue de Sèvres', 2, 'ongoing'::public.manga_status,
  array['tranche-de-vie','comedie']::text[], null, 'Au fil des saisons, un petit garçon au bonnet rayé et ses deux chiens complices découvrent les fêtes et traditions du Japon.', array['オチビサン']::text[], '{"mal_id":69047}'::jsonb, true, false,
  6, 'cnlj', 'series', null, 'https://cnlj.bnf.fr/sites/default/files/bibliographies/mangamania-2026.pdf', 2026
where not pg_temp.catalogue_has(array['Ochibi et ses amis','オチビサン']::text[], 69047)
returning id
)
insert into public.catalogue_growth_inserted (manga_id, batch) select id, 'cnlj-2026-10' from inserted;

with inserted as (
insert into public.mangas (title, author, publisher_fr, total_volumes, status, genres, demographic, synopsis, aliases, external_ids, curated, is_top_50_fr,
  audience_min_age, audience_age_source, audience_age_scope, audience_age_volumes, audience_age_ref, audience_age_year)
select 'Pan''Pan panda : une vie en douceur', 'Sato Horokura', 'nobi nobi !', 5, 'completed'::public.manga_status,
  array['tranche-de-vie','comedie','cuisine']::text[], null, 'Un grand panda gardien de résidence et une fillette qui adore cuisiner partagent rencontres, fêtes et petits plats du quotidien japonais.', array['pan''pan panda','pan pan panda','fuku yomo','fukuyomo','ふくよも']::text[], '{"mal_id":21070}'::jsonb, true, false,
  6, 'cnlj', 'series', null, 'https://cnlj.bnf.fr/sites/default/files/bibliographies/mangamania-2026.pdf', 2026
where not pg_temp.catalogue_has(array['Pan''Pan panda : une vie en douceur','pan''pan panda','pan pan panda','fuku yomo','fukuyomo','ふくよも']::text[], 21070)
returning id
)
insert into public.catalogue_growth_inserted (manga_id, batch) select id, 'cnlj-2026-10' from inserted;

with inserted as (
insert into public.mangas (title, author, publisher_fr, total_volumes, status, genres, demographic, synopsis, aliases, external_ids, curated, is_top_50_fr,
  audience_min_age, audience_age_source, audience_age_scope, audience_age_volumes, audience_age_ref, audience_age_year)
select 'Petit requin', 'Penguin Box', 'Rue de Sèvres', 5, 'ongoing'::public.manga_status,
  array['tranche-de-vie','comedie']::text[], null, 'Un bébé requin vit en ville parmi les humains et part en balade au cinéma, à la bibliothèque ou à l''aquarium, presque sans texte.', array['odekake kozame','おでかけ子ザメ']::text[], '{"mal_id":158220}'::jsonb, true, false,
  6, 'cnlj', 'series', null, 'https://cnlj.bnf.fr/sites/default/files/bibliographies/mangamania-2026.pdf', 2026
where not pg_temp.catalogue_has(array['Petit requin','odekake kozame','おでかけ子ザメ']::text[], 158220)
returning id
)
insert into public.catalogue_growth_inserted (manga_id, batch) select id, 'cnlj-2026-10' from inserted;

with inserted as (
insert into public.mangas (title, author, publisher_fr, total_volumes, status, genres, demographic, synopsis, aliases, external_ids, curated, is_top_50_fr,
  audience_min_age, audience_age_source, audience_age_scope, audience_age_volumes, audience_age_ref, audience_age_year)
select 'Fukuneko : les chats du bonheur', 'Mari Matsuzawa', 'nobi nobi !', 4, 'completed'::public.manga_status,
  array['tranche-de-vie','surnaturel','drame']::text[], null, 'Installée à la campagne avec sa fratrie, une fillette boudeuse trouve du réconfort auprès d''un chat-esprit qu''elle seule voit sous forme humaine.', array['fukuneko','fukuneko les chats du bonheur','ふくねこ']::text[], '{}'::jsonb, true, false,
  8, 'cnlj', 'series', null, 'https://cnlj.bnf.fr/sites/default/files/bibliographies/mangamania-2026.pdf', 2026
where not pg_temp.catalogue_has(array['Fukuneko : les chats du bonheur','fukuneko','fukuneko les chats du bonheur','ふくねこ']::text[], null)
returning id
)
insert into public.catalogue_growth_inserted (manga_id, batch) select id, 'cnlj-2026-10' from inserted;

with inserted as (
insert into public.mangas (title, author, publisher_fr, total_volumes, status, genres, demographic, synopsis, aliases, external_ids, curated, is_top_50_fr,
  audience_min_age, audience_age_source, audience_age_scope, audience_age_volumes, audience_age_ref, audience_age_year)
select 'Minuscule', 'Takuto Kashiki', 'Komikku', 13, 'ongoing'::public.manga_status,
  array['tranche-de-vie','fantasy','aventure']::text[], 'seinen', 'Deux amies hautes de quelques centimètres vivent dans un arbre et explorent la forêt à dos de scarabée, entre petits boulots et grandes découvertes.', array['hakumei to mikochi','hakumei and mikochi','ハクメイとミコチ']::text[], '{"mal_id":80841}'::jsonb, true, false,
  8, 'cnlj', 'series', null, 'https://cnlj.bnf.fr/sites/default/files/bibliographies/mangamania-2026.pdf', 2026
where not pg_temp.catalogue_has(array['Minuscule','hakumei to mikochi','hakumei and mikochi','ハクメイとミコチ']::text[], 80841)
returning id
)
insert into public.catalogue_growth_inserted (manga_id, batch) select id, 'cnlj-2026-10' from inserted;

with inserted as (
insert into public.mangas (title, author, publisher_fr, total_volumes, status, genres, demographic, synopsis, aliases, external_ids, curated, is_top_50_fr,
  audience_min_age, audience_age_source, audience_age_scope, audience_age_volumes, audience_age_ref, audience_age_year)
select 'Momo et Ichi : petits esprits de la campagne', 'Kumichou', 'nobi nobi !', 3, 'completed'::public.manga_status,
  array['tranche-de-vie','surnaturel','comedie']::text[], 'seinen', 'Revenue vivre chez sa grand-mère à la campagne, une jeune femme épuisée voit son quotidien chamboulé par un tanuki et un renard déguisés en fillettes.', array['たぬきときつねと里暮らし']::text[], '{"mal_id":133271}'::jsonb, true, false,
  8, 'cnlj', 'series', null, 'https://cnlj.bnf.fr/sites/default/files/bibliographies/mangamania-2026.pdf', 2026
where not pg_temp.catalogue_has(array['Momo et Ichi : petits esprits de la campagne','たぬきときつねと里暮らし']::text[], 133271)
returning id
)
insert into public.catalogue_growth_inserted (manga_id, batch) select id, 'cnlj-2026-10' from inserted;

with inserted as (
insert into public.mangas (title, author, publisher_fr, total_volumes, status, genres, demographic, synopsis, aliases, external_ids, curated, is_top_50_fr,
  audience_min_age, audience_age_source, audience_age_scope, audience_age_volumes, audience_age_ref, audience_age_year)
select 'Moon et Iro', 'Wonsangi', 'Milan (Yam Yam)', 2, 'completed'::public.manga_status,
  array['aventure','fantasy','drame']::text[], null, 'Sur une île de pêcheurs, une orpheline pleine d''énergie cache un triton blessé et doit le protéger des chasseurs qui le traquent.', array['moon and iro']::text[], '{}'::jsonb, true, false,
  8, 'cnlj', 'series', null, 'https://cnlj.bnf.fr/sites/default/files/bibliographies/mangamania-2026.pdf', 2026
where not pg_temp.catalogue_has(array['Moon et Iro','moon and iro']::text[], null)
returning id
)
insert into public.catalogue_growth_inserted (manga_id, batch) select id, 'cnlj-2026-10' from inserted;

with inserted as (
insert into public.mangas (title, author, publisher_fr, total_volumes, status, genres, demographic, synopsis, aliases, external_ids, curated, is_top_50_fr,
  audience_min_age, audience_age_source, audience_age_scope, audience_age_volumes, audience_age_ref, audience_age_year)
select 'Yuzu, la petite vétérinaire', 'Mingo Ito', 'Nobi Nobi !', 7, 'completed'::public.manga_status,
  array['tranche-de-vie','drame','comedie']::text[], 'shojo', 'Pendant l''hospitalisation de sa mère, une fillette intimidée par les animaux aide son oncle dans sa clinique vétérinaire et apprend à soigner ses patients.', array['yuzu la petite veterinaire','yuzu the pet vet','yuzu no doubutsu karte','yuzu no doubutsu karte: kochira wan nyan doubutsu byouin','ゆずのどうぶつカルテ']::text[], '{"mal_id":118030}'::jsonb, true, false,
  8, 'cnlj', 'series', null, 'https://cnlj.bnf.fr/sites/default/files/bibliographies/mangamania-2026.pdf', 2026
where not pg_temp.catalogue_has(array['Yuzu, la petite vétérinaire','yuzu la petite veterinaire','yuzu the pet vet','yuzu no doubutsu karte','yuzu no doubutsu karte: kochira wan nyan doubutsu byouin','ゆずのどうぶつカルテ']::text[], 118030)
returning id
)
insert into public.catalogue_growth_inserted (manga_id, batch) select id, 'cnlj-2026-10' from inserted;

with inserted as (
insert into public.mangas (title, author, publisher_fr, total_volumes, status, genres, demographic, synopsis, aliases, external_ids, curated, is_top_50_fr,
  audience_min_age, audience_age_source, audience_age_scope, audience_age_volumes, audience_age_ref, audience_age_year)
select 'Bâillements de l''après-midi', 'Shin''ya Komatsu', 'IMHO', 2, 'ongoing'::public.manga_status,
  array['tranche-de-vie','fantasy']::text[], null, 'Dans une petite ville paisible, une jeune femme rêveuse croise au fil de courtes histoires mille petits prodiges glissés dans le quotidien.', array['baillements de l''apres-midi','gogo no akubi','afternoon yawns','午后のあくび']::text[], '{"mal_id":139652}'::jsonb, true, false,
  9, 'cnlj', 'series', null, 'https://cnlj.bnf.fr/sites/default/files/bibliographies/mangamania-2026.pdf', 2026
where not pg_temp.catalogue_has(array['Bâillements de l''après-midi','baillements de l''apres-midi','gogo no akubi','afternoon yawns','午后のあくび']::text[], 139652)
returning id
)
insert into public.catalogue_growth_inserted (manga_id, batch) select id, 'cnlj-2026-10' from inserted;

with inserted as (
insert into public.mangas (title, author, publisher_fr, total_volumes, status, genres, demographic, synopsis, aliases, external_ids, curated, is_top_50_fr,
  audience_min_age, audience_age_source, audience_age_scope, audience_age_volumes, audience_age_ref, audience_age_year)
select 'Beyond the clouds : la fillette tombée du ciel', 'Nicke', 'Ki-oon (Kizuna)', 5, 'completed'::public.manga_status,
  array['aventure','fantasy','drame']::text[], null, 'Dans une cité industrielle noyée de fumée, un jeune mécanicien recueille une fillette ailée sans mémoire et part avec elle percer le mystère de ses origines.', array['beyond the clouds','beyond the clouds la fillette tombee du ciel','beyond the clouds: the girl who fell from the sky','空から落ちた少女']::text[], '{}'::jsonb, true, false,
  9, 'cnlj', 'series', null, 'https://cnlj.bnf.fr/sites/default/files/bibliographies/mangamania-2026.pdf', 2026
where not pg_temp.catalogue_has(array['Beyond the clouds : la fillette tombée du ciel','beyond the clouds','beyond the clouds la fillette tombee du ciel','beyond the clouds: the girl who fell from the sky','空から落ちた少女']::text[], null)
returning id
)
insert into public.catalogue_growth_inserted (manga_id, batch) select id, 'cnlj-2026-10' from inserted;

with inserted as (
insert into public.mangas (title, author, publisher_fr, total_volumes, status, genres, demographic, synopsis, aliases, external_ids, curated, is_top_50_fr,
  audience_min_age, audience_age_source, audience_age_scope, audience_age_volumes, audience_age_ref, audience_age_year)
select 'Le concierge du grand magasin', 'Tsuchika Nishimura', 'Le Lézard Noir', 1, 'completed'::public.manga_status,
  array['tranche-de-vie','fantasy','comedie']::text[], 'seinen', 'Pour ses débuts dans un grand magasin dont les clients sont des animaux souvent disparus, une jeune concierge fait tout pour satisfaire chacun.', array['hokkyoku hyakkaten no concierge-san','the concierge at hokkyoku department store','北極百貨店のコンシェルジュさん']::text[], '{"mal_id":110191}'::jsonb, true, false,
  9, 'cnlj', 'series', null, 'https://cnlj.bnf.fr/sites/default/files/bibliographies/mangamania-2026.pdf', 2026
where not pg_temp.catalogue_has(array['Le concierge du grand magasin','hokkyoku hyakkaten no concierge-san','the concierge at hokkyoku department store','北極百貨店のコンシェルジュさん']::text[], 110191)
returning id
)
insert into public.catalogue_growth_inserted (manga_id, batch) select id, 'cnlj-2026-10' from inserted;

with inserted as (
insert into public.mangas (title, author, publisher_fr, total_volumes, status, genres, demographic, synopsis, aliases, external_ids, curated, is_top_50_fr,
  audience_min_age, audience_age_source, audience_age_scope, audience_age_volumes, audience_age_ref, audience_age_year)
select 'Hanada le garnement', 'Makoto Isshiki', 'Ki-oon (Kizuna)', 5, 'completed'::public.manga_status,
  array['comedie','surnaturel','tranche-de-vie']::text[], 'seinen', 'Après un accident, le pire chenapan du village se met à voir des fantômes, qui viennent tous lui demander un coup de main avant de partir en paix.', array['hanada shounen-shi','hanada shonen shi','the chronicles of young hanada','花田少年史']::text[], '{"mal_id":5505}'::jsonb, true, false,
  9, 'cnlj', 'series', null, 'https://cnlj.bnf.fr/sites/default/files/bibliographies/mangamania-2026.pdf', 2026
where not pg_temp.catalogue_has(array['Hanada le garnement','hanada shounen-shi','hanada shonen shi','the chronicles of young hanada','花田少年史']::text[], 5505)
returning id
)
insert into public.catalogue_growth_inserted (manga_id, batch) select id, 'cnlj-2026-10' from inserted;

with inserted as (
insert into public.mangas (title, author, publisher_fr, total_volumes, status, genres, demographic, synopsis, aliases, external_ids, curated, is_top_50_fr,
  audience_min_age, audience_age_source, audience_age_scope, audience_age_volumes, audience_age_ref, audience_age_year)
select 'La petite faiseuse de livres : ascendance of a bookworm', 'Miya Kazuki (scénario), Suzuka (dessin)', 'Ototo', null, 'ongoing'::public.manga_status,
  array['fantasy','tranche-de-vie','aventure']::text[], 'shonen', 'Réincarnée en fillette pauvre dans un monde médiéval sans livres, une passionnée de lecture décide de fabriquer elle-même ses propres ouvrages.', array['la petite faiseuse de livres','ascendance of a bookworm','honzuki no gekokujou','honzuki no gekokujō','honzuki no gekokujou: shisho ni naru tame ni wa shudan wo erandeiraremasen','本好きの下剋上']::text[], '{"mal_id":96194}'::jsonb, true, false,
  9, 'cnlj', 'series', null, 'https://cnlj.bnf.fr/sites/default/files/bibliographies/mangamania-2026.pdf', 2026
where not pg_temp.catalogue_has(array['La petite faiseuse de livres : ascendance of a bookworm','la petite faiseuse de livres','ascendance of a bookworm','honzuki no gekokujou','honzuki no gekokujō','honzuki no gekokujou: shisho ni naru tame ni wa shudan wo erandeiraremasen','本好きの下剋上']::text[], 96194)
returning id
)
insert into public.catalogue_growth_inserted (manga_id, batch) select id, 'cnlj-2026-10' from inserted;

with inserted as (
insert into public.mangas (title, author, publisher_fr, total_volumes, status, genres, demographic, synopsis, aliases, external_ids, curated, is_top_50_fr,
  audience_min_age, audience_age_source, audience_age_scope, audience_age_volumes, audience_age_ref, audience_age_year)
select 'Princesse Saphir : intégrale', 'Osamu Tezuka', 'Delcourt/Tonkam', 2, 'completed'::public.manga_status,
  array['aventure','fantasy','romance','action']::text[], 'shojo', 'Née avec un cœur de garçon et un cœur de fille, la princesse Saphir se fait passer pour un prince afin de protéger le trône de son royaume.', array['ribbon no kishi','princess knight','princesse saphir','リボンの騎士']::text[], '{"mal_id":1676}'::jsonb, true, false,
  9, 'cnlj', 'series', null, 'https://cnlj.bnf.fr/sites/default/files/bibliographies/mangamania-2026.pdf', 2026
where not pg_temp.catalogue_has(array['Princesse Saphir : intégrale','ribbon no kishi','princess knight','princesse saphir','リボンの騎士']::text[], 1676)
returning id
)
insert into public.catalogue_growth_inserted (manga_id, batch) select id, 'cnlj-2026-10' from inserted;

with inserted as (
insert into public.mangas (title, author, publisher_fr, total_volumes, status, genres, demographic, synopsis, aliases, external_ids, curated, is_top_50_fr,
  audience_min_age, audience_age_source, audience_age_scope, audience_age_volumes, audience_age_ref, audience_age_year)
select 'Le renard et le petit tanuki', 'Mi Tagawa', 'Ki-oon', 7, 'completed'::public.manga_status,
  array['fantasy','comedie','tranche-de-vie','surnaturel']::text[], null, 'Libéré après des siècles de punition, un renard divin arrogant doit apprendre à guider un petit tanuki naïf qui rêve de devenir messager des dieux.', array['korisenman','korisen man','the fox & little tanuki','こりせんまん']::text[], '{"mal_id":125546}'::jsonb, true, false,
  9, 'cnlj', 'series', null, 'https://cnlj.bnf.fr/sites/default/files/bibliographies/mangamania-2026.pdf', 2026
where not pg_temp.catalogue_has(array['Le renard et le petit tanuki','korisenman','korisen man','the fox & little tanuki','こりせんまん']::text[], 125546)
returning id
)
insert into public.catalogue_growth_inserted (manga_id, batch) select id, 'cnlj-2026-10' from inserted;

with inserted as (
insert into public.mangas (title, author, publisher_fr, total_volumes, status, genres, demographic, synopsis, aliases, external_ids, curated, is_top_50_fr,
  audience_min_age, audience_age_source, audience_age_scope, audience_age_volumes, audience_age_ref, audience_age_year)
select 'Sky wars', 'Ahndongshik', 'Casterman', 8, 'completed'::public.manga_status,
  array['aventure','fantasy','action']::text[], 'shonen', 'Dans un pays où voler est un crime, un jeune berger qui rêve du ciel voit sa vie basculer quand un inconnu surgit sur une monture ailée.', array['lindbergh','リンドバーグ']::text[], '{"mal_id":35515}'::jsonb, true, false,
  9, 'cnlj', 'series', null, 'https://cnlj.bnf.fr/sites/default/files/bibliographies/mangamania-2026.pdf', 2026
where not pg_temp.catalogue_has(array['Sky wars','lindbergh','リンドバーグ']::text[], 35515)
returning id
)
insert into public.catalogue_growth_inserted (manga_id, batch) select id, 'cnlj-2026-10' from inserted;

with inserted as (
insert into public.mangas (title, author, publisher_fr, total_volumes, status, genres, demographic, synopsis, aliases, external_ids, curated, is_top_50_fr,
  audience_min_age, audience_age_source, audience_age_scope, audience_age_volumes, audience_age_ref, audience_age_year)
select 'Un été à Tsurumaki', 'Shin''ya Komatsu', 'IMHO', 1, 'completed'::public.manga_status,
  array['fantasy','tranche-de-vie','aventure']::text[], 'seinen', 'Au début des vacances, un garçon qui parle aux plantes voit sa petite ville envahie par une végétation étrange et part comprendre ce qui se passe.', array['tsurumaki machi natsu jikan','summertime in tsurumaki town','つるまき町 夏時間']::text[], '{"mal_id":139425}'::jsonb, true, false,
  9, 'cnlj', 'series', null, 'https://cnlj.bnf.fr/sites/default/files/bibliographies/mangamania-2026.pdf', 2026
where not pg_temp.catalogue_has(array['Un été à Tsurumaki','tsurumaki machi natsu jikan','summertime in tsurumaki town','つるまき町 夏時間']::text[], 139425)
returning id
)
insert into public.catalogue_growth_inserted (manga_id, batch) select id, 'cnlj-2026-10' from inserted;

with inserted as (
insert into public.mangas (title, author, publisher_fr, total_volumes, status, genres, demographic, synopsis, aliases, external_ids, curated, is_top_50_fr,
  audience_min_age, audience_age_source, audience_age_scope, audience_age_volumes, audience_age_ref, audience_age_year)
select 'Le voyage d''Ours-Lune', 'Ho', 'Rue de Sèvres', 1, 'completed'::public.manga_status,
  array['aventure','tranche-de-vie','fantasy']::text[], null, 'Par une nuit sans lune, une corneille se pose sur le dos d''un ours solitaire, et tous deux partent ensemble sur les routes.', array['kuma to karasu','bear and crow','クマとカラス']::text[], '{"mal_id":174746}'::jsonb, true, false,
  9, 'cnlj', 'series', null, 'https://cnlj.bnf.fr/sites/default/files/bibliographies/mangamania-2026.pdf', 2026
where not pg_temp.catalogue_has(array['Le voyage d''Ours-Lune','kuma to karasu','bear and crow','クマとカラス']::text[], 174746)
returning id
)
insert into public.catalogue_growth_inserted (manga_id, batch) select id, 'cnlj-2026-10' from inserted;

with inserted as (
insert into public.mangas (title, author, publisher_fr, total_volumes, status, genres, demographic, synopsis, aliases, external_ids, curated, is_top_50_fr,
  audience_min_age, audience_age_source, audience_age_scope, audience_age_volumes, audience_age_ref, audience_age_year)
select 'ZéroMan', 'Osamu Tezuka', 'FLBLB', 2, 'completed'::public.manga_status,
  array['science-fiction','aventure','action']::text[], 'shonen', 'Élevé par des humains à Tokyo, Ricky découvre qu''il appartient aux ZéroMen, une espèce surdouée qui prépare une guerre contre l''humanité.', array['zero man','0 man','zero men','0マン','zeroman']::text[], '{"mal_id":104344}'::jsonb, true, false,
  9, 'cnlj', 'series', null, 'https://cnlj.bnf.fr/sites/default/files/bibliographies/mangamania-2026.pdf', 2026
where not pg_temp.catalogue_has(array['ZéroMan','zero man','0 man','zero men','0マン','zeroman']::text[], 104344)
returning id
)
insert into public.catalogue_growth_inserted (manga_id, batch) select id, 'cnlj-2026-10' from inserted;

with inserted as (
insert into public.mangas (title, author, publisher_fr, total_volumes, status, genres, demographic, synopsis, aliases, external_ids, curated, is_top_50_fr,
  audience_min_age, audience_age_source, audience_age_scope, audience_age_volumes, audience_age_ref, audience_age_year)
select 'Asadora', 'Naoki Urasawa', 'Kana', 9, 'ongoing'::public.manga_status,
  array['drame','aventure','historique','mystere']::text[], 'seinen', 'Dans le Japon d''après-guerre, une fillette débrouillarde se met à piloter des avions et croise la route d''une mystérieuse créature géante.', array['asadora!','あさドラ!']::text[], '{"mal_id":116000}'::jsonb, true, false,
  11, 'cnlj', 'series', null, 'https://cnlj.bnf.fr/sites/default/files/bibliographies/mangamania-2026.pdf', 2026
where not pg_temp.catalogue_has(array['Asadora','asadora!','あさドラ!']::text[], 116000)
returning id
)
insert into public.catalogue_growth_inserted (manga_id, batch) select id, 'cnlj-2026-10' from inserted;

with inserted as (
insert into public.mangas (title, author, publisher_fr, total_volumes, status, genres, demographic, synopsis, aliases, external_ids, curated, is_top_50_fr,
  audience_min_age, audience_age_source, audience_age_scope, audience_age_volumes, audience_age_ref, audience_age_year)
select 'Au rythme de mon ruban', 'Yumi Kurokawa', 'Akata', 2, 'completed'::public.manga_status,
  array['sport','drame','tranche-de-vie']::text[], 'seinen', 'À Hiroshima, un garçon timide se prend de passion pour la gymnastique rythmique au ruban, un sport que tout le monde réserve aux filles.', array['yuunagi ni mae, boku no ribbon','夕凪に舞え、僕のリボン']::text[], '{"mal_id":115511}'::jsonb, true, false,
  11, 'cnlj', 'series', null, 'https://cnlj.bnf.fr/sites/default/files/bibliographies/mangamania-2026.pdf', 2026
where not pg_temp.catalogue_has(array['Au rythme de mon ruban','yuunagi ni mae, boku no ribbon','夕凪に舞え、僕のリボン']::text[], 115511)
returning id
)
insert into public.catalogue_growth_inserted (manga_id, batch) select id, 'cnlj-2026-10' from inserted;

with inserted as (
insert into public.mangas (title, author, publisher_fr, total_volumes, status, genres, demographic, synopsis, aliases, external_ids, curated, is_top_50_fr,
  audience_min_age, audience_age_source, audience_age_scope, audience_age_volumes, audience_age_ref, audience_age_year)
select 'Bakuman', 'Tsugumi Ohba, Takeshi Obata', 'Kana', 20, 'completed'::public.manga_status,
  array['comedie','drame','tranche-de-vie']::text[], 'shonen', 'Deux collégiens, l''un dessinateur et l''autre scénariste, s''associent pour devenir mangakas et se faire publier dans le plus grand magazine du Japon.', array['bakuman.','バクマン。']::text[], '{"mal_id":9711}'::jsonb, true, false,
  11, 'cnlj', 'series', null, 'https://cnlj.bnf.fr/sites/default/files/bibliographies/mangamania-2026.pdf', 2026
where not pg_temp.catalogue_has(array['Bakuman','bakuman.','バクマン。']::text[], 9711)
returning id
)
insert into public.catalogue_growth_inserted (manga_id, batch) select id, 'cnlj-2026-10' from inserted;

with inserted as (
insert into public.mangas (title, author, publisher_fr, total_volumes, status, genres, demographic, synopsis, aliases, external_ids, curated, is_top_50_fr,
  audience_min_age, audience_age_source, audience_age_scope, audience_age_volumes, audience_age_ref, audience_age_year)
select 'Bride stories', 'Kaoru Mori', 'Ki-oon', 15, 'ongoing'::public.manga_status,
  array['historique','tranche-de-vie','romance']::text[], 'seinen', 'Dans l''Asie centrale du XIXe siècle, une jeune femme mariée à un garçon bien plus jeune qu''elle découvre la vie de sa nouvelle famille.', array['otoyomegatari','a bride''s story','乙嫁語り']::text[], '{"mal_id":11514}'::jsonb, true, false,
  11, 'cnlj', 'series', null, 'https://cnlj.bnf.fr/sites/default/files/bibliographies/mangamania-2026.pdf', 2026
where not pg_temp.catalogue_has(array['Bride stories','otoyomegatari','a bride''s story','乙嫁語り']::text[], 11514)
returning id
)
insert into public.catalogue_growth_inserted (manga_id, batch) select id, 'cnlj-2026-10' from inserted;

with inserted as (
insert into public.mangas (title, author, publisher_fr, total_volumes, status, genres, demographic, synopsis, aliases, external_ids, curated, is_top_50_fr,
  audience_min_age, audience_age_source, audience_age_scope, audience_age_volumes, audience_age_ref, audience_age_year)
select 'Comet girl', 'Yuriko Akase', 'Casterman', 2, 'completed'::public.manga_status,
  array['science-fiction','aventure','romance']::text[], null, 'Ouvrier sur les routes de l''espace, Sazan croise Mina, une jeune femme pleine d''une énergie fabuleuse que des pirates veulent capturer.', array['sazan to suisei no shoujo','sazan & comet girl','サザンと彗星の少女']::text[], '{"mal_id":122665}'::jsonb, true, false,
  11, 'cnlj', 'series', null, 'https://cnlj.bnf.fr/sites/default/files/bibliographies/mangamania-2026.pdf', 2026
where not pg_temp.catalogue_has(array['Comet girl','sazan to suisei no shoujo','sazan & comet girl','サザンと彗星の少女']::text[], 122665)
returning id
)
insert into public.catalogue_growth_inserted (manga_id, batch) select id, 'cnlj-2026-10' from inserted;

with inserted as (
insert into public.mangas (title, author, publisher_fr, total_volumes, status, genres, demographic, synopsis, aliases, external_ids, curated, is_top_50_fr,
  audience_min_age, audience_age_source, audience_age_scope, audience_age_volumes, audience_age_ref, audience_age_year)
select 'Drifting dragons', 'Taku Kuwabara', 'Pika', 20, 'ongoing'::public.manga_status,
  array['aventure','fantasy','cuisine']::text[], 'seinen', 'À bord d''un vieux dirigeable, un équipage de chasseurs parcourt le ciel pour traquer des dragons, puis les découper et les cuisiner.', array['kuutei dragons','kūtei dragons','空挺ドラゴンズ']::text[], '{"mal_id":101479}'::jsonb, true, false,
  11, 'cnlj', 'series', null, 'https://cnlj.bnf.fr/sites/default/files/bibliographies/mangamania-2026.pdf', 2026
where not pg_temp.catalogue_has(array['Drifting dragons','kuutei dragons','kūtei dragons','空挺ドラゴンズ']::text[], 101479)
returning id
)
insert into public.catalogue_growth_inserted (manga_id, batch) select id, 'cnlj-2026-10' from inserted;

with inserted as (
insert into public.mangas (title, author, publisher_fr, total_volumes, status, genres, demographic, synopsis, aliases, external_ids, curated, is_top_50_fr,
  audience_min_age, audience_age_source, audience_age_scope, audience_age_volumes, audience_age_ref, audience_age_year)
select 'Les Enfants de la baleine', 'Abi Umeda', 'Glénat', 23, 'completed'::public.manga_status,
  array['fantasy','aventure','drame','mystere']::text[], 'shojo', 'Sur une île de sable qui dérive sur un océan de dunes, un jeune archiviste voit son petit monde basculer après l''arrivée d''une mystérieuse inconnue.', array['kujira no kora wa sajou ni utau','kujira no kora wa sajō ni utau','children of the whales','クジラの子らは砂上に歌う']::text[], '{"mal_id":69007}'::jsonb, true, false,
  11, 'cnlj', 'series', null, 'https://cnlj.bnf.fr/sites/default/files/bibliographies/mangamania-2026.pdf', 2026
where not pg_temp.catalogue_has(array['Les Enfants de la baleine','kujira no kora wa sajou ni utau','kujira no kora wa sajō ni utau','children of the whales','クジラの子らは砂上に歌う']::text[], 69007)
returning id
)
insert into public.catalogue_growth_inserted (manga_id, batch) select id, 'cnlj-2026-10' from inserted;

with inserted as (
insert into public.mangas (title, author, publisher_fr, total_volumes, status, genres, demographic, synopsis, aliases, external_ids, curated, is_top_50_fr,
  audience_min_age, audience_age_source, audience_age_scope, audience_age_volumes, audience_age_ref, audience_age_year)
select 'En selle Sakamichi !', 'Wataru Watanabe', 'Kurokawa', null, 'ongoing'::public.manga_status,
  array['sport','comedie','drame']::text[], 'shonen', 'Lycéen fan d''anime, Sakamichi pédale chaque semaine jusqu''à Akihabara sur son vieux vélo, sans se douter qu''il a l''étoffe d''un vrai coureur.', array['en selle sakamichi','en selle, sakamichi !','yowamushi pedal','弱虫ペダル']::text[], '{"mal_id":23627}'::jsonb, true, false,
  11, 'cnlj', 'series', null, 'https://cnlj.bnf.fr/sites/default/files/bibliographies/mangamania-2026.pdf', 2026
where not pg_temp.catalogue_has(array['En selle Sakamichi !','en selle sakamichi','en selle, sakamichi !','yowamushi pedal','弱虫ペダル']::text[], 23627)
returning id
)
insert into public.catalogue_growth_inserted (manga_id, batch) select id, 'cnlj-2026-10' from inserted;

with inserted as (
insert into public.mangas (title, author, publisher_fr, total_volumes, status, genres, demographic, synopsis, aliases, external_ids, curated, is_top_50_fr,
  audience_min_age, audience_age_source, audience_age_scope, audience_age_volumes, audience_age_ref, audience_age_year)
select 'Le fantastique voyage de Nicola au pays des démons', 'Asaya Miyanaga', 'nobi nobi!', 4, 'completed'::public.manga_status,
  array['fantasy','aventure','tranche-de-vie']::text[], 'seinen', 'Une petite humaine cache sa vraie nature pour parcourir le monde des démons aux côtés d''un marchand ambulant au grand cœur.', array['nicola no oyururi makai kikou','nicola traveling around the demons'' world']::text[], '{"mal_id":105399}'::jsonb, true, false,
  11, 'cnlj', 'series', null, 'https://cnlj.bnf.fr/sites/default/files/bibliographies/mangamania-2026.pdf', 2026
where not pg_temp.catalogue_has(array['Le fantastique voyage de Nicola au pays des démons','nicola no oyururi makai kikou','nicola traveling around the demons'' world']::text[], 105399)
returning id
)
insert into public.catalogue_growth_inserted (manga_id, batch) select id, 'cnlj-2026-10' from inserted;

with inserted as (
insert into public.mangas (title, author, publisher_fr, total_volumes, status, genres, demographic, synopsis, aliases, external_ids, curated, is_top_50_fr,
  audience_min_age, audience_age_source, audience_age_scope, audience_age_volumes, audience_age_ref, audience_age_year)
select 'Flying witch', 'Chihiro Ishizuka', 'nobi nobi!', 14, 'ongoing'::public.manga_status,
  array['tranche-de-vie','fantasy','comedie']::text[], 'shonen', 'Une apprentie sorcière s''installe chez ses cousins à la campagne et découvre que la magie se cache dans les petits riens du quotidien.', array['furaingu uicchi','ふらいんぐうぃっち']::text[], '{"mal_id":46258}'::jsonb, true, false,
  11, 'cnlj', 'series', null, 'https://cnlj.bnf.fr/sites/default/files/bibliographies/mangamania-2026.pdf', 2026
where not pg_temp.catalogue_has(array['Flying witch','furaingu uicchi','ふらいんぐうぃっち']::text[], 46258)
returning id
)
insert into public.catalogue_growth_inserted (manga_id, batch) select id, 'cnlj-2026-10' from inserted;

with inserted as (
insert into public.mangas (title, author, publisher_fr, total_volumes, status, genres, demographic, synopsis, aliases, external_ids, curated, is_top_50_fr,
  audience_min_age, audience_age_source, audience_age_scope, audience_age_volumes, audience_age_ref, audience_age_year)
select 'Hinomaru sumo', 'Kawada', 'Glénat', 28, 'completed'::public.manga_status,
  array['sport','drame','action']::text[], 'shonen', 'Petit par la taille mais immense par la volonté, un lycéen relance le club de sumo de son école avec l''ambition de devenir yokozuna.', array['hinomaru zumou','hinomaru zumō','hinomaruzumou']::text[], '{"mal_id":79061}'::jsonb, true, false,
  11, 'cnlj', 'series', null, 'https://cnlj.bnf.fr/sites/default/files/bibliographies/mangamania-2026.pdf', 2026
where not pg_temp.catalogue_has(array['Hinomaru sumo','hinomaru zumou','hinomaru zumō','hinomaruzumou']::text[], 79061)
returning id
)
insert into public.catalogue_growth_inserted (manga_id, batch) select id, 'cnlj-2026-10' from inserted;

with inserted as (
insert into public.mangas (title, author, publisher_fr, total_volumes, status, genres, demographic, synopsis, aliases, external_ids, curated, is_top_50_fr,
  audience_min_age, audience_age_source, audience_age_scope, audience_age_volumes, audience_age_ref, audience_age_year)
select 'Kamisama school', 'Natsu Hyuuga (scénario), Modomu Akagawara (dessin)', 'Ki-oon', 12, 'ongoing'::public.manga_status,
  array['fantasy','romance','comedie']::text[], 'shojo', 'Une lycéenne sans pouvoir atterrit dans une école réservée aux dieux en formation et doit y trouver sa place malgré tout.', array['kamisama gakkou no ochikobore','kami-sama gakkō no ochikobore']::text[], '{"mal_id":143594}'::jsonb, true, false,
  11, 'cnlj', 'series', null, 'https://cnlj.bnf.fr/sites/default/files/bibliographies/mangamania-2026.pdf', 2026
where not pg_temp.catalogue_has(array['Kamisama school','kamisama gakkou no ochikobore','kami-sama gakkō no ochikobore']::text[], 143594)
returning id
)
insert into public.catalogue_growth_inserted (manga_id, batch) select id, 'cnlj-2026-10' from inserted;

with inserted as (
insert into public.mangas (title, author, publisher_fr, total_volumes, status, genres, demographic, synopsis, aliases, external_ids, curated, is_top_50_fr,
  audience_min_age, audience_age_source, audience_age_scope, audience_age_volumes, audience_age_ref, audience_age_year)
select 'Komi cherche ses mots', 'Tomohito Oda', 'Pika', 27, 'ongoing'::public.manga_status,
  array['comedie','tranche-de-vie','romance']::text[], 'shonen', 'Admirée par tout son lycée, une élève paralysée par la timidité se fixe un objectif tout simple : se faire cent amis.', array['komi-san wa, komyushō desu','komi-san wa comyushou desu','komi can''t communicate']::text[], '{"mal_id":99007}'::jsonb, true, false,
  11, 'cnlj', 'series', null, 'https://cnlj.bnf.fr/sites/default/files/bibliographies/mangamania-2026.pdf', 2026
where not pg_temp.catalogue_has(array['Komi cherche ses mots','komi-san wa, komyushō desu','komi-san wa comyushou desu','komi can''t communicate']::text[], 99007)
returning id
)
insert into public.catalogue_growth_inserted (manga_id, batch) select id, 'cnlj-2026-10' from inserted;

with inserted as (
insert into public.mangas (title, author, publisher_fr, total_volumes, status, genres, demographic, synopsis, aliases, external_ids, curated, is_top_50_fr,
  audience_min_age, audience_age_source, audience_age_scope, audience_age_volumes, audience_age_ref, audience_age_year)
select 'Magus of the library', 'Mitsu Izumi', 'Ki-oon', 9, 'ongoing'::public.manga_status,
  array['fantasy','aventure','drame']::text[], 'seinen', 'Un garçon pauvre et passionné de lecture rêve de rejoindre les gardiens d''une immense bibliothèque où les livres renferment une vraie magie.', array['toshokan no daimajutsushi','図書館の大魔術師']::text[], '{"mal_id":110771}'::jsonb, true, false,
  11, 'cnlj', 'series', null, 'https://cnlj.bnf.fr/sites/default/files/bibliographies/mangamania-2026.pdf', 2026
where not pg_temp.catalogue_has(array['Magus of the library','toshokan no daimajutsushi','図書館の大魔術師']::text[], 110771)
returning id
)
insert into public.catalogue_growth_inserted (manga_id, batch) select id, 'cnlj-2026-10' from inserted;

with inserted as (
insert into public.mangas (title, author, publisher_fr, total_volumes, status, genres, demographic, synopsis, aliases, external_ids, curated, is_top_50_fr,
  audience_min_age, audience_age_source, audience_age_scope, audience_age_volumes, audience_age_ref, audience_age_year)
select 'Mon amie des ténèbres', 'Taku Kawamura', 'nobi nobi!', 20, 'ongoing'::public.manga_status,
  array['comedie','tranche-de-vie','romance']::text[], 'shonen', 'Une écolière à l''allure inquiétante, que toute la classe croit maudite, voit sa vie changer quand un nouvel élève insouciant veut devenir son ami.', array['jijou wo shiranai tenkousei ga guigui kuru','my clueless first friend']::text[], '{"mal_id":115694}'::jsonb, true, false,
  11, 'cnlj', 'series', null, 'https://cnlj.bnf.fr/sites/default/files/bibliographies/mangamania-2026.pdf', 2026
where not pg_temp.catalogue_has(array['Mon amie des ténèbres','jijou wo shiranai tenkousei ga guigui kuru','my clueless first friend']::text[], 115694)
returning id
)
insert into public.catalogue_growth_inserted (manga_id, batch) select id, 'cnlj-2026-10' from inserted;

with inserted as (
insert into public.mangas (title, author, publisher_fr, total_volumes, status, genres, demographic, synopsis, aliases, external_ids, curated, is_top_50_fr,
  audience_min_age, audience_age_source, audience_age_scope, audience_age_volumes, audience_age_ref, audience_age_year)
select 'One-Punch Man', 'ONE (scénario), Yusuke Murata (dessin)', 'Kurokawa', 35, 'ongoing'::public.manga_status,
  array['action','comedie','science-fiction']::text[], 'seinen', 'Saitama bat n''importe quel monstre d''un seul coup de poing, et cette force sans limite finit par l''ennuyer profondément.', array['one punch man','one punch-man','wanpanman','ワンパンマン']::text[], '{"mal_id":44347}'::jsonb, true, false,
  11, 'cnlj', 'series', null, 'https://cnlj.bnf.fr/sites/default/files/bibliographies/mangamania-2026.pdf', 2026
where not pg_temp.catalogue_has(array['One-Punch Man','one punch man','one punch-man','wanpanman','ワンパンマン']::text[], 44347)
returning id
)
insert into public.catalogue_growth_inserted (manga_id, batch) select id, 'cnlj-2026-10' from inserted;

with inserted as (
insert into public.mangas (title, author, publisher_fr, total_volumes, status, genres, demographic, synopsis, aliases, external_ids, curated, is_top_50_fr,
  audience_min_age, audience_age_source, audience_age_scope, audience_age_volumes, audience_age_ref, audience_age_year)
select 'Les quatre frères Yuzuki', 'Shizuki Fujisawa', 'nobi nobi !', 16, 'ongoing'::public.manga_status,
  array['tranche-de-vie','comedie','drame']::text[], 'shojo', 'Après la mort de leurs parents, quatre frères d''âges très différents apprennent à vivre ensemble et à se soutenir au quotidien.', array['yuzuki-san chi no yon kyoudai','yuzuki-san chi no yonkyoudai','the yuzuki family''s four sons','柚木さんちの四兄弟。']::text[], '{"mal_id":115475}'::jsonb, true, false,
  11, 'cnlj', 'series', null, 'https://cnlj.bnf.fr/sites/default/files/bibliographies/mangamania-2026.pdf', 2026
where not pg_temp.catalogue_has(array['Les quatre frères Yuzuki','yuzuki-san chi no yon kyoudai','yuzuki-san chi no yonkyoudai','the yuzuki family''s four sons','柚木さんちの四兄弟。']::text[], 115475)
returning id
)
insert into public.catalogue_growth_inserted (manga_id, batch) select id, 'cnlj-2026-10' from inserted;

with inserted as (
insert into public.mangas (title, author, publisher_fr, total_volumes, status, genres, demographic, synopsis, aliases, external_ids, curated, is_top_50_fr,
  audience_min_age, audience_age_source, audience_age_scope, audience_age_volumes, audience_age_ref, audience_age_year)
select 'Radiant', 'Tony Valente', 'Ankama', 19, 'ongoing'::public.manga_status,
  array['aventure','fantasy','action','comedie']::text[], 'shonen', 'Jeune sorcier marqué par les Némésis, Seth part à la recherche du Radiant, leur nid légendaire, pour y mettre fin.', '{}'::text[], '{}'::jsonb, true, false,
  11, 'cnlj', 'series', null, 'https://cnlj.bnf.fr/sites/default/files/bibliographies/mangamania-2026.pdf', 2026
where not pg_temp.catalogue_has(array['Radiant']::text[], null)
returning id
)
insert into public.catalogue_growth_inserted (manga_id, batch) select id, 'cnlj-2026-10' from inserted;

with inserted as (
insert into public.mangas (title, author, publisher_fr, total_volumes, status, genres, demographic, synopsis, aliases, external_ids, curated, is_top_50_fr,
  audience_min_age, audience_age_source, audience_age_scope, audience_age_volumes, audience_age_ref, audience_age_year)
select 'Ranking of Kings', 'Sōsuke Tōka', 'Ki-oon', 19, 'ongoing'::public.manga_status,
  array['fantasy','aventure','drame']::text[], null, 'Bojji, prince sourd et chétif que personne ne prend au sérieux, rêve de devenir le plus grand roi du monde avec l''aide d''un ami inattendu.', array['ousama ranking','ōsama ranking','王様ランキング']::text[], '{"mal_id":121544}'::jsonb, true, false,
  11, 'cnlj', 'series', null, 'https://cnlj.bnf.fr/sites/default/files/bibliographies/mangamania-2026.pdf', 2026
where not pg_temp.catalogue_has(array['Ranking of Kings','ousama ranking','ōsama ranking','王様ランキング']::text[], 121544)
returning id
)
insert into public.catalogue_growth_inserted (manga_id, batch) select id, 'cnlj-2026-10' from inserted;

with inserted as (
insert into public.mangas (title, author, publisher_fr, total_volumes, status, genres, demographic, synopsis, aliases, external_ids, curated, is_top_50_fr,
  audience_min_age, audience_age_source, audience_age_scope, audience_age_volumes, audience_age_ref, audience_age_year)
select 'Le rêve de mon père', 'Taiyō Matsumoto', 'Kana', 3, 'completed'::public.manga_status,
  array['tranche-de-vie','comedie','drame','sport']::text[], 'seinen', 'Shigeo, écolier très sérieux, part vivre un été chez son père Hanao, un grand enfant obsédé par le baseball qui bouscule toutes ses certitudes.', array['hanaotoko','花男']::text[], '{"mal_id":3291}'::jsonb, true, false,
  11, 'cnlj', 'series', null, 'https://cnlj.bnf.fr/sites/default/files/bibliographies/mangamania-2026.pdf', 2026
where not pg_temp.catalogue_has(array['Le rêve de mon père','hanaotoko','花男']::text[], 3291)
returning id
)
insert into public.catalogue_growth_inserted (manga_id, batch) select id, 'cnlj-2026-10' from inserted;

with inserted as (
insert into public.mangas (title, author, publisher_fr, total_volumes, status, genres, demographic, synopsis, aliases, external_ids, curated, is_top_50_fr,
  audience_min_age, audience_age_source, audience_age_scope, audience_age_volumes, audience_age_ref, audience_age_year)
select 'A Silent Voice', 'Yoshitoki Ōima', 'Ki-oon', 7, 'completed'::public.manga_status,
  array['drame','psychologique','romance']::text[], 'shonen', 'Des années après avoir harcelé une camarade sourde, un lycéen rongé par la culpabilité cherche à la revoir et à réparer ce qu''il a brisé.', array['koe no katachi','聲の形','the shape of voice']::text[], '{"mal_id":56805}'::jsonb, true, false,
  11, 'cnlj', 'series', null, 'https://cnlj.bnf.fr/sites/default/files/bibliographies/mangamania-2026.pdf', 2026
where not pg_temp.catalogue_has(array['A Silent Voice','koe no katachi','聲の形','the shape of voice']::text[], 56805)
returning id
)
insert into public.catalogue_growth_inserted (manga_id, batch) select id, 'cnlj-2026-10' from inserted;

with inserted as (
insert into public.mangas (title, author, publisher_fr, total_volumes, status, genres, demographic, synopsis, aliases, external_ids, curated, is_top_50_fr,
  audience_min_age, audience_age_source, audience_age_scope, audience_age_volumes, audience_age_ref, audience_age_year)
select 'Somali et l''esprit de la forêt', 'Yako Gureishi', 'Komikku', 6, 'completed'::public.manga_status,
  array['fantasy','aventure','tranche-de-vie']::text[], 'seinen', 'Dans un monde où les humains sont pourchassés, un golem gardien de la forêt prend sous sa protection une fillette et voyage avec elle pour retrouver les siens.', array['somali to mori no kamisama','somali and the forest spirit','ソマリと森の神様']::text[], '{"mal_id":95452}'::jsonb, true, false,
  11, 'cnlj', 'series', null, 'https://cnlj.bnf.fr/sites/default/files/bibliographies/mangamania-2026.pdf', 2026
where not pg_temp.catalogue_has(array['Somali et l''esprit de la forêt','somali to mori no kamisama','somali and the forest spirit','ソマリと森の神様']::text[], 95452)
returning id
)
insert into public.catalogue_growth_inserted (manga_id, batch) select id, 'cnlj-2026-10' from inserted;

with inserted as (
insert into public.mangas (title, author, publisher_fr, total_volumes, status, genres, demographic, synopsis, aliases, external_ids, curated, is_top_50_fr,
  audience_min_age, audience_age_source, audience_age_scope, audience_age_volumes, audience_age_ref, audience_age_year)
select 'Your lie in April', 'Naoshi Arakawa', 'Ki-oon', 11, 'completed'::public.manga_status,
  array['drame','romance','tranche-de-vie']::text[], 'shonen', 'Un jeune pianiste prodige, incapable de jouer depuis la mort de sa mère, retrouve le goût de la musique grâce à une violoniste au tempérament explosif.', array['shigatsu wa kimi no uso','四月は君の嘘','avril mensonge']::text[], '{}'::jsonb, true, false,
  11, 'cnlj', 'series', null, 'https://cnlj.bnf.fr/sites/default/files/bibliographies/mangamania-2026.pdf', 2026
where not pg_temp.catalogue_has(array['Your lie in April','shigatsu wa kimi no uso','四月は君の嘘','avril mensonge']::text[], null)
returning id
)
insert into public.catalogue_growth_inserted (manga_id, batch) select id, 'cnlj-2026-10' from inserted;

with inserted as (
insert into public.mangas (title, author, publisher_fr, total_volumes, status, genres, demographic, synopsis, aliases, external_ids, curated, is_top_50_fr,
  audience_min_age, audience_age_source, audience_age_scope, audience_age_volumes, audience_age_ref, audience_age_year)
select 'Altaïr', 'Kotono Katō', 'Glénat', 27, 'completed'::public.manga_status,
  array['historique','aventure','drame','fantasy']::text[], 'shonen', 'Jeune général d''un pays inspiré de l''Empire ottoman, Mahmut mise sur la diplomatie et la ruse pour protéger sa patrie d''un empire voisin conquérant.', array['altair','shoukoku no altair','shōkoku no altair','将国のアルタイル','altair: a record of battles']::text[], '{}'::jsonb, true, false,
  12, 'cnlj', 'series', null, 'https://cnlj.bnf.fr/sites/default/files/bibliographies/mangamania-2026.pdf', 2026
where not pg_temp.catalogue_has(array['Altaïr','altair','shoukoku no altair','shōkoku no altair','将国のアルタイル','altair: a record of battles']::text[], null)
returning id
)
insert into public.catalogue_growth_inserted (manga_id, batch) select id, 'cnlj-2026-10' from inserted;

with inserted as (
insert into public.mangas (title, author, publisher_fr, total_volumes, status, genres, demographic, synopsis, aliases, external_ids, curated, is_top_50_fr,
  audience_min_age, audience_age_source, audience_age_scope, audience_age_volumes, audience_age_ref, audience_age_year)
select 'Bloom', 'Saka Mikami', 'nobi nobi!', null, 'ongoing'::public.manga_status,
  array['romance','tranche-de-vie','comedie']::text[], 'shonen', 'Un lycéen au physique intimidant se lie avec une élève du lycée huppé voisin, alors que les deux établissements se regardent en chiens de faïence.', array['kaoru hana wa rin to saku','薫る花は凛と咲く','the fragrant flower blooms with dignity']::text[], '{}'::jsonb, true, false,
  12, 'cnlj', 'series', null, 'https://cnlj.bnf.fr/sites/default/files/bibliographies/mangamania-2026.pdf', 2026
where not pg_temp.catalogue_has(array['Bloom','kaoru hana wa rin to saku','薫る花は凛と咲く','the fragrant flower blooms with dignity']::text[], null)
returning id
)
insert into public.catalogue_growth_inserted (manga_id, batch) select id, 'cnlj-2026-10' from inserted;

with inserted as (
insert into public.mangas (title, author, publisher_fr, total_volumes, status, genres, demographic, synopsis, aliases, external_ids, curated, is_top_50_fr,
  audience_min_age, audience_age_source, audience_age_scope, audience_age_volumes, audience_age_ref, audience_age_year)
select 'Le château solitaire dans le miroir', 'Mizuki Tsujimura (récit), Tomo Taketomi (dessin)', 'nobi nobi!', 5, 'completed'::public.manga_status,
  array['mystere','fantasy','drame','psychologique']::text[], null, 'Une collégienne qui ne va plus en classe traverse son miroir et rejoint six autres ados dans un château où une clé pourrait exaucer un vœu.', array['le chateau solitaire dans le miroir','kagami no kojou','kagami no kojō','かがみの孤城','lonely castle in the mirror']::text[], '{}'::jsonb, true, false,
  12, 'cnlj', 'series', null, 'https://cnlj.bnf.fr/sites/default/files/bibliographies/mangamania-2026.pdf', 2026
where not pg_temp.catalogue_has(array['Le château solitaire dans le miroir','le chateau solitaire dans le miroir','kagami no kojou','kagami no kojō','かがみの孤城','lonely castle in the mirror']::text[], null)
returning id
)
insert into public.catalogue_growth_inserted (manga_id, batch) select id, 'cnlj-2026-10' from inserted;

with inserted as (
insert into public.mangas (title, author, publisher_fr, total_volumes, status, genres, demographic, synopsis, aliases, external_ids, curated, is_top_50_fr,
  audience_min_age, audience_age_source, audience_age_scope, audience_age_volumes, audience_age_ref, audience_age_year)
select 'City hall', 'Rémi Guérin (scénario), Guillaume Lapeyre (dessin)', 'Ankama', 7, 'completed'::public.manga_status,
  array['aventure','action','fantasy']::text[], null, 'Dans un Londres de 1902 où l''écrit est interdit car les mots prennent vie, Jules Verne et Arthur Conan Doyle affrontent une menace de papier.', '{}'::text[], '{}'::jsonb, true, false,
  12, 'cnlj', 'series', null, 'https://cnlj.bnf.fr/sites/default/files/bibliographies/mangamania-2026.pdf', 2026
where not pg_temp.catalogue_has(array['City hall']::text[], null)
returning id
)
insert into public.catalogue_growth_inserted (manga_id, batch) select id, 'cnlj-2026-10' from inserted;

with inserted as (
insert into public.mangas (title, author, publisher_fr, total_volumes, status, genres, demographic, synopsis, aliases, external_ids, curated, is_top_50_fr,
  audience_min_age, audience_age_source, audience_age_scope, audience_age_volumes, audience_age_ref, audience_age_year)
select 'La cuisine du Tengu', 'Ai Tanaka', 'Le Lézard noir', null, 'ongoing'::public.manga_status,
  array['cuisine','fantasy','tranche-de-vie','surnaturel']::text[], 'seinen', 'À 14 ans, On découvre qu''il descend des tengu et quitte New York pour passer un an à la campagne japonaise chez son grand frère, entre potager et bons petits plats.', array['tengu no daidokoro','天狗の台所','tengu''s kitchen']::text[], '{"mal_id":152139}'::jsonb, true, false,
  12, 'cnlj', 'series', null, 'https://cnlj.bnf.fr/sites/default/files/bibliographies/mangamania-2026.pdf', 2026
where not pg_temp.catalogue_has(array['La cuisine du Tengu','tengu no daidokoro','天狗の台所','tengu''s kitchen']::text[], 152139)
returning id
)
insert into public.catalogue_growth_inserted (manga_id, batch) select id, 'cnlj-2026-10' from inserted;

with inserted as (
insert into public.mangas (title, author, publisher_fr, total_volumes, status, genres, demographic, synopsis, aliases, external_ids, curated, is_top_50_fr,
  audience_min_age, audience_age_source, audience_age_scope, audience_age_volumes, audience_age_ref, audience_age_year)
select 'Deep sea aquarium MagMell', 'Kiyomi Sugishita', 'Vega-Dupuis', null, 'ongoing'::public.manga_status,
  array['tranche-de-vie','drame']::text[], 'seinen', 'Passionné par les abysses, un jeune homme décroche un petit boulot dans un aquarium consacré aux créatures des grands fonds et y trouve sa voie.', array['deep-sea aquarium magmell','magmell shinkai suizokukan','shinkai no suizokukan magmell','マグメル深海水族館']::text[], '{}'::jsonb, true, false,
  12, 'cnlj', 'series', null, 'https://cnlj.bnf.fr/sites/default/files/bibliographies/mangamania-2026.pdf', 2026
where not pg_temp.catalogue_has(array['Deep sea aquarium MagMell','deep-sea aquarium magmell','magmell shinkai suizokukan','shinkai no suizokukan magmell','マグメル深海水族館']::text[], null)
returning id
)
insert into public.catalogue_growth_inserted (manga_id, batch) select id, 'cnlj-2026-10' from inserted;

with inserted as (
insert into public.mangas (title, author, publisher_fr, total_volumes, status, genres, demographic, synopsis, aliases, external_ids, curated, is_top_50_fr,
  audience_min_age, audience_age_source, audience_age_scope, audience_age_volumes, audience_age_ref, audience_age_year)
select 'En scène !', 'Cuvie', 'Kurokawa', null, 'ongoing'::public.manga_status,
  array['drame','sport','tranche-de-vie']::text[], 'seinen', 'Une collégienne passionnée de danse classique enchaîne cours, concours et doutes pour se faire une place sur les grandes scènes du ballet.', array['en scene','kenrantaru grande scène','kenrantaru grande scene','la magnifique grande scène']::text[], '{"mal_id":69841}'::jsonb, true, false,
  12, 'cnlj', 'series', null, 'https://cnlj.bnf.fr/sites/default/files/bibliographies/mangamania-2026.pdf', 2026
where not pg_temp.catalogue_has(array['En scène !','en scene','kenrantaru grande scène','kenrantaru grande scene','la magnifique grande scène']::text[], 69841)
returning id
)
insert into public.catalogue_growth_inserted (manga_id, batch) select id, 'cnlj-2026-10' from inserted;

with inserted as (
insert into public.mangas (title, author, publisher_fr, total_volumes, status, genres, demographic, synopsis, aliases, external_ids, curated, is_top_50_fr,
  audience_min_age, audience_age_source, audience_age_scope, audience_age_volumes, audience_age_ref, audience_age_year)
select 'Horimiya', 'HERO, Daisuke Hagiwara', 'Nobi Nobi !', 16, 'completed'::public.manga_status,
  array['romance','comedie','tranche-de-vie']::text[], 'shonen', 'Au lycée, la populaire Hori et le discret Miyamura découvrent chacun la vraie vie de l''autre, loin des apparences de la classe.', array['hori-san to miyamura-kun']::text[], '{"mal_id":42451}'::jsonb, true, false,
  12, 'cnlj', 'series', null, 'https://cnlj.bnf.fr/sites/default/files/bibliographies/mangamania-2026.pdf', 2026
where not pg_temp.catalogue_has(array['Horimiya','hori-san to miyamura-kun']::text[], 42451)
returning id
)
insert into public.catalogue_growth_inserted (manga_id, batch) select id, 'cnlj-2026-10' from inserted;

with inserted as (
insert into public.mangas (title, author, publisher_fr, total_volumes, status, genres, demographic, synopsis, aliases, external_ids, curated, is_top_50_fr,
  audience_min_age, audience_age_source, audience_age_scope, audience_age_volumes, audience_age_ref, audience_age_year)
select 'Jizo', 'Mr Tan (Antoine Dole), Mato', 'Glénat', 1, 'completed'::public.manga_status,
  array['surnaturel','fantasy','drame']::text[], null, 'Perdu et ignoré de tous, le jeune Aki trouve dans un temple un mystérieux enfant, Jizo, qui l''entraîne dans un conte inspiré du folklore japonais.', '{}'::text[], '{}'::jsonb, true, false,
  12, 'cnlj', 'series', null, 'https://cnlj.bnf.fr/sites/default/files/bibliographies/mangamania-2026.pdf', 2026
where not pg_temp.catalogue_has(array['Jizo']::text[], null)
returning id
)
insert into public.catalogue_growth_inserted (manga_id, batch) select id, 'cnlj-2026-10' from inserted;

with inserted as (
insert into public.mangas (title, author, publisher_fr, total_volumes, status, genres, demographic, synopsis, aliases, external_ids, curated, is_top_50_fr,
  audience_min_age, audience_age_source, audience_age_scope, audience_age_volumes, audience_age_ref, audience_age_year)
select 'Mon histoire', 'Kazune Kawahara, Aruko', 'Kana', 13, 'completed'::public.manga_status,
  array['romance','comedie']::text[], 'shojo', 'Takeo, lycéen colosse au grand cœur, n''a jamais eu de succès en amour, jusqu''au jour où il vient en aide à la douce Yamato.', array['ore monogatari!!','ore monogatari','my love story!!']::text[], '{"mal_id":36933}'::jsonb, true, false,
  12, 'cnlj', 'series', null, 'https://cnlj.bnf.fr/sites/default/files/bibliographies/mangamania-2026.pdf', 2026
where not pg_temp.catalogue_has(array['Mon histoire','ore monogatari!!','ore monogatari','my love story!!']::text[], 36933)
returning id
)
insert into public.catalogue_growth_inserted (manga_id, batch) select id, 'cnlj-2026-10' from inserted;

with inserted as (
insert into public.mangas (title, author, publisher_fr, total_volumes, status, genres, demographic, synopsis, aliases, external_ids, curated, is_top_50_fr,
  audience_min_age, audience_age_source, audience_age_scope, audience_age_volumes, audience_age_ref, audience_age_year)
select 'Nos c(h)œurs évanescents', 'Yuhki Kamatani', 'Akata', 8, 'completed'::public.manga_status,
  array['tranche-de-vie','drame','psychologique']::text[], 'seinen', 'Yutaka, collégien sensible à la voix rare, rejoint la chorale de son école et y affronte les tourments de l''adolescence.', array['nos choeurs evanescents','shounen note','shonen note: alto','boy soprano']::text[], '{"mal_id":23284}'::jsonb, true, false,
  12, 'cnlj', 'series', null, 'https://cnlj.bnf.fr/sites/default/files/bibliographies/mangamania-2026.pdf', 2026
where not pg_temp.catalogue_has(array['Nos c(h)œurs évanescents','nos choeurs evanescents','shounen note','shonen note: alto','boy soprano']::text[], 23284)
returning id
)
insert into public.catalogue_growth_inserted (manga_id, batch) select id, 'cnlj-2026-10' from inserted;

with inserted as (
insert into public.mangas (title, author, publisher_fr, total_volumes, status, genres, demographic, synopsis, aliases, external_ids, curated, is_top_50_fr,
  audience_min_age, audience_age_source, audience_age_scope, audience_age_volumes, audience_age_ref, audience_age_year)
select 'La princesse et la bête', 'Yū Tomofuji', 'Pika', 15, 'completed'::public.manga_status,
  array['fantasy','romance']::text[], 'shojo', 'Offerte en sacrifice au roi des bêtes, une jeune fille courageuse refuse d''avoir peur et finit par découvrir la part humaine du souverain.', array['la princesse & la bête','niehime to kemono no ō','niehime to kemono no ou','sacrificial princess and the king of beasts']::text[], '{"mal_id":95920}'::jsonb, true, false,
  12, 'cnlj', 'series', null, 'https://cnlj.bnf.fr/sites/default/files/bibliographies/mangamania-2026.pdf', 2026
where not pg_temp.catalogue_has(array['La princesse et la bête','la princesse & la bête','niehime to kemono no ō','niehime to kemono no ou','sacrificial princess and the king of beasts']::text[], 95920)
returning id
)
insert into public.catalogue_growth_inserted (manga_id, batch) select id, 'cnlj-2026-10' from inserted;

with inserted as (
insert into public.mangas (title, author, publisher_fr, total_volumes, status, genres, demographic, synopsis, aliases, external_ids, curated, is_top_50_fr,
  audience_min_age, audience_age_source, audience_age_scope, audience_age_volumes, audience_age_ref, audience_age_year)
select 'Quatre frères pour moi !', 'Akira Ozaki', 'Kana', null, 'ongoing'::public.manga_status,
  array['romance','comedie','tranche-de-vie']::text[], 'shojo', 'Après le remariage de sa mère, la lycéenne Ito emménage avec quatre demi-frères, dont l''aîné Gen, froid en apparence mais très protecteur.', array['quatre freres pour moi','uchi no otouto-domo ga sumimasen','my stepbrothers are sorry']::text[], '{"mal_id":126871}'::jsonb, true, false,
  12, 'cnlj', 'series', null, 'https://cnlj.bnf.fr/sites/default/files/bibliographies/mangamania-2026.pdf', 2026
where not pg_temp.catalogue_has(array['Quatre frères pour moi !','quatre freres pour moi','uchi no otouto-domo ga sumimasen','my stepbrothers are sorry']::text[], 126871)
returning id
)
insert into public.catalogue_growth_inserted (manga_id, batch) select id, 'cnlj-2026-10' from inserted;

with inserted as (
insert into public.mangas (title, author, publisher_fr, total_volumes, status, genres, demographic, synopsis, aliases, external_ids, curated, is_top_50_fr,
  audience_min_age, audience_age_source, audience_age_scope, audience_age_volumes, audience_age_ref, audience_age_year)
select 'The quintessential quintuplets', 'Negi Haruba', 'Pika', 14, 'completed'::public.manga_status,
  array['romance','comedie']::text[], 'shonen', 'Un lycéen fauché devient le professeur particulier de cinq sœurs quintuplées, nulles en classe, et l''une d''elles deviendra un jour son épouse.', array['go-toubun no hanayome','5-toubun no hanayome','gotoubun no hanayome','五等分の花嫁']::text[], '{"mal_id":103851}'::jsonb, true, false,
  12, 'cnlj', 'series', null, 'https://cnlj.bnf.fr/sites/default/files/bibliographies/mangamania-2026.pdf', 2026
where not pg_temp.catalogue_has(array['The quintessential quintuplets','go-toubun no hanayome','5-toubun no hanayome','gotoubun no hanayome','五等分の花嫁']::text[], 103851)
returning id
)
insert into public.catalogue_growth_inserted (manga_id, batch) select id, 'cnlj-2026-10' from inserted;

with inserted as (
insert into public.mangas (title, author, publisher_fr, total_volumes, status, genres, demographic, synopsis, aliases, external_ids, curated, is_top_50_fr,
  audience_min_age, audience_age_source, audience_age_scope, audience_age_volumes, audience_age_ref, audience_age_year)
select 'Running girl : ma course vers les paralympiques', 'Narumi Shigematsu', 'Akata', 3, 'completed'::public.manga_status,
  array['sport','drame']::text[], 'josei', 'Amputée d''une jambe après un cancer des os, une lycéenne découvre les lames de course et se lance un défi : courir aux Jeux paralympiques de Tokyo.', array['running girl','blade girl','blade girl: kataashi no runner','ブレードガール 片脚のランナー']::text[], '{"mal_id":127292}'::jsonb, true, false,
  12, 'cnlj', 'series', null, 'https://cnlj.bnf.fr/sites/default/files/bibliographies/mangamania-2026.pdf', 2026
where not pg_temp.catalogue_has(array['Running girl : ma course vers les paralympiques','running girl','blade girl','blade girl: kataashi no runner','ブレードガール 片脚のランナー']::text[], 127292)
returning id
)
insert into public.catalogue_growth_inserted (manga_id, batch) select id, 'cnlj-2026-10' from inserted;

with inserted as (
insert into public.mangas (title, author, publisher_fr, total_volumes, status, genres, demographic, synopsis, aliases, external_ids, curated, is_top_50_fr,
  audience_min_age, audience_age_source, audience_age_scope, audience_age_volumes, audience_age_ref, audience_age_year)
select 'Sunny', 'Taiyō Matsumoto', 'Kana', 6, 'completed'::public.manga_status,
  array['tranche-de-vie','drame']::text[], 'seinen', 'Dans un foyer pour enfants du Japon des années 1970, une bande de gamins s''invente des voyages à bord d''une vieille voiture abandonnée dans la cour.', array['サニー']::text[], '{"mal_id":23571}'::jsonb, true, false,
  12, 'cnlj', 'series', null, 'https://cnlj.bnf.fr/sites/default/files/bibliographies/mangamania-2026.pdf', 2026
where not pg_temp.catalogue_has(array['Sunny','サニー']::text[], 23571)
returning id
)
insert into public.catalogue_growth_inserted (manga_id, batch) select id, 'cnlj-2026-10' from inserted;

with inserted as (
insert into public.mangas (title, author, publisher_fr, total_volumes, status, genres, demographic, synopsis, aliases, external_ids, curated, is_top_50_fr,
  audience_min_age, audience_age_source, audience_age_scope, audience_age_volumes, audience_age_ref, audience_age_year)
select 'Akane banashi', 'Yūki Suenaga, Takamasa Moue', 'Ki-oon', 16, 'ongoing'::public.manga_status,
  array['drame','tranche-de-vie']::text[], 'shonen', 'Une lycéenne au tempérament de feu se lance dans le rakugo, l''art du conte comique japonais, pour venger l''honneur de son père conteur.', array['akane-banashi','あかね噺']::text[], '{"mal_id":144034}'::jsonb, true, false,
  13, 'cnlj', 'series', null, 'https://cnlj.bnf.fr/sites/default/files/bibliographies/mangamania-2026.pdf', 2026
where not pg_temp.catalogue_has(array['Akane banashi','akane-banashi','あかね噺']::text[], 144034)
returning id
)
insert into public.catalogue_growth_inserted (manga_id, batch) select id, 'cnlj-2026-10' from inserted;

with inserted as (
insert into public.mangas (title, author, publisher_fr, total_volumes, status, genres, demographic, synopsis, aliases, external_ids, curated, is_top_50_fr,
  audience_min_age, audience_age_source, audience_age_scope, audience_age_volumes, audience_age_ref, audience_age_year)
select 'Arte', 'Kei Ohkubo', 'Komikku', 21, 'completed'::public.manga_status,
  array['historique','drame','romance']::text[], 'seinen', 'Dans la Florence du XVIe siècle, une jeune noble renonce à son rang pour devenir apprentie peintre dans un milieu réservé aux hommes.', array['アルテ']::text[], '{"mal_id":75929}'::jsonb, true, false,
  13, 'cnlj', 'series', null, 'https://cnlj.bnf.fr/sites/default/files/bibliographies/mangamania-2026.pdf', 2026
where not pg_temp.catalogue_has(array['Arte','アルテ']::text[], 75929)
returning id
)
insert into public.catalogue_growth_inserted (manga_id, batch) select id, 'cnlj-2026-10' from inserted;

with inserted as (
insert into public.mangas (title, author, publisher_fr, total_volumes, status, genres, demographic, synopsis, aliases, external_ids, curated, is_top_50_fr,
  audience_min_age, audience_age_source, audience_age_scope, audience_age_volumes, audience_age_ref, audience_age_year)
select 'Le bateau de Thésée', 'Toshiya Higashimoto', 'Vega-Dupuis', 10, 'completed'::public.manga_status,
  array['mystere','science-fiction','drame']::text[], 'seinen', 'Projeté en 1989, un homme tente d''empêcher l''empoisonnement de masse dont son père, policier du village, a été accusé avant sa naissance.', array['theseus no fune','the ship of theseus','テセウスの船']::text[], '{"mal_id":109773}'::jsonb, true, false,
  13, 'cnlj', 'series', null, 'https://cnlj.bnf.fr/sites/default/files/bibliographies/mangamania-2026.pdf', 2026
where not pg_temp.catalogue_has(array['Le bateau de Thésée','theseus no fune','the ship of theseus','テセウスの船']::text[], 109773)
returning id
)
insert into public.catalogue_growth_inserted (manga_id, batch) select id, 'cnlj-2026-10' from inserted;

with inserted as (
insert into public.mangas (title, author, publisher_fr, total_volumes, status, genres, demographic, synopsis, aliases, external_ids, curated, is_top_50_fr,
  audience_min_age, audience_age_source, audience_age_scope, audience_age_volumes, audience_age_ref, audience_age_year)
select 'BL métamorphose', 'Kaori Tsurutani', 'Ki-oon', 5, 'completed'::public.manga_status,
  array['tranche-de-vie','comedie','drame']::text[], null, 'Une veuve de 75 ans et une lycéenne timide se lient d''amitié autour de leur passion commune pour les mangas de romance entre garçons.', array['bl metamorphose','metamorphose no engawa','bl metamorphosis','メタモルフォーゼの縁側']::text[], '{"mal_id":113289}'::jsonb, true, false,
  13, 'cnlj', 'series', null, 'https://cnlj.bnf.fr/sites/default/files/bibliographies/mangamania-2026.pdf', 2026
where not pg_temp.catalogue_has(array['BL métamorphose','bl metamorphose','metamorphose no engawa','bl metamorphosis','メタモルフォーゼの縁側']::text[], 113289)
returning id
)
insert into public.catalogue_growth_inserted (manga_id, batch) select id, 'cnlj-2026-10' from inserted;

with inserted as (
insert into public.mangas (title, author, publisher_fr, total_volumes, status, genres, demographic, synopsis, aliases, external_ids, curated, is_top_50_fr,
  audience_min_age, audience_age_source, audience_age_scope, audience_age_volumes, audience_age_ref, audience_age_year)
select 'Blue Giant', 'Shinichi Ishizuka', 'Glénat', 10, 'completed'::public.manga_status,
  array['drame','tranche-de-vie']::text[], 'seinen', 'Un lycéen de Sendai se prend de passion pour le jazz et répète seul au saxophone ténor, décidé à devenir le meilleur du monde.', array['blue giant tenor saxophone, miyamoto dai','blue giant tenor saxophone miyamoto dai','ブルージャイアント']::text[], '{"mal_id":85719}'::jsonb, true, false,
  13, 'cnlj', 'series', null, 'https://cnlj.bnf.fr/sites/default/files/bibliographies/mangamania-2026.pdf', 2026
where not pg_temp.catalogue_has(array['Blue Giant','blue giant tenor saxophone, miyamoto dai','blue giant tenor saxophone miyamoto dai','ブルージャイアント']::text[], 85719)
returning id
)
insert into public.catalogue_growth_inserted (manga_id, batch) select id, 'cnlj-2026-10' from inserted;

with inserted as (
insert into public.mangas (title, author, publisher_fr, total_volumes, status, genres, demographic, synopsis, aliases, external_ids, curated, is_top_50_fr,
  audience_min_age, audience_age_source, audience_age_scope, audience_age_volumes, audience_age_ref, audience_age_year)
select 'Boys run the riot', 'Keito Gaku', 'Akata', 4, 'completed'::public.manga_status,
  array['drame','tranche-de-vie']::text[], 'seinen', 'Ryo, lycéen transgenre mal dans son uniforme, lance avec des amis une marque de vêtements de rue pour enfin s''affirmer.', array['ボーイズ・ラン・ザ・ライオット']::text[], '{"mal_id":124520}'::jsonb, true, false,
  13, 'cnlj', 'series', null, 'https://cnlj.bnf.fr/sites/default/files/bibliographies/mangamania-2026.pdf', 2026
where not pg_temp.catalogue_has(array['Boys run the riot','ボーイズ・ラン・ザ・ライオット']::text[], 124520)
returning id
)
insert into public.catalogue_growth_inserted (manga_id, batch) select id, 'cnlj-2026-10' from inserted;

with inserted as (
insert into public.mangas (title, author, publisher_fr, total_volumes, status, genres, demographic, synopsis, aliases, external_ids, curated, is_top_50_fr,
  audience_min_age, audience_age_source, audience_age_scope, audience_age_volumes, audience_age_ref, audience_age_year)
select 'Don''t fake your smile', 'Kotomi Aoki', 'Akata', 9, 'completed'::public.manga_status,
  array['drame','romance']::text[], 'shojo', 'Au club de judo d''un lycée, Gaku veille sur Niji, une amie lumineuse qui doit se reconstruire après une agression.', array['dont fake your smile','niji, amaete yo.','niji amaete yo','niji, lean on me','虹、甘えてよ。']::text[], '{"mal_id":111119}'::jsonb, true, false,
  13, 'cnlj', 'series', null, 'https://cnlj.bnf.fr/sites/default/files/bibliographies/mangamania-2026.pdf', 2026
where not pg_temp.catalogue_has(array['Don''t fake your smile','dont fake your smile','niji, amaete yo.','niji amaete yo','niji, lean on me','虹、甘えてよ。']::text[], 111119)
returning id
)
insert into public.catalogue_growth_inserted (manga_id, batch) select id, 'cnlj-2026-10' from inserted;

with inserted as (
insert into public.mangas (title, author, publisher_fr, total_volumes, status, genres, demographic, synopsis, aliases, external_ids, curated, is_top_50_fr,
  audience_min_age, audience_age_source, audience_age_scope, audience_age_volumes, audience_age_ref, audience_age_year)
select 'L''Enfant et le maudit : Siúil, a Rún', 'Nagabe', 'Komikku', 11, 'completed'::public.manga_status,
  array['fantasy','surnaturel','drame']::text[], null, 'Dans une forêt à l''écart du monde, une fillette vit avec une créature cornue dont le simple contact pourrait la maudire.', array['l''enfant et le maudit','totsukuni no shoujo','totsukuni no shōjo','the girl from the other side','the girl from the other side: siúil, a rún','とつくにの少女']::text[], '{"mal_id":93972}'::jsonb, true, false,
  13, 'cnlj', 'series', null, 'https://cnlj.bnf.fr/sites/default/files/bibliographies/mangamania-2026.pdf', 2026
where not pg_temp.catalogue_has(array['L''Enfant et le maudit : Siúil, a Rún','l''enfant et le maudit','totsukuni no shoujo','totsukuni no shōjo','the girl from the other side','the girl from the other side: siúil, a rún','とつくにの少女']::text[], 93972)
returning id
)
insert into public.catalogue_growth_inserted (manga_id, batch) select id, 'cnlj-2026-10' from inserted;

with inserted as (
insert into public.mangas (title, author, publisher_fr, total_volumes, status, genres, demographic, synopsis, aliases, external_ids, curated, is_top_50_fr,
  audience_min_age, audience_age_source, audience_age_scope, audience_age_volumes, audience_age_ref, audience_age_year)
select 'Gunnm : Mars chronicle', 'Yukito Kishiro', 'Glénat', 11, 'completed'::public.manga_status,
  array['science-fiction','action','drame']::text[], 'seinen', 'Bien avant la décharge de Kuzutetsu, Gally revit son enfance sur une planète Mars rongée par la guerre et la misère.', array['gunnm mars chronicle','gunnm: kasei senki','gunnm kasei senki','battle angel alita: mars chronicle','銃夢火星戦記']::text[], '{"mal_id":81507}'::jsonb, true, false,
  13, 'cnlj', 'series', null, 'https://cnlj.bnf.fr/sites/default/files/bibliographies/mangamania-2026.pdf', 2026
where not pg_temp.catalogue_has(array['Gunnm : Mars chronicle','gunnm mars chronicle','gunnm: kasei senki','gunnm kasei senki','battle angel alita: mars chronicle','銃夢火星戦記']::text[], 81507)
returning id
)
insert into public.catalogue_growth_inserted (manga_id, batch) select id, 'cnlj-2026-10' from inserted;

with inserted as (
insert into public.mangas (title, author, publisher_fr, total_volumes, status, genres, demographic, synopsis, aliases, external_ids, curated, is_top_50_fr,
  audience_min_age, audience_age_source, audience_age_scope, audience_age_volumes, audience_age_ref, audience_age_year)
select 'Isabella Bird femme exploratrice', 'Taiga Sassa', 'Ki-oon', 13, 'ongoing'::public.manga_status,
  array['historique','aventure','tranche-de-vie']::text[], 'seinen', 'En 1878, une voyageuse anglaise et son jeune interprète parcourent le Japon de l''ère Meiji, loin des routes connues des étrangers.', array['isabella bird - femme exploratrice','fushigi no kuni no bird','isabella bird in wonderland','ふしぎの国のバード']::text[], '{"mal_id":90153}'::jsonb, true, false,
  13, 'cnlj', 'series', null, 'https://cnlj.bnf.fr/sites/default/files/bibliographies/mangamania-2026.pdf', 2026
where not pg_temp.catalogue_has(array['Isabella Bird femme exploratrice','isabella bird - femme exploratrice','fushigi no kuni no bird','isabella bird in wonderland','ふしぎの国のバード']::text[], 90153)
returning id
)
insert into public.catalogue_growth_inserted (manga_id, batch) select id, 'cnlj-2026-10' from inserted;

with inserted as (
insert into public.mangas (title, author, publisher_fr, total_volumes, status, genres, demographic, synopsis, aliases, external_ids, curated, is_top_50_fr,
  audience_min_age, audience_age_source, audience_age_scope, audience_age_volumes, audience_age_ref, audience_age_year)
select 'Mahoromi : chroniques architecturales de l''espace-temps', 'Kei Toume', 'Le Lézard Noir', 4, 'completed'::public.manga_status,
  array['mystere','surnaturel','drame']::text[], 'seinen', 'Un étudiant en architecture découvre qu''il peut percevoir les souvenirs enfouis dans les vieux bâtiments, et une mystérieuse jeune fille semble liée à ces visions.', array['mahoromi','mahoromi: jikuu kenchiku genshitan','マホロミ 時空建築幻視譚','mahoromi chroniques architecturales de l''espace temps']::text[], '{"mal_id":23951}'::jsonb, true, false,
  13, 'cnlj', 'series', null, 'https://cnlj.bnf.fr/sites/default/files/bibliographies/mangamania-2026.pdf', 2026
where not pg_temp.catalogue_has(array['Mahoromi : chroniques architecturales de l''espace-temps','mahoromi','mahoromi: jikuu kenchiku genshitan','マホロミ 時空建築幻視譚','mahoromi chroniques architecturales de l''espace temps']::text[], 23951)
returning id
)
insert into public.catalogue_growth_inserted (manga_id, batch) select id, 'cnlj-2026-10' from inserted;

with inserted as (
insert into public.mangas (title, author, publisher_fr, total_volumes, status, genres, demographic, synopsis, aliases, external_ids, curated, is_top_50_fr,
  audience_min_age, audience_age_source, audience_age_scope, audience_age_volumes, audience_age_ref, audience_age_year)
select 'Neon genesis evangelion : perfect edition', 'Yoshiyuki Sadamoto', 'Glénat', 7, 'completed'::public.manga_status,
  array['science-fiction','action','psychologique','drame']::text[], 'shonen', 'Dans la cité de Tokyo-3, l''adolescent Shinji est appelé par son père à piloter un robot géant pour repousser les Anges qui menacent l''humanité.', array['neon genesis evangelion','shin seiki evangelion','shinseiki evangelion','新世紀エヴァンゲリオン','evangelion','evangelion perfect edition']::text[], '{"mal_id":698}'::jsonb, true, false,
  13, 'cnlj', 'series', null, 'https://cnlj.bnf.fr/sites/default/files/bibliographies/mangamania-2026.pdf', 2026
where not pg_temp.catalogue_has(array['Neon genesis evangelion : perfect edition','neon genesis evangelion','shin seiki evangelion','shinseiki evangelion','新世紀エヴァンゲリオン','evangelion','evangelion perfect edition']::text[], 698)
returning id
)
insert into public.catalogue_growth_inserted (manga_id, batch) select id, 'cnlj-2026-10' from inserted;

with inserted as (
insert into public.mangas (title, author, publisher_fr, total_volumes, status, genres, demographic, synopsis, aliases, external_ids, curated, is_top_50_fr,
  audience_min_age, audience_age_source, audience_age_scope, audience_age_volumes, audience_age_ref, audience_age_year)
select 'New normal', 'Akito Aihara', 'Kana', null, 'ongoing'::public.manga_status,
  array['romance','tranche-de-vie','drame']::text[], 'shonen', 'Dans un futur proche où le masque est obligatoire depuis une pandémie, deux lycéens se rapprochent autour d''un secret qu''ils partagent.', array['ニューノーマル']::text[], '{"mal_id":138516}'::jsonb, true, false,
  13, 'cnlj', 'series', null, 'https://cnlj.bnf.fr/sites/default/files/bibliographies/mangamania-2026.pdf', 2026
where not pg_temp.catalogue_has(array['New normal','ニューノーマル']::text[], 138516)
returning id
)
insert into public.catalogue_growth_inserted (manga_id, batch) select id, 'cnlj-2026-10' from inserted;

with inserted as (
insert into public.mangas (title, author, publisher_fr, total_volumes, status, genres, demographic, synopsis, aliases, external_ids, curated, is_top_50_fr,
  audience_min_age, audience_age_source, audience_age_scope, audience_age_volumes, audience_age_ref, audience_age_year)
select 'Nine peaks', 'Tetsuhiro Hirakawa', 'Ki-oon', null, 'ongoing'::public.manga_status,
  array['action','drame','aventure']::text[], 'shonen', 'Après la mort de son père, Gaku se réveille vingt-deux ans dans le passé, où il croise la route de ce père encore adolescent et chef de bande.', array['ナインピークス']::text[], '{"mal_id":147561}'::jsonb, true, false,
  13, 'cnlj', 'series', null, 'https://cnlj.bnf.fr/sites/default/files/bibliographies/mangamania-2026.pdf', 2026
where not pg_temp.catalogue_has(array['Nine peaks','ナインピークス']::text[], 147561)
returning id
)
insert into public.catalogue_growth_inserted (manga_id, batch) select id, 'cnlj-2026-10' from inserted;

with inserted as (
insert into public.mangas (title, author, publisher_fr, total_volumes, status, genres, demographic, synopsis, aliases, external_ids, curated, is_top_50_fr,
  audience_min_age, audience_age_source, audience_age_scope, audience_age_volumes, audience_age_ref, audience_age_year)
select 'Orange', 'Ichigo Takano', 'Akata', 7, 'completed'::public.manga_status,
  array['romance','drame','science-fiction','tranche-de-vie']::text[], 'shojo', 'Naho, seize ans, reçoit des lettres écrites par elle-même dix ans plus tard, qui la pressent d''éviter des regrets autour d''un nouvel élève.', array['オレンジ']::text[], '{"mal_id":35573}'::jsonb, true, false,
  13, 'cnlj', 'series', null, 'https://cnlj.bnf.fr/sites/default/files/bibliographies/mangamania-2026.pdf', 2026
where not pg_temp.catalogue_has(array['Orange','オレンジ']::text[], 35573)
returning id
)
insert into public.catalogue_growth_inserted (manga_id, batch) select id, 'cnlj-2026-10' from inserted;

with inserted as (
insert into public.mangas (title, author, publisher_fr, total_volumes, status, genres, demographic, synopsis, aliases, external_ids, curated, is_top_50_fr,
  audience_min_age, audience_age_source, audience_age_scope, audience_age_volumes, audience_age_ref, audience_age_year)
select 'L''oxalis et l''or', 'Eiichi Kitano', 'Glénat', 10, 'completed'::public.manga_status,
  array['historique','aventure','drame']::text[], 'seinen', 'En 1849, une jeune Irlandaise chassée de ses terres par la famine part avec son domestique tenter sa chance dans la ruée vers l''or californienne.', array['oxalis et l''or','katabami to ougon','片喰と黄金']::text[], '{"mal_id":119687}'::jsonb, true, false,
  13, 'cnlj', 'series', null, 'https://cnlj.bnf.fr/sites/default/files/bibliographies/mangamania-2026.pdf', 2026
where not pg_temp.catalogue_has(array['L''oxalis et l''or','oxalis et l''or','katabami to ougon','片喰と黄金']::text[], 119687)
returning id
)
insert into public.catalogue_growth_inserted (manga_id, batch) select id, 'cnlj-2026-10' from inserted;

with inserted as (
insert into public.mangas (title, author, publisher_fr, total_volumes, status, genres, demographic, synopsis, aliases, external_ids, curated, is_top_50_fr,
  audience_min_age, audience_age_source, audience_age_scope, audience_age_volumes, audience_age_ref, audience_age_year)
select 'Perfect world', 'Rie Aruga', 'Akata', 12, 'completed'::public.manga_status,
  array['romance','drame','tranche-de-vie']::text[], 'josei', 'Une décoratrice d''intérieur retrouve son amour de lycée, devenu architecte en fauteuil roulant, et tous deux affrontent les obstacles d''une relation.', array['パーフェクトワールド']::text[], '{"mal_id":83655}'::jsonb, true, false,
  13, 'cnlj', 'series', null, 'https://cnlj.bnf.fr/sites/default/files/bibliographies/mangamania-2026.pdf', 2026
where not pg_temp.catalogue_has(array['Perfect world','パーフェクトワールド']::text[], 83655)
returning id
)
insert into public.catalogue_growth_inserted (manga_id, batch) select id, 'cnlj-2026-10' from inserted;

with inserted as (
insert into public.mangas (title, author, publisher_fr, total_volumes, status, genres, demographic, synopsis, aliases, external_ids, curated, is_top_50_fr,
  audience_min_age, audience_age_source, audience_age_scope, audience_age_volumes, audience_age_ref, audience_age_year)
select 'Pino : l''I.A. émotionnelle', 'Takashi Murakami', 'Pika', 1, 'completed'::public.manga_status,
  array['science-fiction','drame']::text[], 'seinen', 'Un robot humanoïde, première I.A. à dépasser l''humain, s''attache aux animaux de laboratoire dont il a la charge et découvre ce que veut dire aimer.', array['pino','ピノ:pino','pino, l''ia émotionnelle']::text[], '{"mal_id":138493}'::jsonb, true, false,
  13, 'cnlj', 'series', null, 'https://cnlj.bnf.fr/sites/default/files/bibliographies/mangamania-2026.pdf', 2026
where not pg_temp.catalogue_has(array['Pino : l''I.A. émotionnelle','pino','ピノ:pino','pino, l''ia émotionnelle']::text[], 138493)
returning id
)
insert into public.catalogue_growth_inserted (manga_id, batch) select id, 'cnlj-2026-10' from inserted;

with inserted as (
insert into public.mangas (title, author, publisher_fr, total_volumes, status, genres, demographic, synopsis, aliases, external_ids, curated, is_top_50_fr,
  audience_min_age, audience_age_source, audience_age_scope, audience_age_volumes, audience_age_ref, audience_age_year)
select 'Reine d''Égypte', 'Chie Inudoh', 'Ki-oon', 9, 'completed'::public.manga_status,
  array['historique','aventure','drame']::text[], 'seinen', 'Dans l''Égypte antique, une jeune princesse au caractère bien trempé se bat pour régner dans un monde où le trône est réservé aux hommes.', array['reine d''egypte','aoi horus no hitomi: dansou no joou no monogatari','aoi horus no hitomi']::text[], '{"mal_id":92991}'::jsonb, true, false,
  13, 'cnlj', 'series', null, 'https://cnlj.bnf.fr/sites/default/files/bibliographies/mangamania-2026.pdf', 2026
where not pg_temp.catalogue_has(array['Reine d''Égypte','reine d''egypte','aoi horus no hitomi: dansou no joou no monogatari','aoi horus no hitomi']::text[], 92991)
returning id
)
insert into public.catalogue_growth_inserted (manga_id, batch) select id, 'cnlj-2026-10' from inserted;

with inserted as (
insert into public.mangas (title, author, publisher_fr, total_volumes, status, genres, demographic, synopsis, aliases, external_ids, curated, is_top_50_fr,
  audience_min_age, audience_age_source, audience_age_scope, audience_age_volumes, audience_age_ref, audience_age_year)
select 'Rendez-vous au crépuscule', 'Tetsuya Sano (scénario), Daichi Matsuse (dessin)', 'Akata', 2, 'completed'::public.manga_status,
  array['romance','drame']::text[], null, 'Un lycéen endeuillé aide une camarade atteinte d''une maladie rare, dont le corps brille sous la lune, à réaliser ses souhaits avant qu''il ne soit trop tard.', array['kimi wa tsukiyo ni hikarikagayaku','君は月夜に光り輝く','you shine in the moonlight','kimitsuki']::text[], '{"mal_id":114852}'::jsonb, true, false,
  13, 'cnlj', 'series', null, 'https://cnlj.bnf.fr/sites/default/files/bibliographies/mangamania-2026.pdf', 2026
where not pg_temp.catalogue_has(array['Rendez-vous au crépuscule','kimi wa tsukiyo ni hikarikagayaku','君は月夜に光り輝く','you shine in the moonlight','kimitsuki']::text[], 114852)
returning id
)
insert into public.catalogue_growth_inserted (manga_id, batch) select id, 'cnlj-2026-10' from inserted;

with inserted as (
insert into public.mangas (title, author, publisher_fr, total_volumes, status, genres, demographic, synopsis, aliases, external_ids, curated, is_top_50_fr,
  audience_min_age, audience_age_source, audience_age_scope, audience_age_volumes, audience_age_ref, audience_age_year)
select 'Le sommet des Dieux', 'Jirō Taniguchi (dessin), Baku Yumemakura (roman original)', 'Kana', 5, 'completed'::public.manga_status,
  array['aventure','drame','sport']::text[], 'seinen', 'Un photographe japonais enquête sur un alpiniste solitaire et obstiné, jusqu''aux pentes glacées de l''Everest.', array['kamigami no itadaki','神々の山嶺','the summit of the gods']::text[], '{"mal_id":4625}'::jsonb, true, false,
  13, 'cnlj', 'series', null, 'https://cnlj.bnf.fr/sites/default/files/bibliographies/mangamania-2026.pdf', 2026
where not pg_temp.catalogue_has(array['Le sommet des Dieux','kamigami no itadaki','神々の山嶺','the summit of the gods']::text[], 4625)
returning id
)
insert into public.catalogue_growth_inserted (manga_id, batch) select id, 'cnlj-2026-10' from inserted;

with inserted as (
insert into public.mangas (title, author, publisher_fr, total_volumes, status, genres, demographic, synopsis, aliases, external_ids, curated, is_top_50_fr,
  audience_min_age, audience_age_source, audience_age_scope, audience_age_volumes, audience_age_ref, audience_age_year)
select 'Souvenirs d''Emanon', 'Shinji Kajio (scénario), Kenji Tsuruta (dessin)', 'Ki-oon', 1, 'completed'::public.manga_status,
  array['surnaturel','drame','tranche-de-vie']::text[], 'seinen', 'Sur un ferry, un étudiant rencontre une jeune voyageuse mystérieuse qui garde en elle le souvenir de toute l''histoire de la vie sur Terre.', array['omoide emanon','おもいでエマノン','emanon: memories of emanon','memories of emanon']::text[], '{"mal_id":17465}'::jsonb, true, false,
  13, 'cnlj', 'series', null, 'https://cnlj.bnf.fr/sites/default/files/bibliographies/mangamania-2026.pdf', 2026
where not pg_temp.catalogue_has(array['Souvenirs d''Emanon','omoide emanon','おもいでエマノン','emanon: memories of emanon','memories of emanon']::text[], 17465)
returning id
)
insert into public.catalogue_growth_inserted (manga_id, batch) select id, 'cnlj-2026-10' from inserted;

with inserted as (
insert into public.mangas (title, author, publisher_fr, total_volumes, status, genres, demographic, synopsis, aliases, external_ids, curated, is_top_50_fr,
  audience_min_age, audience_age_source, audience_age_scope, audience_age_volumes, audience_age_ref, audience_age_year)
select 'Space brothers', 'Chūya Koyama', 'Pika', 46, 'ongoing'::public.manga_status,
  array['science-fiction','drame','comedie','tranche-de-vie']::text[], 'seinen', 'Deux frères se sont promis enfant d''aller dans l''espace : le cadet est déjà astronaute, l''aîné, au chômage, se lance enfin à sa poursuite.', array['uchuu kyoudai','uchū kyōdai','宇宙兄弟']::text[], '{"mal_id":14483}'::jsonb, true, false,
  13, 'cnlj', 'series', null, 'https://cnlj.bnf.fr/sites/default/files/bibliographies/mangamania-2026.pdf', 2026
where not pg_temp.catalogue_has(array['Space brothers','uchuu kyoudai','uchū kyōdai','宇宙兄弟']::text[], 14483)
returning id
)
insert into public.catalogue_growth_inserted (manga_id, batch) select id, 'cnlj-2026-10' from inserted;

with inserted as (
insert into public.mangas (title, author, publisher_fr, total_volumes, status, genres, demographic, synopsis, aliases, external_ids, curated, is_top_50_fr,
  audience_min_age, audience_age_source, audience_age_scope, audience_age_volumes, audience_age_ref, audience_age_year)
select 'Terrarium', 'Yūna Hirasawa', 'Glénat', 4, 'completed'::public.manga_status,
  array['science-fiction','aventure','tranche-de-vie']::text[], 'seinen', 'Une fillette et un petit robot traversent des villes désertées, en quête d''autres survivants et de leur mère.', array['kagi-tsuki terrarium','kagitsuki terrarium','鍵つきテラリウム','terrarium under lock','the terrarium with key']::text[], '{"mal_id":121647}'::jsonb, true, false,
  13, 'cnlj', 'series', null, 'https://cnlj.bnf.fr/sites/default/files/bibliographies/mangamania-2026.pdf', 2026
where not pg_temp.catalogue_has(array['Terrarium','kagi-tsuki terrarium','kagitsuki terrarium','鍵つきテラリウム','terrarium under lock','the terrarium with key']::text[], 121647)
returning id
)
insert into public.catalogue_growth_inserted (manga_id, batch) select id, 'cnlj-2026-10' from inserted;

with inserted as (
insert into public.mangas (title, author, publisher_fr, total_volumes, status, genres, demographic, synopsis, aliases, external_ids, curated, is_top_50_fr,
  audience_min_age, audience_age_source, audience_age_scope, audience_age_volumes, audience_age_ref, audience_age_year)
select 'Le tigre des neiges', 'Akiko Higashimura', 'Le Lézard Noir', 10, 'completed'::public.manga_status,
  array['historique','drame','action']::text[], 'seinen', 'Au Japon des guerres féodales, une fille élevée comme un garçon devient Uesugi Kenshin, le seigneur de guerre surnommé le Tigre d''Echigo.', array['yukibana no tora','sekka no tora','雪花の虎']::text[], '{"mal_id":88750}'::jsonb, true, false,
  13, 'cnlj', 'series', null, 'https://cnlj.bnf.fr/sites/default/files/bibliographies/mangamania-2026.pdf', 2026
where not pg_temp.catalogue_has(array['Le tigre des neiges','yukibana no tora','sekka no tora','雪花の虎']::text[], 88750)
returning id
)
insert into public.catalogue_growth_inserted (manga_id, batch) select id, 'cnlj-2026-10' from inserted;

with inserted as (
insert into public.mangas (title, author, publisher_fr, total_volumes, status, genres, demographic, synopsis, aliases, external_ids, curated, is_top_50_fr,
  audience_min_age, audience_age_source, audience_age_scope, audience_age_volumes, audience_age_ref, audience_age_year)
select 'Trait pour trait : dessine et tais-toi !', 'Akiko Higashimura', 'Akata', 5, 'completed'::public.manga_status,
  array['tranche-de-vie','drame','comedie']::text[], 'josei', 'Une lycéenne persuadée d''avoir du talent entre dans l''atelier d''un professeur de dessin intraitable, qui va changer sa vie d''artiste.', array['trait pour trait','kakukaku shikajika','blank canvas: my so-called artist''s journey','かくかくしかじか']::text[], '{"mal_id":44307}'::jsonb, true, false,
  13, 'cnlj', 'series', null, 'https://cnlj.bnf.fr/sites/default/files/bibliographies/mangamania-2026.pdf', 2026
where not pg_temp.catalogue_has(array['Trait pour trait : dessine et tais-toi !','trait pour trait','kakukaku shikajika','blank canvas: my so-called artist''s journey','かくかくしかじか']::text[], 44307)
returning id
)
insert into public.catalogue_growth_inserted (manga_id, batch) select id, 'cnlj-2026-10' from inserted;

with inserted as (
insert into public.mangas (title, author, publisher_fr, total_volumes, status, genres, demographic, synopsis, aliases, external_ids, curated, is_top_50_fr,
  audience_min_age, audience_age_source, audience_age_scope, audience_age_volumes, audience_age_ref, audience_age_year)
select 'Tsugai, daemons of the shadow realm', 'Hiromu Arakawa', 'Kurokawa', 10, 'ongoing'::public.manga_status,
  array['action','fantasy','surnaturel']::text[], 'shonen', 'Dans un village de montagne isolé, le jeune Yuru découvre que sa sœur jumelle et lui sont liés à de puissants esprits gardiens.', array['tsugai','daemons of the shadow realm','yomi no tsugai','黄泉のツガイ']::text[], '{"mal_id":141772}'::jsonb, true, false,
  13, 'cnlj', 'series', null, 'https://cnlj.bnf.fr/sites/default/files/bibliographies/mangamania-2026.pdf', 2026
where not pg_temp.catalogue_has(array['Tsugai, daemons of the shadow realm','tsugai','daemons of the shadow realm','yomi no tsugai','黄泉のツガイ']::text[], 141772)
returning id
)
insert into public.catalogue_growth_inserted (manga_id, batch) select id, 'cnlj-2026-10' from inserted;

with inserted as (
insert into public.mangas (title, author, publisher_fr, total_volumes, status, genres, demographic, synopsis, aliases, external_ids, curated, is_top_50_fr,
  audience_min_age, audience_age_source, audience_age_scope, audience_age_volumes, audience_age_ref, audience_age_year)
select 'La voie du tablier', 'Kousuke Oono', 'Kana', 16, 'ongoing'::public.manga_status,
  array['comedie','tranche-de-vie','cuisine']::text[], 'seinen', 'Un ancien yakuza redouté a raccroché pour devenir homme au foyer, et il met la même intensité à cuisiner qu''à régler ses comptes autrefois.', array['gokushufudou','gokushufudo','the way of the househusband','極主夫道']::text[], '{"mal_id":112922}'::jsonb, true, false,
  13, 'cnlj', 'series', null, 'https://cnlj.bnf.fr/sites/default/files/bibliographies/mangamania-2026.pdf', 2026
where not pg_temp.catalogue_has(array['La voie du tablier','gokushufudou','gokushufudo','the way of the househusband','極主夫道']::text[], 112922)
returning id
)
insert into public.catalogue_growth_inserted (manga_id, batch) select id, 'cnlj-2026-10' from inserted;

with inserted as (
insert into public.mangas (title, author, publisher_fr, total_volumes, status, genres, demographic, synopsis, aliases, external_ids, curated, is_top_50_fr,
  audience_min_age, audience_age_source, audience_age_scope, audience_age_volumes, audience_age_ref, audience_age_year)
select 'Le voyage de Kuro : histoire d''une itinérante', 'Satoko Kiyuduki', 'Kana', 7, 'completed'::public.manga_status,
  array['aventure','fantasy','tranche-de-vie']::text[], 'seinen', 'Vêtue de noir et un cercueil sur le dos, Kuro parcourt le monde avec un étrange compagnon ailé, au fil de rencontres douces et mélancoliques.', array['le voyage de kuro','hitsugi katsugi no kuro','hitsugikatsugi no kuro','shoulder-a-coffin kuro','棺担ぎのクロ。']::text[], '{"mal_id":4453}'::jsonb, true, false,
  13, 'cnlj', 'series', null, 'https://cnlj.bnf.fr/sites/default/files/bibliographies/mangamania-2026.pdf', 2026
where not pg_temp.catalogue_has(array['Le voyage de Kuro : histoire d''une itinérante','le voyage de kuro','hitsugi katsugi no kuro','hitsugikatsugi no kuro','shoulder-a-coffin kuro','棺担ぎのクロ。']::text[], 4453)
returning id
)
insert into public.catalogue_growth_inserted (manga_id, batch) select id, 'cnlj-2026-10' from inserted;

with inserted as (
insert into public.mangas (title, author, publisher_fr, total_volumes, status, genres, demographic, synopsis, aliases, external_ids, curated, is_top_50_fr,
  audience_min_age, audience_age_source, audience_age_scope, audience_age_volumes, audience_age_ref, audience_age_year)
select 'Yawara !', 'Naoki Urasawa', 'Kana', 20, 'completed'::public.manga_status,
  array['sport','comedie','romance']::text[], 'seinen', 'Petite-fille d''un champion de judo, Yawara rêve d''une vie normale alors que son grand-père veut en faire une star olympique.', array['yawara!','yawara','yawara! édition deluxe','ヤワラ!']::text[], '{"mal_id":853}'::jsonb, true, false,
  13, 'cnlj', 'series', null, 'https://cnlj.bnf.fr/sites/default/files/bibliographies/mangamania-2026.pdf', 2026
where not pg_temp.catalogue_has(array['Yawara !','yawara!','yawara','yawara! édition deluxe','ヤワラ!']::text[], 853)
returning id
)
insert into public.catalogue_growth_inserted (manga_id, batch) select id, 'cnlj-2026-10' from inserted;

with inserted as (
insert into public.mangas (title, author, publisher_fr, total_volumes, status, genres, demographic, synopsis, aliases, external_ids, curated, is_top_50_fr,
  audience_min_age, audience_age_source, audience_age_scope, audience_age_volumes, audience_age_ref, audience_age_year)
select 'Yon', 'Camille Broutin', 'Dargaud', 4, 'completed'::public.manga_status,
  array['psychologique','horreur','surnaturel']::text[], null, 'Dans un internat perdu au milieu du désert, une élève discrète se retrouve enfermée avec ses camarades quand d''étranges créatures tombent du ciel.', '{}'::text[], '{}'::jsonb, true, false,
  13, 'cnlj', 'series', null, 'https://cnlj.bnf.fr/sites/default/files/bibliographies/mangamania-2026.pdf', 2026
where not pg_temp.catalogue_has(array['Yon']::text[], null)
returning id
)
insert into public.catalogue_growth_inserted (manga_id, batch) select id, 'cnlj-2026-10' from inserted;

with inserted as (
insert into public.mangas (title, author, publisher_fr, total_volumes, status, genres, demographic, synopsis, aliases, external_ids, curated, is_top_50_fr,
  audience_min_age, audience_age_source, audience_age_scope, audience_age_volumes, audience_age_ref, audience_age_year)
select 'Dans le sens du vent : nord, nord-ouest', 'Aki Irie', 'Soleil', null, 'ongoing'::public.manga_status,
  array['mystere','surnaturel','drame','aventure']::text[], 'seinen', 'En Islande, Kei, 17 ans, détective à ses heures et capable de parler aux objets, enchaîne les petites missions jusqu''à ce que l''arrivée de son jeune frère complique tout.', array['hokuhokusei ni kumo to ike','go with the clouds, north-by-northwest','北北西に曇と往け']::text[], '{"mal_id":97179}'::jsonb, true, false,
  14, 'cnlj', 'series', null, 'https://cnlj.bnf.fr/sites/default/files/bibliographies/mangamania-2026.pdf', 2026
where not pg_temp.catalogue_has(array['Dans le sens du vent : nord, nord-ouest','hokuhokusei ni kumo to ike','go with the clouds, north-by-northwest','北北西に曇と往け']::text[], 97179)
returning id
)
insert into public.catalogue_growth_inserted (manga_id, batch) select id, 'cnlj-2026-10' from inserted;

with inserted as (
insert into public.mangas (title, author, publisher_fr, total_volumes, status, genres, demographic, synopsis, aliases, external_ids, curated, is_top_50_fr,
  audience_min_age, audience_age_source, audience_age_scope, audience_age_volumes, audience_age_ref, audience_age_year)
select 'Darwin''s incident', 'Shun Umezawa', 'Kana', null, 'ongoing'::public.manga_status,
  array['science-fiction','drame','psychologique','action']::text[], 'seinen', 'Charlie, mi-humain mi-chimpanzé, fait son entrée au lycée et se retrouve mêlé aux actions d''un groupe militant pour la cause animale.', array['darwin jihen','the darwin incident','ダーウィン事変']::text[], '{"mal_id":130755}'::jsonb, true, false,
  14, 'cnlj', 'series', null, 'https://cnlj.bnf.fr/sites/default/files/bibliographies/mangamania-2026.pdf', 2026
where not pg_temp.catalogue_has(array['Darwin''s incident','darwin jihen','the darwin incident','ダーウィン事変']::text[], 130755)
returning id
)
insert into public.catalogue_growth_inserted (manga_id, batch) select id, 'cnlj-2026-10' from inserted;

with inserted as (
insert into public.mangas (title, author, publisher_fr, total_volumes, status, genres, demographic, synopsis, aliases, external_ids, curated, is_top_50_fr,
  audience_min_age, audience_age_source, audience_age_scope, audience_age_volumes, audience_age_ref, audience_age_year)
select 'Golden Kamui', 'Satoru Noda', 'Ki-oon', 31, 'completed'::public.manga_status,
  array['aventure','historique','action']::text[], 'seinen', 'Dans le Hokkaido du début du XXe siècle, un ancien soldat et une jeune Aïnoue partent sur la piste d''un trésor caché, au cœur d''une nature hostile.', array['golden kamuy','ゴールデンカムイ']::text[], '{"mal_id":85968}'::jsonb, true, false,
  14, 'cnlj', 'series', null, 'https://cnlj.bnf.fr/sites/default/files/bibliographies/mangamania-2026.pdf', 2026
where not pg_temp.catalogue_has(array['Golden Kamui','golden kamuy','ゴールデンカムイ']::text[], 85968)
returning id
)
insert into public.catalogue_growth_inserted (manga_id, batch) select id, 'cnlj-2026-10' from inserted;

with inserted as (
insert into public.mangas (title, author, publisher_fr, total_volumes, status, genres, demographic, synopsis, aliases, external_ids, curated, is_top_50_fr,
  audience_min_age, audience_age_source, audience_age_scope, audience_age_volumes, audience_age_ref, audience_age_year)
select 'Maison Ikkoku perfect edition', 'Rumiko Takahashi', 'Delcourt/Tonkam', 10, 'completed'::public.manga_status,
  array['romance','comedie','tranche-de-vie','drame']::text[], 'seinen', 'Un étudiant peu doué tombe amoureux de la jeune gérante de sa pension, sous l''œil moqueur de voisins qui adorent se mêler de tout.', array['maison ikkoku','juliette je t''aime','めぞん一刻']::text[], '{"mal_id":688}'::jsonb, true, false,
  14, 'cnlj', 'series', null, 'https://cnlj.bnf.fr/sites/default/files/bibliographies/mangamania-2026.pdf', 2026
where not pg_temp.catalogue_has(array['Maison Ikkoku perfect edition','maison ikkoku','juliette je t''aime','めぞん一刻']::text[], 688)
returning id
)
insert into public.catalogue_growth_inserted (manga_id, batch) select id, 'cnlj-2026-10' from inserted;

with inserted as (
insert into public.mangas (title, author, publisher_fr, total_volumes, status, genres, demographic, synopsis, aliases, external_ids, curated, is_top_50_fr,
  audience_min_age, audience_age_source, audience_age_scope, audience_age_volumes, audience_age_ref, audience_age_year)
select 'Akira nouvelle édition', 'Katsuhiro Otomo', 'Glénat', 6, 'completed'::public.manga_status,
  array['science-fiction','action','psychologique']::text[], 'seinen', 'À Néo-Tokyo, après une guerre mondiale, un jeune chef de bande voit son meilleur ami développer des pouvoirs qui menacent la ville entière.', array['akira','アキラ']::text[], '{"mal_id":664}'::jsonb, true, false,
  15, 'cnlj', 'series', null, 'https://cnlj.bnf.fr/sites/default/files/bibliographies/mangamania-2026.pdf', 2026
where not pg_temp.catalogue_has(array['Akira nouvelle édition','akira','アキラ']::text[], 664)
returning id
)
insert into public.catalogue_growth_inserted (manga_id, batch) select id, 'cnlj-2026-10' from inserted;

with inserted as (
insert into public.mangas (title, author, publisher_fr, total_volumes, status, genres, demographic, synopsis, aliases, external_ids, curated, is_top_50_fr,
  audience_min_age, audience_age_source, audience_age_scope, audience_age_volumes, audience_age_ref, audience_age_year)
select 'Blame ! Deluxe', 'Tsutomu Nihei', 'Glénat', 6, 'completed'::public.manga_status,
  array['science-fiction','action','mystere']::text[], 'seinen', 'Un voyageur solitaire arpente une mégastructure sans fin, peuplée de machines hostiles, pour retrouver la trace d''humains au gène perdu.', array['blame!','blame','blame ! édition deluxe']::text[], '{"mal_id":149}'::jsonb, true, false,
  15, 'cnlj', 'series', null, 'https://cnlj.bnf.fr/sites/default/files/bibliographies/mangamania-2026.pdf', 2026
where not pg_temp.catalogue_has(array['Blame ! Deluxe','blame!','blame','blame ! édition deluxe']::text[], 149)
returning id
)
insert into public.catalogue_growth_inserted (manga_id, batch) select id, 'cnlj-2026-10' from inserted;

with inserted as (
insert into public.mangas (title, author, publisher_fr, total_volumes, status, genres, demographic, synopsis, aliases, external_ids, curated, is_top_50_fr,
  audience_min_age, audience_age_source, audience_age_scope, audience_age_volumes, audience_age_ref, audience_age_year)
select 'La Danse du Soleil et de la Lune', 'Daruma Matsuura', 'Ki-oon', null, 'ongoing'::public.manga_status,
  array['fantasy','historique','action','romance']::text[], 'seinen', 'Un samouraï qui fait plier le métal malgré lui part à la recherche de sa mystérieuse épouse enlevée, face à des maîtres du yin et du yang.', array['taiyou to tsuki no hagane','steel of the celestial shadows','太陽と月の鋼']::text[], '{"mal_id":127482}'::jsonb, true, false,
  15, 'cnlj', 'series', null, 'https://cnlj.bnf.fr/sites/default/files/bibliographies/mangamania-2026.pdf', 2026
where not pg_temp.catalogue_has(array['La Danse du Soleil et de la Lune','taiyou to tsuki no hagane','steel of the celestial shadows','太陽と月の鋼']::text[], 127482)
returning id
)
insert into public.catalogue_growth_inserted (manga_id, batch) select id, 'cnlj-2026-10' from inserted;

with inserted as (
insert into public.mangas (title, author, publisher_fr, total_volumes, status, genres, demographic, synopsis, aliases, external_ids, curated, is_top_50_fr,
  audience_min_age, audience_age_source, audience_age_scope, audience_age_volumes, audience_age_ref, audience_age_year)
select 'Dēmokratia', 'Motorō Mase', 'Crunchyroll', 5, 'completed'::public.manga_status,
  array['science-fiction','psychologique','mystere']::text[], 'seinen', 'Deux étudiants confient chaque geste d''un androïde au vote de 3000 internautes anonymes, et les décisions de la foule dérapent vite.', array['demokratia','デモクラティア']::text[], '{"mal_id":85159}'::jsonb, true, false,
  15, 'cnlj', 'series', null, 'https://cnlj.bnf.fr/sites/default/files/bibliographies/mangamania-2026.pdf', 2026
where not pg_temp.catalogue_has(array['Dēmokratia','demokratia','デモクラティア']::text[], 85159)
returning id
)
insert into public.catalogue_growth_inserted (manga_id, batch) select id, 'cnlj-2026-10' from inserted;

with inserted as (
insert into public.mangas (title, author, publisher_fr, total_volumes, status, genres, demographic, synopsis, aliases, external_ids, curated, is_top_50_fr,
  audience_min_age, audience_age_source, audience_age_scope, audience_age_volumes, audience_age_ref, audience_age_year)
select 'My broken Mariko', 'Waka Hirako', 'Ki-oon', 1, 'completed'::public.manga_status,
  array['drame','psychologique']::text[], 'josei', 'Après la mort de son amie d''enfance, Tomo vole ses cendres et part avec elles vers la mer, portée par le chagrin et la colère.', array['mai burōkun mariko','マイ・ブロークン・マリコ']::text[], '{"mal_id":123812}'::jsonb, true, false,
  15, 'cnlj', 'series', null, 'https://cnlj.bnf.fr/sites/default/files/bibliographies/mangamania-2026.pdf', 2026
where not pg_temp.catalogue_has(array['My broken Mariko','mai burōkun mariko','マイ・ブロークン・マリコ']::text[], 123812)
returning id
)
insert into public.catalogue_growth_inserted (manga_id, batch) select id, 'cnlj-2026-10' from inserted;

with inserted as (
insert into public.mangas (title, author, publisher_fr, total_volumes, status, genres, demographic, synopsis, aliases, external_ids, curated, is_top_50_fr,
  audience_min_age, audience_age_source, audience_age_scope, audience_age_volumes, audience_age_ref, audience_age_year)
select 'Prophecy', 'Tetsuya Tsutsui', 'Ki-oon', 3, 'completed'::public.manga_status,
  array['mystere','psychologique','drame']::text[], 'seinen', 'Un justicier masqué annonce sur Internet des crimes qui se réalisent le lendemain, et la cyberpolice de Tokyo se lance à sa poursuite.', array['yokokuhan','予告犯']::text[], '{"mal_id":37109}'::jsonb, true, false,
  15, 'cnlj', 'series', null, 'https://cnlj.bnf.fr/sites/default/files/bibliographies/mangamania-2026.pdf', 2026
where not pg_temp.catalogue_has(array['Prophecy','yokokuhan','予告犯']::text[], 37109)
returning id
)
insert into public.catalogue_growth_inserted (manga_id, batch) select id, 'cnlj-2026-10' from inserted;

with inserted as (
insert into public.mangas (title, author, publisher_fr, total_volumes, status, genres, demographic, synopsis, aliases, external_ids, curated, is_top_50_fr,
  audience_min_age, audience_age_source, audience_age_scope, audience_age_volumes, audience_age_ref, audience_age_year)
select 'Coco : l''île magique', 'Keisuke Kotobuki', 'Ki-oon', 5, 'completed'::public.manga_status,
  array['fantasy','comedie','tranche-de-vie']::text[], 'kodomo', 'Sur une île où chacun pratique la magie, la petite Coco déborde de pouvoir mais déclenche une catastrophe à chaque sort.', array['coco l''ile magique','coco']::text[], '{}'::jsonb, true, false,
  6, 'cnlj', 'series', null, 'https://cnlj.bnf.fr/sites/default/files/cnlj-mangamania-2024.pdf', 2024
where not pg_temp.catalogue_has(array['Coco : l''île magique','coco l''ile magique','coco']::text[], null)
returning id
)
insert into public.catalogue_growth_inserted (manga_id, batch) select id, 'cnlj-2026-10' from inserted;

with inserted as (
insert into public.mangas (title, author, publisher_fr, total_volumes, status, genres, demographic, synopsis, aliases, external_ids, curated, is_top_50_fr,
  audience_min_age, audience_age_source, audience_age_scope, audience_age_volumes, audience_age_ref, audience_age_year)
select 'Les petits vélos', 'Keiko Koyama', 'Komikku', 10, 'completed'::public.manga_status,
  array['tranche-de-vie','comedie','sport']::text[], 'seinen', 'Véloutre tient un café-atelier de vélos et partage sa passion du cyclisme avec une bande d''animaux habitués de la boutique.', array['les petits velos','kawauso no jitenshaya-san','かわうその自転車屋さん']::text[], '{"mal_id":117737}'::jsonb, true, false,
  8, 'cnlj', 'series', null, 'https://cnlj.bnf.fr/sites/default/files/cnlj-mangamania-2024.pdf', 2024
where not pg_temp.catalogue_has(array['Les petits vélos','les petits velos','kawauso no jitenshaya-san','かわうその自転車屋さん']::text[], 117737)
returning id
)
insert into public.catalogue_growth_inserted (manga_id, batch) select id, 'cnlj-2026-10' from inserted;

with inserted as (
insert into public.mangas (title, author, publisher_fr, total_volumes, status, genres, demographic, synopsis, aliases, external_ids, curated, is_top_50_fr,
  audience_min_age, audience_age_source, audience_age_scope, audience_age_volumes, audience_age_ref, audience_age_year)
select 'Shiita et la forêt des minuscules', 'Yuki Kanba', 'Nobi Nobi !', 3, 'completed'::public.manga_status,
  array['aventure','fantasy']::text[], null, 'Shiita, minuscule habitant de la forêt, quitte son village pour retrouver son ami face à des insectes géants et aux humains.', array['kobito no sheeta to karigurashi no mori','kobito no shiita to karigurashi no mori','sheeta''s little big world','こびとのシイタと狩りぐらしの森']::text[], '{"mal_id":146097}'::jsonb, true, false,
  9, 'cnlj', 'series', null, 'https://cnlj.bnf.fr/sites/default/files/cnlj-mangamania-2024.pdf', 2024
where not pg_temp.catalogue_has(array['Shiita et la forêt des minuscules','kobito no sheeta to karigurashi no mori','kobito no shiita to karigurashi no mori','sheeta''s little big world','こびとのシイタと狩りぐらしの森']::text[], 146097)
returning id
)
insert into public.catalogue_growth_inserted (manga_id, batch) select id, 'cnlj-2026-10' from inserted;

with inserted as (
insert into public.mangas (title, author, publisher_fr, total_volumes, status, genres, demographic, synopsis, aliases, external_ids, curated, is_top_50_fr,
  audience_min_age, audience_age_source, audience_age_scope, audience_age_volumes, audience_age_ref, audience_age_year)
select 'Blizzard axel', 'Nakaba Suzuki', 'Nobi Nobi !', 6, 'completed'::public.manga_status,
  array['sport','comedie','drame']::text[], 'shonen', 'Benjamin oublié d''une famille de surdoués, Fubuki passe de la bagarre au collège au patinage artistique, qu''il découvre par hasard.', array['ブリザードアクセル']::text[], '{"mal_id":4101}'::jsonb, true, false,
  11, 'cnlj', 'series', null, 'https://cnlj.bnf.fr/sites/default/files/cnlj-mangamania-2024.pdf', 2024
where not pg_temp.catalogue_has(array['Blizzard axel','ブリザードアクセル']::text[], 4101)
returning id
)
insert into public.catalogue_growth_inserted (manga_id, batch) select id, 'cnlj-2026-10' from inserted;

with inserted as (
insert into public.mangas (title, author, publisher_fr, total_volumes, status, genres, demographic, synopsis, aliases, external_ids, curated, is_top_50_fr,
  audience_min_age, audience_age_source, audience_age_scope, audience_age_volumes, audience_age_ref, audience_age_year)
select 'Seven Deadly Sins', 'Nakaba Suzuki', 'Pika', 41, 'completed'::public.manga_status,
  array['action','aventure','fantasy','comedie']::text[], 'shonen', 'Une princesse en fuite part à la recherche de sept chevaliers bannis pour libérer son royaume, aidée par Meliodas, un garçon bien plus fort qu''il n''en a l''air.', array['nanatsu no taizai','the seven deadly sins','七つの大罪','7 deadly sins']::text[], '{"mal_id":44485}'::jsonb, true, false,
  11, 'cnlj', 'series', null, 'https://cnlj.bnf.fr/sites/default/files/cnlj-mangamania-2024.pdf', 2024
where not pg_temp.catalogue_has(array['Seven Deadly Sins','nanatsu no taizai','the seven deadly sins','七つの大罪','7 deadly sins']::text[], 44485)
returning id
)
insert into public.catalogue_growth_inserted (manga_id, batch) select id, 'cnlj-2026-10' from inserted;

with inserted as (
insert into public.mangas (title, author, publisher_fr, total_volumes, status, genres, demographic, synopsis, aliases, external_ids, curated, is_top_50_fr,
  audience_min_age, audience_age_source, audience_age_scope, audience_age_volumes, audience_age_ref, audience_age_year)
select '5 cm per second', 'Makoto Shinkai (scénario), Yukiko Seike (dessin)', 'Pika', 2, 'completed'::public.manga_status,
  array['romance','drame','tranche-de-vie']::text[], null, 'Takaki et Akari, deux amis d''enfance séparés par un déménagement, tentent de garder le lien au fil des années malgré la distance qui grandit.', array['5 centimeters per second','byousoku 5 centimeter','byōsoku 5 centimeter','秒速5センチメートル','5cm per second']::text[], '{"mal_id":23419}'::jsonb, true, false,
  12, 'cnlj', 'series', null, 'https://cnlj.bnf.fr/sites/default/files/cnlj-mangamania-2024.pdf', 2024
where not pg_temp.catalogue_has(array['5 cm per second','5 centimeters per second','byousoku 5 centimeter','byōsoku 5 centimeter','秒速5センチメートル','5cm per second']::text[], 23419)
returning id
)
insert into public.catalogue_growth_inserted (manga_id, batch) select id, 'cnlj-2026-10' from inserted;

with inserted as (
insert into public.mangas (title, author, publisher_fr, total_volumes, status, genres, demographic, synopsis, aliases, external_ids, curated, is_top_50_fr,
  audience_min_age, audience_age_source, audience_age_scope, audience_age_volumes, audience_age_ref, audience_age_year)
select 'Le jour où j''ai décidé d''envahir la Terre', 'Maiko Ogawa', 'Ototo', 15, 'completed'::public.manga_status,
  array['science-fiction','romance','drame']::text[], 'shonen', 'Le jour de sa rentrée au lycée, Koichi rencontre Nozomi, une extraterrestre chargée de préparer l''invasion de la Terre qui affirme lui avoir sauvé la vie.', array['le jour ou j''ai decide d''envahir la terre','hitoribocchi no chikyuu shinryaku','hitoribocchi no chikyū shinryaku','invading the world all alone','lonely alien','ひとりぼっちの地球侵略']::text[], '{"mal_id":35551}'::jsonb, true, false,
  12, 'cnlj', 'series', null, 'https://cnlj.bnf.fr/sites/default/files/cnlj-mangamania-2024.pdf', 2024
where not pg_temp.catalogue_has(array['Le jour où j''ai décidé d''envahir la Terre','le jour ou j''ai decide d''envahir la terre','hitoribocchi no chikyuu shinryaku','hitoribocchi no chikyū shinryaku','invading the world all alone','lonely alien','ひとりぼっちの地球侵略']::text[], 35551)
returning id
)
insert into public.catalogue_growth_inserted (manga_id, batch) select id, 'cnlj-2026-10' from inserted;

with inserted as (
insert into public.mangas (title, author, publisher_fr, total_volumes, status, genres, demographic, synopsis, aliases, external_ids, curated, is_top_50_fr,
  audience_min_age, audience_age_source, audience_age_scope, audience_age_volumes, audience_age_ref, audience_age_year)
select 'Le petit monde de Machida', 'Yuki Andō', 'Akata', 7, 'completed'::public.manga_status,
  array['tranche-de-vie','comedie','romance']::text[], 'shojo', 'Hajime Machida, lycéen persuadé de n''avoir aucun talent, rend la vie plus douce à tout son entourage par une foule de petites attentions.', array['machida-kun no sekai','machida kun no sekai','the world of machida-kun','町田くんの世界']::text[], '{"mal_id":58141}'::jsonb, true, false,
  12, 'cnlj', 'series', null, 'https://cnlj.bnf.fr/sites/default/files/cnlj-mangamania-2024.pdf', 2024
where not pg_temp.catalogue_has(array['Le petit monde de Machida','machida-kun no sekai','machida kun no sekai','the world of machida-kun','町田くんの世界']::text[], 58141)
returning id
)
insert into public.catalogue_growth_inserted (manga_id, batch) select id, 'cnlj-2026-10' from inserted;

with inserted as (
insert into public.mangas (title, author, publisher_fr, total_volumes, status, genres, demographic, synopsis, aliases, external_ids, curated, is_top_50_fr,
  audience_min_age, audience_age_source, audience_age_scope, audience_age_volumes, audience_age_ref, audience_age_year)
select 'Time Paradox Ghostwriter', 'Kenji Ichima (scénario), Tsunehiro Date (dessin)', 'Crunchyroll', 2, 'completed'::public.manga_status,
  array['comedie','science-fiction','drame']::text[], 'shonen', 'Teppei, jeune mangaka en galère, découvre dans son micro-ondes un numéro du Jump venu du futur et se retrouve tenté de copier une série pas encore créée.', array['time paradox ghost writer','タイムパラドクスゴーストライター']::text[], '{"mal_id":126782}'::jsonb, true, false,
  12, 'cnlj', 'series', null, 'https://cnlj.bnf.fr/sites/default/files/cnlj-mangamania-2024.pdf', 2024
where not pg_temp.catalogue_has(array['Time Paradox Ghostwriter','time paradox ghost writer','タイムパラドクスゴーストライター']::text[], 126782)
returning id
)
insert into public.catalogue_growth_inserted (manga_id, batch) select id, 'cnlj-2026-10' from inserted;

with inserted as (
insert into public.mangas (title, author, publisher_fr, total_volumes, status, genres, demographic, synopsis, aliases, external_ids, curated, is_top_50_fr,
  audience_min_age, audience_age_source, audience_age_scope, audience_age_volumes, audience_age_ref, audience_age_year)
select 'To Your Eternity', 'Yoshitoki Ōima', 'Pika', 25, 'completed'::public.manga_status,
  array['fantasy','aventure','drame','surnaturel']::text[], 'shonen', 'Un être immortel venu d''ailleurs prend la forme de ceux qu''il croise et apprend peu à peu ce que signifie vivre, aimer et perdre.', array['fumetsu no anata e','fumetsu no anata he','不滅のあなたへ']::text[], '{"mal_id":102343}'::jsonb, true, false,
  12, 'cnlj', 'series', null, 'https://cnlj.bnf.fr/sites/default/files/cnlj-mangamania-2024.pdf', 2024
where not pg_temp.catalogue_has(array['To Your Eternity','fumetsu no anata e','fumetsu no anata he','不滅のあなたへ']::text[], 102343)
returning id
)
insert into public.catalogue_growth_inserted (manga_id, batch) select id, 'cnlj-2026-10' from inserted;

with inserted as (
insert into public.mangas (title, author, publisher_fr, total_volumes, status, genres, demographic, synopsis, aliases, external_ids, curated, is_top_50_fr,
  audience_min_age, audience_age_source, audience_age_scope, audience_age_volumes, audience_age_ref, audience_age_year)
select 'Le cœur et le devoir', 'Himawari Nishino (scénario), Aya Tanaka (dessin)', 'Bamboo (Doki-Doki)', 2, 'completed'::public.manga_status,
  array['romance','drame','fantasy']::text[], 'seinen', 'Berta, princesse envoyée au roi du Nord comme seconde épouse pour lui donner un héritier, doit naviguer entre intrigues de cour et sentiments naissants.', array['le coeur et le devoir','ukkari heika no ko wo ninshin shiteshimaimashita: ouhi berta no shouzou','ouhi berta no shouzou','i got pregnant with his majesty''s child: a biography of queen berta','portrait of queen berta','biography of queen berta']::text[], '{"mal_id":131227}'::jsonb, true, false,
  13, 'cnlj', 'series', null, 'https://cnlj.bnf.fr/sites/default/files/cnlj-mangamania-2024.pdf', 2024
where not pg_temp.catalogue_has(array['Le cœur et le devoir','le coeur et le devoir','ukkari heika no ko wo ninshin shiteshimaimashita: ouhi berta no shouzou','ouhi berta no shouzou','i got pregnant with his majesty''s child: a biography of queen berta','portrait of queen berta','biography of queen berta']::text[], 131227)
returning id
)
insert into public.catalogue_growth_inserted (manga_id, batch) select id, 'cnlj-2026-10' from inserted;

with inserted as (
insert into public.mangas (title, author, publisher_fr, total_volumes, status, genres, demographic, synopsis, aliases, external_ids, curated, is_top_50_fr,
  audience_min_age, audience_age_source, audience_age_scope, audience_age_volumes, audience_age_ref, audience_age_year)
select 'Echoes', 'Kei Sanbe', 'Ki-oon', 11, 'completed'::public.manga_status,
  array['mystere','psychologique','drame','surnaturel']::text[], 'seinen', 'Treize ans après le massacre de sa famille, un lycéen solitaire traque le meurtrier en suivant une piste que lui seul peut percevoir.', array['yume de mita ano ko no tame ni','for the kid i saw in my dreams','夢で見たあの子のために']::text[], '{"mal_id":108446}'::jsonb, true, false,
  13, 'cnlj', 'series', null, 'https://cnlj.bnf.fr/sites/default/files/cnlj-mangamania-2024.pdf', 2024
where not pg_temp.catalogue_has(array['Echoes','yume de mita ano ko no tame ni','for the kid i saw in my dreams','夢で見たあの子のために']::text[], 108446)
returning id
)
insert into public.catalogue_growth_inserted (manga_id, batch) select id, 'cnlj-2026-10' from inserted;

with inserted as (
insert into public.mangas (title, author, publisher_fr, total_volumes, status, genres, demographic, synopsis, aliases, external_ids, curated, is_top_50_fr,
  audience_min_age, audience_age_source, audience_age_scope, audience_age_volumes, audience_age_ref, audience_age_year)
select 'Heaven''s design team', 'Hebi-zou, Tsuta Suzuki (scénario), Tarako (dessin)', 'Pika', 8, 'ongoing'::public.manga_status,
  array['comedie','fantasy','tranche-de-vie']::text[], 'seinen', 'Au service d''un Dieu aux commandes farfelues, une équipe de designers invente des animaux et doit les rendre capables de vivre sur Terre.', array['tenchi sozo design-bu','tenchi souzou design-bu','天地創造デザイン部']::text[], '{"mal_id":111086}'::jsonb, true, false,
  13, 'cnlj', 'series', null, 'https://cnlj.bnf.fr/sites/default/files/cnlj-mangamania-2024.pdf', 2024
where not pg_temp.catalogue_has(array['Heaven''s design team','tenchi sozo design-bu','tenchi souzou design-bu','天地創造デザイン部']::text[], 111086)
returning id
)
insert into public.catalogue_growth_inserted (manga_id, batch) select id, 'cnlj-2026-10' from inserted;

with inserted as (
insert into public.mangas (title, author, publisher_fr, total_volumes, status, genres, demographic, synopsis, aliases, external_ids, curated, is_top_50_fr,
  audience_min_age, audience_age_source, audience_age_scope, audience_age_volumes, audience_age_ref, audience_age_year)
select 'L-DK', 'Ayu Watanabe', 'Pika', 24, 'completed'::public.manga_status,
  array['romance','comedie','tranche-de-vie']::text[], 'shojo', 'Une lycéenne se retrouve à partager son appartement avec le garçon le plus populaire du lycée, bien plus taquin qu''il n''y paraît.', array['l♥dk','ldk']::text[], '{"mal_id":16794}'::jsonb, true, false,
  13, 'cnlj', 'series', null, 'https://cnlj.bnf.fr/sites/default/files/cnlj-mangamania-2024.pdf', 2024
where not pg_temp.catalogue_has(array['L-DK','l♥dk','ldk']::text[], 16794)
returning id
)
insert into public.catalogue_growth_inserted (manga_id, batch) select id, 'cnlj-2026-10' from inserted;

with inserted as (
insert into public.mangas (title, author, publisher_fr, total_volumes, status, genres, demographic, synopsis, aliases, external_ids, curated, is_top_50_fr,
  audience_min_age, audience_age_source, audience_age_scope, audience_age_volumes, audience_age_ref, audience_age_year)
select 'Le pacte de la mer', 'Satoshi Kon', 'Pika', 1, 'completed'::public.manga_status,
  array['fantasy','drame','mystere']::text[], 'seinen', 'Dans une paisible ville côtière, un projet immobilier menace l''ancienne promesse qui lie les habitants à une divinité de la mer.', array['kaikisen','海帰線']::text[], '{"mal_id":5427}'::jsonb, true, false,
  13, 'cnlj', 'series', null, 'https://cnlj.bnf.fr/sites/default/files/cnlj-mangamania-2024.pdf', 2024
where not pg_temp.catalogue_has(array['Le pacte de la mer','kaikisen','海帰線']::text[], 5427)
returning id
)
insert into public.catalogue_growth_inserted (manga_id, batch) select id, 'cnlj-2026-10' from inserted;

with inserted as (
insert into public.mangas (title, author, publisher_fr, total_volumes, status, genres, demographic, synopsis, aliases, external_ids, curated, is_top_50_fr,
  audience_min_age, audience_age_source, audience_age_scope, audience_age_volumes, audience_age_ref, audience_age_year)
select 'Rainbow Edition triple', 'George Abe (scénario), Masasumi Kakizaki (dessin)', 'Crunchyroll (ex-Kazé Manga)', 7, 'completed'::public.manga_status,
  array['drame','historique','psychologique']::text[], 'seinen', 'Dans le Japon d''après-guerre, sept adolescents enfermés en maison de redressement se serrent les coudes pour survivre et garder espoir.', array['rainbow','rainbow: nisha rokubo no shichinin','rainbow: nisha rokubou no shichinin','rainbow - les sept de la cellule 6 bloc 2']::text[], '{"mal_id":7482}'::jsonb, true, false,
  13, 'cnlj', 'series', null, 'https://cnlj.bnf.fr/sites/default/files/cnlj-mangamania-2024.pdf', 2024
where not pg_temp.catalogue_has(array['Rainbow Edition triple','rainbow','rainbow: nisha rokubo no shichinin','rainbow: nisha rokubou no shichinin','rainbow - les sept de la cellule 6 bloc 2']::text[], 7482)
returning id
)
insert into public.catalogue_growth_inserted (manga_id, batch) select id, 'cnlj-2026-10' from inserted;

with inserted as (
insert into public.mangas (title, author, publisher_fr, total_volumes, status, genres, demographic, synopsis, aliases, external_ids, curated, is_top_50_fr,
  audience_min_age, audience_age_source, audience_age_scope, audience_age_volumes, audience_age_ref, audience_age_year)
select 'Stop !! Hibari-kun !', 'Hisashi Eguchi', 'Le Lézard Noir', 3, 'completed'::public.manga_status,
  array['comedie','romance']::text[], 'shonen', 'Hébergé chez un chef yakuza à Tokyo, un lycéen orphelin découvre que le fils de la maison vit et s''habille en fille, au lycée comme ailleurs.', array['stop!! hibari-kun!','stop hibari-kun','ストップ!! ひばりくん!']::text[], '{"mal_id":40981}'::jsonb, true, false,
  13, 'cnlj', 'series', null, 'https://cnlj.bnf.fr/sites/default/files/cnlj-mangamania-2024.pdf', 2024
where not pg_temp.catalogue_has(array['Stop !! Hibari-kun !','stop!! hibari-kun!','stop hibari-kun','ストップ!! ひばりくん!']::text[], 40981)
returning id
)
insert into public.catalogue_growth_inserted (manga_id, batch) select id, 'cnlj-2026-10' from inserted;

with inserted as (
insert into public.mangas (title, author, publisher_fr, total_volumes, status, genres, demographic, synopsis, aliases, external_ids, curated, is_top_50_fr,
  audience_min_age, audience_age_source, audience_age_scope, audience_age_volumes, audience_age_ref, audience_age_year)
select 'Roji !', 'Keisuke Kotobuki', 'Ki-oon', 11, 'completed'::public.manga_status,
  array['fantasy','tranche-de-vie','comedie']::text[], 'kodomo', 'Yuzu et ses amis découvrent que les ruelles de leur quartier abritent tout un petit peuple magique.', array['roji!','roji']::text[], '{}'::jsonb, true, false,
  6, 'cnlj', 'series', null, 'https://cnlj.bnf.fr/sites/default/files/cnlj-mangamania-2022.pdf', 2022
where not pg_temp.catalogue_has(array['Roji !','roji!','roji']::text[], null)
returning id
)
insert into public.catalogue_growth_inserted (manga_id, batch) select id, 'cnlj-2026-10' from inserted;

with inserted as (
insert into public.mangas (title, author, publisher_fr, total_volumes, status, genres, demographic, synopsis, aliases, external_ids, curated, is_top_50_fr,
  audience_min_age, audience_age_source, audience_age_scope, audience_age_volumes, audience_age_ref, audience_age_year)
select 'Barakamon', 'Satsuki Yoshino', 'Ki-oon', 19, 'completed'::public.manga_status,
  array['tranche-de-vie','comedie']::text[], 'shonen', 'Exilé sur une petite île après un coup de colère, un jeune calligraphe citadin retrouve l''envie de créer au contact des enfants du village.', array['ばらかもん']::text[], '{"mal_id":17051}'::jsonb, true, false,
  9, 'cnlj', 'series', null, 'https://cnlj.bnf.fr/sites/default/files/cnlj-mangamania-2022.pdf', 2022
where not pg_temp.catalogue_has(array['Barakamon','ばらかもん']::text[], 17051)
returning id
)
insert into public.catalogue_growth_inserted (manga_id, batch) select id, 'cnlj-2026-10' from inserted;

with inserted as (
insert into public.mangas (title, author, publisher_fr, total_volumes, status, genres, demographic, synopsis, aliases, external_ids, curated, is_top_50_fr,
  audience_min_age, audience_age_source, audience_age_scope, audience_age_volumes, audience_age_ref, audience_age_year)
select 'Appare Ranman !', 'Masakazu Hashimoto, Ahndongshik', 'Doki-Doki', 3, 'completed'::public.manga_status,
  array['aventure','action','comedie','historique']::text[], 'seinen', 'À la fin du XIXe siècle, un ingénieur japonais excentrique et un samouraï timide se lancent dans une course automobile à travers l''Amérique.', array['appare-ranman!','appare ranman','appare-ranman']::text[], '{"mal_id":125843}'::jsonb, true, false,
  11, 'cnlj', 'series', null, 'https://cnlj.bnf.fr/sites/default/files/cnlj-mangamania-2022.pdf', 2022
where not pg_temp.catalogue_has(array['Appare Ranman !','appare-ranman!','appare ranman','appare-ranman']::text[], 125843)
returning id
)
insert into public.catalogue_growth_inserted (manga_id, batch) select id, 'cnlj-2026-10' from inserted;

with inserted as (
insert into public.mangas (title, author, publisher_fr, total_volumes, status, genres, demographic, synopsis, aliases, external_ids, curated, is_top_50_fr,
  audience_min_age, audience_age_source, audience_age_scope, audience_age_volumes, audience_age_ref, audience_age_year)
select 'Au grand air', 'Afro', 'nobi nobi !', 14, 'ongoing'::public.manga_status,
  array['tranche-de-vie','comedie']::text[], 'seinen', 'Une lycéenne qui aime camper seule en hiver rencontre une camarade enthousiaste, et les sorties en pleine nature au pied du mont Fuji s''enchaînent.', array['yuru camp','yuru camp△','laid-back camp','ゆるキャン△']::text[], '{"mal_id":94376}'::jsonb, true, false,
  11, 'cnlj', 'series', null, 'https://cnlj.bnf.fr/sites/default/files/cnlj-mangamania-2022.pdf', 2022
where not pg_temp.catalogue_has(array['Au grand air','yuru camp','yuru camp△','laid-back camp','ゆるキャン△']::text[], 94376)
returning id
)
insert into public.catalogue_growth_inserted (manga_id, batch) select id, 'cnlj-2026-10' from inserted;

with inserted as (
insert into public.mangas (title, author, publisher_fr, total_volumes, status, genres, demographic, synopsis, aliases, external_ids, curated, is_top_50_fr,
  audience_min_age, audience_age_source, audience_age_scope, audience_age_volumes, audience_age_ref, audience_age_year)
select 'Frankenstein family', 'Yanai', 'Chattochatto', 2, 'completed'::public.manga_status,
  array['comedie','tranche-de-vie','science-fiction']::text[], null, 'Après l''arrestation de leurs parents, des savants fous qui les ont modifiés, cinq frères et sœurs hors normes tentent de passer inaperçus, menés par le cadet surdoué.', array['shiyan pin jiating','實驗品家庭','creatures family days','jikkenhin kazoku']::text[], '{"mal_id":109701}'::jsonb, true, false,
  11, 'cnlj', 'series', null, 'https://cnlj.bnf.fr/sites/default/files/cnlj-mangamania-2022.pdf', 2022
where not pg_temp.catalogue_has(array['Frankenstein family','shiyan pin jiating','實驗品家庭','creatures family days','jikkenhin kazoku']::text[], 109701)
returning id
)
insert into public.catalogue_growth_inserted (manga_id, batch) select id, 'cnlj-2026-10' from inserted;

with inserted as (
insert into public.mangas (title, author, publisher_fr, total_volumes, status, genres, demographic, synopsis, aliases, external_ids, curated, is_top_50_fr,
  audience_min_age, audience_age_source, audience_age_scope, audience_age_volumes, audience_age_ref, audience_age_year)
select 'Ken''en comme chien et singe', 'Fūetsu Dō, Hitoshi Ichimura', 'Doki-Doki', 8, 'completed'::public.manga_status,
  array['fantasy','aventure','comedie']::text[], 'seinen', 'Rejeté par les villageois, un garçon mi-humain mi-singe démon croise la route d''un chasseur de démons capable de se changer en chien.', array['ken''en','kenen','kenen.','けんえん。','comme chien et singe']::text[], '{"mal_id":106466}'::jsonb, true, false,
  11, 'cnlj', 'series', null, 'https://cnlj.bnf.fr/sites/default/files/cnlj-mangamania-2022.pdf', 2022
where not pg_temp.catalogue_has(array['Ken''en comme chien et singe','ken''en','kenen','kenen.','けんえん。','comme chien et singe']::text[], 106466)
returning id
)
insert into public.catalogue_growth_inserted (manga_id, batch) select id, 'cnlj-2026-10' from inserted;

with inserted as (
insert into public.mangas (title, author, publisher_fr, total_volumes, status, genres, demographic, synopsis, aliases, external_ids, curated, is_top_50_fr,
  audience_min_age, audience_age_source, audience_age_scope, audience_age_volumes, audience_age_ref, audience_age_year)
select 'Bloom into you', 'Nio Nakatani', 'Kana', 8, 'completed'::public.manga_status,
  array['romance','drame','tranche-de-vie']::text[], 'shonen', 'Une lycéenne qui ne ressent rien face aux déclarations d''amour se rapproche d''une camarade brillante qui, elle, tombe amoureuse d''elle.', array['yagate kimi ni naru','やがて君になる']::text[], '{"mal_id":88660}'::jsonb, true, false,
  12, 'cnlj', 'series', null, 'https://cnlj.bnf.fr/sites/default/files/cnlj-mangamania-2022.pdf', 2022
where not pg_temp.catalogue_has(array['Bloom into you','yagate kimi ni naru','やがて君になる']::text[], 88660)
returning id
)
insert into public.catalogue_growth_inserted (manga_id, batch) select id, 'cnlj-2026-10' from inserted;

with inserted as (
insert into public.mangas (title, author, publisher_fr, total_volumes, status, genres, demographic, synopsis, aliases, external_ids, curated, is_top_50_fr,
  audience_min_age, audience_age_source, audience_age_scope, audience_age_volumes, audience_age_ref, audience_age_year)
select 'En attendant lundi', 'Tomomi Abe', 'Akata', 2, 'completed'::public.manga_status,
  array['tranche-de-vie','drame','fantasy']::text[], 'seinen', 'À l''entrée au collège, une fille pressée de grandir se lie à un camarade mystérieux qui lui donne rendez-vous chaque lundi soir.', array['getsuyoubi no tomodachi','getsuyōbi no tomodachi','月曜日の友達','monday''s friends']::text[], '{"mal_id":110548}'::jsonb, true, false,
  12, 'cnlj', 'series', null, 'https://cnlj.bnf.fr/sites/default/files/cnlj-mangamania-2022.pdf', 2022
where not pg_temp.catalogue_has(array['En attendant lundi','getsuyoubi no tomodachi','getsuyōbi no tomodachi','月曜日の友達','monday''s friends']::text[], 110548)
returning id
)
insert into public.catalogue_growth_inserted (manga_id, batch) select id, 'cnlj-2026-10' from inserted;

with inserted as (
insert into public.mangas (title, author, publisher_fr, total_volumes, status, genres, demographic, synopsis, aliases, external_ids, curated, is_top_50_fr,
  audience_min_age, audience_age_source, audience_age_scope, audience_age_volumes, audience_age_ref, audience_age_year)
select 'Mon coloc'' d''enfer', 'Keiko Iwashita', 'Pika', 11, 'completed'::public.manga_status,
  array['romance','tranche-de-vie','comedie']::text[], 'shojo', 'Installée dans la maison partagée de son oncle, la lycéenne Miko cohabite avec Jun, un colocataire bourru plus attentionné qu''il n''y paraît.', array['mon coloc d''enfer','living no matsunaga-san','living-room matsunaga-san','リビングの松永さん']::text[], '{"mal_id":103856}'::jsonb, true, false,
  12, 'cnlj', 'series', null, 'https://cnlj.bnf.fr/sites/default/files/cnlj-mangamania-2022.pdf', 2022
where not pg_temp.catalogue_has(array['Mon coloc'' d''enfer','mon coloc d''enfer','living no matsunaga-san','living-room matsunaga-san','リビングの松永さん']::text[], 103856)
returning id
)
insert into public.catalogue_growth_inserted (manga_id, batch) select id, 'cnlj-2026-10' from inserted;

with inserted as (
insert into public.mangas (title, author, publisher_fr, total_volumes, status, genres, demographic, synopsis, aliases, external_ids, curated, is_top_50_fr,
  audience_min_age, audience_age_source, audience_age_scope, audience_age_volumes, audience_age_ref, audience_age_year)
select 'Une touche de bleu', 'Nozomi Suzuki', 'Glénat', 7, 'completed'::public.manga_status,
  array['romance','drame','tranche-de-vie']::text[], 'seinen', 'Ruriko, lycéenne marquée d''une tache bleue au visage, se lie à un professeur incapable de reconnaître les visages, sauf le sien.', array['ao ni, fureru.','ao ni fureru','seeing blue','青に、ふれる。']::text[], '{"mal_id":117422}'::jsonb, true, false,
  12, 'cnlj', 'series', null, 'https://cnlj.bnf.fr/sites/default/files/cnlj-mangamania-2022.pdf', 2022
where not pg_temp.catalogue_has(array['Une touche de bleu','ao ni, fureru.','ao ni fureru','seeing blue','青に、ふれる。']::text[], 117422)
returning id
)
insert into public.catalogue_growth_inserted (manga_id, batch) select id, 'cnlj-2026-10' from inserted;

with inserted as (
insert into public.mangas (title, author, publisher_fr, total_volumes, status, genres, demographic, synopsis, aliases, external_ids, curated, is_top_50_fr,
  audience_min_age, audience_age_source, audience_age_scope, audience_age_volumes, audience_age_ref, audience_age_year)
select 'Elin, la charmeuse de bêtes', 'Nahoko Uehashi (scénario), Itoe Takemoto (dessin)', 'Pika', 11, 'completed'::public.manga_status,
  array['fantasy','aventure','drame']::text[], 'shonen', 'Fille d''une soigneuse de bêtes, Elin grandit avec un don rare pour comprendre les animaux, dans un royaume qui se méfie de ce talent.', array['elin la charmeuse de betes','kemono no souja erin','kemono no souja','the beast player','獣の奏者']::text[], '{"mal_id":18371}'::jsonb, true, false,
  13, 'cnlj', 'series', null, 'https://cnlj.bnf.fr/sites/default/files/cnlj-mangamania-2022.pdf', 2022
where not pg_temp.catalogue_has(array['Elin, la charmeuse de bêtes','elin la charmeuse de betes','kemono no souja erin','kemono no souja','the beast player','獣の奏者']::text[], 18371)
returning id
)
insert into public.catalogue_growth_inserted (manga_id, batch) select id, 'cnlj-2026-10' from inserted;

with inserted as (
insert into public.mangas (title, author, publisher_fr, total_volumes, status, genres, demographic, synopsis, aliases, external_ids, curated, is_top_50_fr,
  audience_min_age, audience_age_source, audience_age_scope, audience_age_volumes, audience_age_ref, audience_age_year)
select 'Hitman : les coulisses du manga', 'Kōji Seo', 'Pika', 13, 'completed'::public.manga_status,
  array['comedie','romance','tranche-de-vie']::text[], 'shonen', 'Jeune éditeur au Weekly Shônen Magazine, Ryûnosuke mise tout sur Tsubasa, une autrice débutante, pour percer dans le monde exigeant du manga.', array['hitman les coulisses du manga','hitman','ヒットマン']::text[], '{"mal_id":114825}'::jsonb, true, false,
  13, 'cnlj', 'series', null, 'https://cnlj.bnf.fr/sites/default/files/cnlj-mangamania-2022.pdf', 2022
where not pg_temp.catalogue_has(array['Hitman : les coulisses du manga','hitman les coulisses du manga','hitman','ヒットマン']::text[], 114825)
returning id
)
insert into public.catalogue_growth_inserted (manga_id, batch) select id, 'cnlj-2026-10' from inserted;

with inserted as (
insert into public.mangas (title, author, publisher_fr, total_volumes, status, genres, demographic, synopsis, aliases, external_ids, curated, is_top_50_fr,
  audience_min_age, audience_age_source, audience_age_scope, audience_age_volumes, audience_age_ref, audience_age_year)
select 'Kasane : la voleuse de visage', 'Daruma Matsuura', 'Ki-oon', 14, 'completed'::public.manga_status,
  array['psychologique','surnaturel','drame']::text[], 'seinen', 'Moquée pour sa laideur, Kasane découvre qu''un rouge à lèvres hérité de sa mère lui permet d''emprunter le visage des autres pour briller sur scène.', array['kasane la voleuse de visage','kasane','累']::text[], '{"mal_id":55377}'::jsonb, true, false,
  13, 'cnlj', 'series', null, 'https://cnlj.bnf.fr/sites/default/files/cnlj-mangamania-2022.pdf', 2022
where not pg_temp.catalogue_has(array['Kasane : la voleuse de visage','kasane la voleuse de visage','kasane','累']::text[], 55377)
returning id
)
insert into public.catalogue_growth_inserted (manga_id, batch) select id, 'cnlj-2026-10' from inserted;

with inserted as (
insert into public.mangas (title, author, publisher_fr, total_volumes, status, genres, demographic, synopsis, aliases, external_ids, curated, is_top_50_fr,
  audience_min_age, audience_age_source, audience_age_scope, audience_age_volumes, audience_age_ref, audience_age_year)
select 'Le Mari de mon frère', 'Gengoroh Tagame', 'Akata', 4, 'completed'::public.manga_status,
  array['drame','tranche-de-vie']::text[], 'seinen', 'Père célibataire, Yaichi voit arriver Mike, le mari canadien de son défunt jumeau, et apprend avec sa fille Kana à lui faire une place.', array['le mari de mon frere','otouto no otto','my brother''s husband','弟の夫']::text[], '{"mal_id":80375}'::jsonb, true, false,
  13, 'cnlj', 'series', null, 'https://cnlj.bnf.fr/sites/default/files/cnlj-mangamania-2022.pdf', 2022
where not pg_temp.catalogue_has(array['Le Mari de mon frère','le mari de mon frere','otouto no otto','my brother''s husband','弟の夫']::text[], 80375)
returning id
)
insert into public.catalogue_growth_inserted (manga_id, batch) select id, 'cnlj-2026-10' from inserted;

with inserted as (
insert into public.mangas (title, author, publisher_fr, total_volumes, status, genres, demographic, synopsis, aliases, external_ids, curated, is_top_50_fr,
  audience_min_age, audience_age_source, audience_age_scope, audience_age_volumes, audience_age_ref, audience_age_year)
select 'ReLIFE', 'Yayoiso', 'Ki-oon', 15, 'completed'::public.manga_status,
  array['tranche-de-vie','comedie','romance','drame']::text[], 'seinen', 'À 27 ans et sans emploi, Arata accepte une expérience étrange : une pilule le rajeunit pour revivre une année entière au lycée.', array['re life','リライフ']::text[], '{"mal_id":78523}'::jsonb, true, false,
  13, 'cnlj', 'series', null, 'https://cnlj.bnf.fr/sites/default/files/cnlj-mangamania-2022.pdf', 2022
where not pg_temp.catalogue_has(array['ReLIFE','re life','リライフ']::text[], 78523)
returning id
)
insert into public.catalogue_growth_inserted (manga_id, batch) select id, 'cnlj-2026-10' from inserted;

with inserted as (
insert into public.mangas (title, author, publisher_fr, total_volumes, status, genres, demographic, synopsis, aliases, external_ids, curated, is_top_50_fr,
  audience_min_age, audience_age_source, audience_age_scope, audience_age_volumes, audience_age_ref, audience_age_year)
select 'Anonyme !', 'Chikara Kimizuka (scénario), Yen Hioka (dessin)', 'Soleil', 4, 'completed'::public.manga_status,
  array['drame','psychologique']::text[], 'seinen', 'Après trois ans en centre pour mineurs pour le meurtre de son professeur, Takashi tente de reprendre une vie normale sous le regard des autres.', array['anonyme','boku no namae wa "shounen a"','boku no namae wa shounen a','my name is "boy a"','僕の名前は｢少年a｣']::text[], '{"mal_id":110619}'::jsonb, true, false,
  14, 'cnlj', 'series', null, 'https://cnlj.bnf.fr/sites/default/files/cnlj-mangamania-2022.pdf', 2022
where not pg_temp.catalogue_has(array['Anonyme !','anonyme','boku no namae wa "shounen a"','boku no namae wa shounen a','my name is "boy a"','僕の名前は｢少年a｣']::text[], 110619)
returning id
)
insert into public.catalogue_growth_inserted (manga_id, batch) select id, 'cnlj-2026-10' from inserted;

with inserted as (
insert into public.mangas (title, author, publisher_fr, total_volumes, status, genres, demographic, synopsis, aliases, external_ids, curated, is_top_50_fr,
  audience_min_age, audience_age_source, audience_age_scope, audience_age_volumes, audience_age_ref, audience_age_year)
select 'Poison city', 'Tetsuya Tsutsui', 'Ki-oon', 2, 'completed'::public.manga_status,
  array['drame','psychologique']::text[], 'seinen', 'À l''approche des Jeux olympiques de Tokyo, un jeune mangaka voit son récit d''horreur menacé par une loi qui traque les œuvres jugées nuisibles.', array['yuugai toshi','有害都市','harmful city']::text[], '{"mal_id":81429}'::jsonb, true, false,
  15, 'cnlj', 'series', null, 'https://cnlj.bnf.fr/sites/default/files/cnlj-mangamania-2022.pdf', 2022
where not pg_temp.catalogue_has(array['Poison city','yuugai toshi','有害都市','harmful city']::text[], 81429)
returning id
)
insert into public.catalogue_growth_inserted (manga_id, batch) select id, 'cnlj-2026-10' from inserted;

with inserted as (
insert into public.mangas (title, author, publisher_fr, total_volumes, status, genres, demographic, synopsis, aliases, external_ids, curated, is_top_50_fr,
  audience_min_age, audience_age_source, audience_age_scope, audience_age_volumes, audience_age_ref, audience_age_year)
select 'Trouble is my business', 'Natsuo Sekikawa (scénario), Jirô Taniguchi (dessin)', 'Kana', 6, 'completed'::public.manga_status,
  array['mystere','action','comedie']::text[], 'seinen', 'Un détective privé fauché et désabusé enchaîne les affaires louches dans les bas-fonds d''un Tokyo poisseux, entre coups durs et humour noir.', array['jikenya kagyou','jiken-ya kagyou','事件屋稼業']::text[], '{"mal_id":81957}'::jsonb, true, false,
  15, 'cnlj', 'series', null, 'https://cnlj.bnf.fr/sites/default/files/cnlj-mangamania-2022.pdf', 2022
where not pg_temp.catalogue_has(array['Trouble is my business','jikenya kagyou','jiken-ya kagyou','事件屋稼業']::text[], 81957)
returning id
)
insert into public.catalogue_growth_inserted (manga_id, batch) select id, 'cnlj-2026-10' from inserted;

with inserted as (
insert into public.mangas (title, author, publisher_fr, total_volumes, status, genres, demographic, synopsis, aliases, external_ids, curated, is_top_50_fr,
  audience_min_age, audience_age_source, audience_age_scope, audience_age_volumes, audience_age_ref, audience_age_year)
select 'Maux mêlés', 'Meguru Izawa (scénario), Tohru Tagura (dessin)', 'Akata', 2, 'completed'::public.manga_status,
  array['romance','tranche-de-vie','drame']::text[], 'shojo', 'Mal à l''aise au contact des garçons, Ayase voit deux lycéens s''installer comme pensionnaires dans l''auberge familiale où elle vit.', array['maux meles','koji koi','こじ恋']::text[], '{"mal_id":110361}'::jsonb, true, false,
  13, 'cnlj', 'volume', array[1,2]::integer[], 'https://cnlj.bnf.fr/sites/default/files/file_media/flash-2022-2023.pdf', 2022
where not pg_temp.catalogue_has(array['Maux mêlés','maux meles','koji koi','こじ恋']::text[], 110361)
returning id
)
insert into public.catalogue_growth_inserted (manga_id, batch) select id, 'cnlj-2026-10' from inserted;

with inserted as (
insert into public.mangas (title, author, publisher_fr, total_volumes, status, genres, demographic, synopsis, aliases, external_ids, curated, is_top_50_fr,
  audience_min_age, audience_age_source, audience_age_scope, audience_age_volumes, audience_age_ref, audience_age_year)
select 'Gourmet détective', 'Akiko Higashimura', 'Delcourt-Tonkam', null, 'paused'::public.manga_status,
  array['mystere','cuisine','comedie']::text[], 'josei', 'Fin gourmet aux manières flegmatiques, le détective privé Gorô Akechi mène ses enquêtes avec une jeune cuisinière qui lui sert de chauffeur.', array['gourmet detective','bishoku tantei akechi gorou','bishoku tantei akechi goro','美食探偵 明智五郎','goro akechi, epicurean private eye']::text[], '{"mal_id":92683}'::jsonb, true, false,
  13, 'cnlj', 'volume', array[1,2,3]::integer[], 'https://cnlj.bnf.fr/sites/default/files/file_media/flash_2023-2024.pdf', 2023
where not pg_temp.catalogue_has(array['Gourmet détective','gourmet detective','bishoku tantei akechi gorou','bishoku tantei akechi goro','美食探偵 明智五郎','goro akechi, epicurean private eye']::text[], 92683)
returning id
)
insert into public.catalogue_growth_inserted (manga_id, batch) select id, 'cnlj-2026-10' from inserted;

with inserted as (
insert into public.mangas (title, author, publisher_fr, total_volumes, status, genres, demographic, synopsis, aliases, external_ids, curated, is_top_50_fr,
  audience_min_age, audience_age_source, audience_age_scope, audience_age_volumes, audience_age_ref, audience_age_year)
select 'Land', 'Kazumi Yamashita', 'Mangetsu', 11, 'completed'::public.manga_status,
  array['fantasy','mystere','drame']::text[], 'seinen', 'Dans un village isolé, surveillé par des statues géantes, deux jumelles séparées à la naissance osent défier les règles qui encadrent chaque vie.', array['ランド']::text[], '{"mal_id":90182}'::jsonb, true, false,
  15, 'cnlj', 'volume', array[1,2,3,4,5,6,7,8,9,10]::integer[], 'https://cnlj.bnf.fr/sites/default/files/flash_2024-2025.pdf', 2024
where not pg_temp.catalogue_has(array['Land','ランド']::text[], 90182)
returning id
)
insert into public.catalogue_growth_inserted (manga_id, batch) select id, 'cnlj-2026-10' from inserted;

with inserted as (
insert into public.mangas (title, author, publisher_fr, total_volumes, status, genres, demographic, synopsis, aliases, external_ids, curated, is_top_50_fr,
  audience_min_age, audience_age_source, audience_age_scope, audience_age_volumes, audience_age_ref, audience_age_year)
select 'Hinatsuba : celle qui maniait le sabre', 'Kôichi Masahara', 'Petit à petit (Kotodama)', 1, 'completed'::public.manga_status,
  array['historique','action','drame']::text[], null, 'Au temps des samouraïs, la jeune Suzu s''entraîne au sabre et cherche sa propre voie dans une société où les femmes ont peu de place.', array['hinatsuba','ひなつば']::text[], '{"mal_id":113291}'::jsonb, true, false,
  null, null, null, null, null, null
where not pg_temp.catalogue_has(array['Hinatsuba : celle qui maniait le sabre','hinatsuba','ひなつば']::text[], 113291)
returning id
)
insert into public.catalogue_growth_inserted (manga_id, batch) select id, 'cnlj-2026-10' from inserted;
