-- Same figures AFTER the migrations (new schema) : one row per owned
-- volume in user_volumes, one per read volume in user_readings. Prices and
-- origins must stay 0 : the conversion never invents them.
select uc.user_id, uc.manga_id,
       (select count(*) from public.user_volumes v where v.user_id = uc.user_id and v.manga_id = uc.manga_id) as owned,
       (select count(*) from public.user_readings r where r.user_id = uc.user_id and r.manga_id = uc.manga_id and r.status = 'read') as read,
       (select count(*) from public.user_volumes v where v.user_id = uc.user_id and v.manga_id = uc.manga_id and v.price_eur is not null) as priced,
       (select count(*) from public.user_volumes v where v.user_id = uc.user_id and v.manga_id = uc.manga_id and v.acquisition_type is not null) as with_origin
from public.user_collections uc
order by 1, 2;
