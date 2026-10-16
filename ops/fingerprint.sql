-- Row count and hash of every table of the pre-switch schema (backup check).
-- Row fingerprint of every table of the old schema.
select t.table_name,
  (xpath('/row/c/text()', query_to_xml(format('select count(*) as c from public.%I', t.table_name), false, true, '')))[1]::text as rows,
  (xpath('/row/h/text()', query_to_xml(format('select md5(coalesce(string_agg(x::text, %L order by x::text), %L)) as h from public.%I x', '|', '', t.table_name), false, true, '')))[1]::text as hash
from information_schema.tables t
where t.table_schema = 'public' and t.table_type = 'BASE TABLE'
  and t.table_name in ('profiles','mangas','volumes','user_collections','waitlist_entries','analytics_events','share_events','wrapped_snapshots','catalog_import_events')
order by 1;
