-- analytics_events : written by the server only (/api/events and
-- logServerEvent with the service role), never directly with the public
-- key. The closed catalogue in src/lib/analytics-catalogue.ts is then the
-- only way in. Backstop checks keep rows small and names well-formed.
-- Events no longer carry a user id (CNIL audience-measurement exemption,
-- minors) : the column stays for old rows and is always null from now on.
drop policy if exists "analytics_events: insert own or anonymous" on public.analytics_events;
revoke insert, update, delete on public.analytics_events from anon, authenticated;

alter table public.analytics_events
  add constraint analytics_events_name_format check (event_name ~ '^[a-z_]{1,40}$'),
  add constraint analytics_events_properties_size check (pg_column_size(properties) < 2048);
