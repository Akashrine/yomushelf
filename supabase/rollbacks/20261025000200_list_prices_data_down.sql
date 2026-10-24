-- Rollback of 20261025000200_list_prices_data.sql
update public.mangas set list_price_eur = null, list_price_ref = null, list_price_year = null where curated and created_by is null;
