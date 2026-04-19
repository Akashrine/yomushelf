-- ============================================================
-- Seed : Top 50 mangas FR les plus vendus / populaires
-- Source : classements librairies FR (Cultura, Fnac, Amazon FR),
--          Japan Expo, Club Dorothée stats, données éditeurs.
-- ============================================================

insert into public.mangas (
  title, author, publisher_fr, total_volumes, status,
  avg_price_eur, genre_primary, is_top_50_fr, top_50_rank,
  external_ids
) values

-- ── Rang 1-10 ───────────────────────────────────────────────
('One Piece',            'Eiichiro Oda',            'Glénat',  null,  'ongoing',   7.60, 'Shōnen',  true,  1,  '{"nautiljon_slug":"one-piece"}'),
('Naruto',              'Masashi Kishimoto',        'Kana',    72,    'completed', 7.60, 'Shōnen',  true,  2,  '{"nautiljon_slug":"naruto"}'),
('Dragon Ball',         'Akira Toriyama',           'Glénat',  42,    'completed', 7.60, 'Shōnen',  true,  3,  '{"nautiljon_slug":"dragon-ball"}'),
('Attack on Titan',     'Hajime Isayama',           'Pika',    34,    'completed', 7.99, 'Shōnen',  true,  4,  '{"nautiljon_slug":"attaque-des-titans"}'),
('Demon Slayer',        'Koyoharu Gotouge',         'Panini',  23,    'completed', 6.99, 'Shōnen',  true,  5,  '{"nautiljon_slug":"demon-slayer"}'),
('Jujutsu Kaisen',      'Gege Akutami',             'Ki-oon',  null,  'ongoing',   7.99, 'Shōnen',  true,  6,  '{"nautiljon_slug":"jujutsu-kaisen"}'),
('My Hero Academia',    'Kohei Horikoshi',          'Ki-oon',  null,  'ongoing',   6.99, 'Shōnen',  true,  7,  '{"nautiljon_slug":"my-hero-academia"}'),
('Bleach',              'Tite Kubo',                'Glénat',  74,    'completed', 7.60, 'Shōnen',  true,  8,  '{"nautiljon_slug":"bleach"}'),
('Fullmetal Alchemist', 'Hiromu Arakawa',           'Glénat',  27,    'completed', 7.60, 'Shōnen',  true,  9,  '{"nautiljon_slug":"fullmetal-alchemist"}'),
('Death Note',          'Tsugumi Ohba',             'Kana',    12,    'completed', 7.60, 'Shōnen',  true,  10, '{"nautiljon_slug":"death-note"}'),

-- ── Rang 11-20 ──────────────────────────────────────────────
('Spy × Family',               'Tatsuya Endo',      'Kurokawa', null, 'ongoing',   7.99, 'Shōnen',  true,  11, '{"nautiljon_slug":"spy-x-family"}'),
('Chainsaw Man',               'Tatsuki Fujimoto',  'Glénat',   null, 'ongoing',   7.99, 'Shōnen',  true,  12, '{"nautiljon_slug":"chainsaw-man"}'),
('Blue Lock',                  'Muneyuki Kaneshiro', 'Pika',    null, 'ongoing',   7.99, 'Shōnen',  true,  13, '{"nautiljon_slug":"blue-lock"}'),
('Frieren : Au-delà du voyage','Kanehito Yamada',   'Ki-oon',   null, 'ongoing',   7.99, 'Shōnen',  true,  14, '{"nautiljon_slug":"frieren"}'),
('Kaiju No. 8',                'Naoya Matsumoto',   'Glénat',   null, 'ongoing',   7.99, 'Shōnen',  true,  15, '{"nautiljon_slug":"kaiju-n8"}'),
('Solo Leveling',              'Chugong',           'Delcourt', null, 'completed', 8.99, 'Action',  true,  16, '{"nautiljon_slug":"solo-leveling"}'),
('Tokyo Ghoul',                'Sui Ishida',        'Glénat',   14,   'completed', 7.60, 'Seinen',  true,  17, '{"nautiljon_slug":"tokyo-ghoul"}'),
('Hunter x Hunter',            'Yoshihiro Togashi', 'Kana',     null, 'paused',    7.60, 'Shōnen',  true,  18, '{"nautiljon_slug":"hunter-x-hunter"}'),
('Sword Art Online',           'Reki Kawahara',     'Ototo',    null, 'ongoing',   7.99, 'Shōnen',  true,  19, '{"nautiljon_slug":"sword-art-online"}'),
('Black Clover',               'Yūki Tabata',       'Kana',     null, 'ongoing',   7.60, 'Shōnen',  true,  20, '{"nautiljon_slug":"black-clover"}'),

