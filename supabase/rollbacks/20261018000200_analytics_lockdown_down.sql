alter table public.analytics_events
  drop constraint if exists analytics_events_properties_size,
  drop constraint if exists analytics_events_name_format;
grant insert on public.analytics_events to anon, authenticated;
create policy "analytics_events: insert own or anonymous"
  on public.analytics_events for insert
  with check (user_id is null or auth.uid() = user_id);
