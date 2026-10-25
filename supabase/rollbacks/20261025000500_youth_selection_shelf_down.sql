-- Rollback of 20261025000500_youth_selection_shelf.sql
do $$
declare t text;
begin
  foreach t in array array['user_collections', 'user_volumes', 'user_readings'] loop
    execute format('drop policy if exists "%1$s: youth selection (insert)" on public.%1$I', t);
  end loop;
end $$;
drop function if exists public.reader_may_have_series(uuid);