-- ── Rang 21-30 ──────────────────────────────────────────────
('Fairy Tail',                 'Hiro Mashima',      'Pika',     63,   'completed', 7.60, 'Shōnen',  true,  21, '{"nautiljon_slug":"fairy-tail"}'),
('Vinland Saga',               'Makoto Yukimura',   'Kurokawa', null, 'ongoing',   8.65, 'Seinen',  true,  22, '{"nautiljon_slug":"vinland-saga"}'),
('Kingdom',                    'Yasuhisa Hara',     'Meian',    null, 'ongoing',   7.95, 'Seinen',  true,  23, '{"nautiljon_slug":"kingdom"}'),
('Dr. Stone',                  'Riichiro Inagaki',  'Glénat',   26,   'completed', 7.99, 'Shōnen',  true,  24, '{"nautiljon_slug":"dr-stone"}'),
('The Promised Neverland',     'Kaiu Shirai',       'Glénat',   20,   'completed', 7.60, 'Shōnen',  true,  25, '{"nautiljon_slug":"the-promised-neverland"}'),
('Berserk',                    'Kentaro Miura',     'Glénat',   null, 'paused',    7.60, 'Seinen',  true,  26, '{"nautiljon_slug":"berserk"}'),
('Vagabond',                   'Takehiko Inoue',    'Tonkam',   37,   'paused',    8.50, 'Seinen',  true,  27, '{"nautiljon_slug":"vagabond"}'),
('Slam Dunk',                  'Takehiko Inoue',    'Kana',     31,   'completed', 7.60, 'Shōnen',  true,  28, '{"nautiljon_slug":"slam-dunk"}'),
('Haikyu!!',                   'Haruichi Furudate', 'Glénat',   45,   'completed', 7.60, 'Shōnen',  true,  29, '{"nautiljon_slug":"haikyu"}'),
('Food Wars!',                 'Yūto Tsukuda',      'Glénat',   36,   'completed', 7.60, 'Shōnen',  true,  30, '{"nautiljon_slug":"food-wars"}'),

-- ── Rang 31-40 ──────────────────────────────────────────────
('Kaguya-sama',                'Aka Akasaka',       'Pika',     28,   'completed', 7.99, 'Shōnen',  true,  31, '{"nautiljon_slug":"kaguya-sama"}'),
('Dandadan',                   'Yukinobu Tatsu',    'Glénat',   null, 'ongoing',   7.99, 'Shōnen',  true,  32, '{"nautiljon_slug":"dandadan"}'),
('Oshi no Ko',                 'Aka Akasaka',       'Ki-oon',   null, 'ongoing',   7.99, 'Seinen',  true,  33, '{"nautiljon_slug":"oshi-no-ko"}'),
('Omniscient Reader',          'Sing N Song',       'Delcourt', null, 'ongoing',   8.99, 'Action',  true,  34, '{"nautiljon_slug":"omniscient-reader"}'),
('Dungeon Meshi',              'Ryoko Kui',         'Kurokawa', 14,   'completed', 8.50, 'Shōnen',  true,  35, '{"nautiljon_slug":"dungeon-meshi"}'),
('Toilet-bound Hanako-kun',    'AidaIro',           'Mana',     null, 'ongoing',   7.99, 'Shōnen',  true,  36, '{"nautiljon_slug":"toilet-bound-hanako-kun"}'),
('Witch Hat Atelier',          'Kamome Shirahama',  'Pika',     null, 'ongoing',   8.50, 'Shōnen',  true,  37, '{"nautiljon_slug":"witch-hat-atelier"}'),
('Nausicaä',                   'Hayao Miyazaki',    'Glénat',   7,    'completed', 9.80, 'Seinen',  true,  38, '{"nautiljon_slug":"nausicaa"}'),
('Monster',                    'Naoki Urasawa',     'Panini',   18,   'completed', 7.99, 'Seinen',  true,  39, '{"nautiljon_slug":"monster"}'),
('20th Century Boys',          'Naoki Urasawa',     'Panini',   22,   'completed', 7.99, 'Seinen',  true,  40, '{"nautiljon_slug":"20th-century-boys"}'),

-- ── Rang 41-50 ──────────────────────────────────────────────
('Pluto',                      'Naoki Urasawa',     'Panini',   8,    'completed', 7.99, 'Seinen',  true,  41, '{"nautiljon_slug":"pluto"}'),
('Boruto',                     'Masashi Kishimoto', 'Kana',     null, 'ongoing',   7.60, 'Shōnen',  true,  42, '{"nautiljon_slug":"boruto"}'),
('Mashle',                     'Hajime Komoto',     'Glénat',   16,   'completed', 7.60, 'Shōnen',  true,  43, '{"nautiljon_slug":"mashle"}'),
('Hell''s Paradise',           'Yuji Kaku',         'Glénat',   13,   'completed', 7.60, 'Shōnen',  true,  44, '{"nautiljon_slug":"hells-paradise"}'),
('Sakamoto Days',              'Yuto Suzuki',       'Glénat',   null, 'ongoing',   7.99, 'Shōnen',  true,  45, '{"nautiljon_slug":"sakamoto-days"}'),
('Undead Unluck',              'Yoshifumi Tozuka',  'Glénat',   null, 'ongoing',   7.60, 'Shōnen',  true,  46, '{"nautiljon_slug":"undead-unluck"}'),
('Wind Breaker',               'Satoru Nii',        'Glénat',   null, 'ongoing',   7.99, 'Shōnen',  true,  47, '{"nautiljon_slug":"wind-breaker"}'),
('Ao Ashi',                    'Yûgo Kobayashi',    'Kurokawa', null, 'ongoing',   8.50, 'Shōnen',  true,  48, '{"nautiljon_slug":"ao-ashi"}'),
('Fire Force',                 'Atsushi Ohkubo',    'Kurokawa', 34,   'completed', 7.99, 'Shōnen',  true,  49, '{"nautiljon_slug":"fire-force"}'),
('Assassination Classroom',    'Yūsei Matsui',      'Kana',     21,   'completed', 7.60, 'Shōnen',  true,  50, '{"nautiljon_slug":"assassination-classroom"}')

on conflict do nothing;
