-- End of the write freeze (ops/freeze.sql) : before reopening.
do $$
declare t record;
begin
  for t in
    select c.relname from pg_trigger g join pg_class c on c.oid = g.tgrelid
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and g.tgname = 'ops_freeze'
  loop
    execute format('drop trigger if exists ops_freeze on public.%I', t.relname);
  end loop;
end $$;
drop function if exists public.ops_freeze_guard();
drop table if exists public.ops_freeze_allow;
