-- Per reader and per series, BEFORE the migrations (old schema) :
-- volumes owned, volumes read (legacy pointer, capped at 500 like the
-- migration), volumes with a price, volumes with an origin (none exist in
-- the old schema : always 0). Compare with ops/conversion_after.sql.
select uc.user_id, uc.manga_id,
       (select count(distinct v) from unnest(uc.owned_volumes) v) as owned,
       least(coalesce(uc.last_read_volume, 0), 500) as read,
       0 as priced,
       0 as with_origin
from public.user_collections uc
order by 1, 2;
