-- Wishes for the Christmas list journey (e2e/family-list.mjs). Run after
-- reset.sql. LOCAL / TEST DATABASES ONLY.
--   kid@    3 wishes (the child who asks, the parent who shares)
--   other@  2 wishes (a teen of 15 who shares by themselves)
insert into public.wishlist_items (user_id, manga_id, volume_number, target_price)
select '00000000-0000-4000-a000-0000000000e3', m.id, w.volume_number, w.price
from (values ('One Piece', 1, 6.9::numeric), ('Dr. Stone', 5, null), ('Spy x Family', 5, 7.2)) as w(title, volume_number, price)
join public.mangas m on m.title = w.title and m.curated and m.created_by is null and m.merged_into is null;

insert into public.wishlist_items (user_id, manga_id, volume_number, target_price)
select '00000000-0000-4000-a000-0000000000e2', m.id, w.volume_number, w.price
from (values ('Naruto', 2, 6.9::numeric), ('Spy x Family', 1, null)) as w(title, volume_number, price)
join public.mangas m on m.title = w.title and m.curated and m.created_by is null and m.merged_into is null;
