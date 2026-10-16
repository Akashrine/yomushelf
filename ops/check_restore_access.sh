#!/usr/bin/env bash
# Read-only check, before the maintenance window, that the role used by
# ops/backup.sh and ops/restore.sh can run them on the hosted database.
# Same connection mode as those scripts : psql / pg_dump from the local
# Supabase container, with the same DB_URL. Every test that touches a
# setting or a table runs in a transaction that is rolled back.
# Usage : DB_URL=postgresql://… ops/check_restore_access.sh
set -uo pipefail
C=${PG_CONTAINER:-supabase_db_Yomushelf-v2}
q() { docker exec "$C" psql "$DB_URL" -X -At -v ON_ERROR_STOP=1 "$@" 2>&1; }
ok=0; ko=0
res() { if [ "$1" = 0 ]; then echo "OK    $2"; ok=$((ok+1)); else echo "ÉCHEC $2 : $3"; ko=$((ko+1)); fi; }

out=$(q -c "select current_user || ' / ' || session_user || ' / superuser=' || rolsuper || ' / ' || version() from pg_roles where rolname = current_user")
res $? "connexion" "$out"; echo "      $out" | cut -c1-160

out=$(q -c "begin; set local session_replication_role = replica; show session_replication_role; rollback;")
res $? "session_replication_role = replica (mode replica de ops/restore.sh)" "$out"

out=$(q -c "set lock_timeout = '2s'; begin; alter table public.profiles disable trigger user; alter table public.profiles enable trigger user; rollback;")
res $? "désactivation des déclencheurs, annulée (mode ordered de secours)" "$out"

out=$(q -c "select string_agg(c.relname || '=' || pg_get_userbyid(c.relowner), ' ') from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public' and c.relkind = 'r' and not pg_has_role(current_user, c.relowner, 'usage')")
if [ -z "$out" ]; then res 0 "propriétaire de toutes les tables public (truncate, rechargement)"; else res 1 "tables dont le rôle n'est pas propriétaire" "$out"; fi

out=$(q -c "select has_table_privilege('supabase_migrations.schema_migrations', 'delete')")
[ "$out" = t ]; res $? "suppression dans l'historique des migrations" "$out"

out=$(docker exec "$C" sh -c "pg_dump '$DB_URL' -Fc --schema=public --schema=supabase_migrations -f /tmp/check-access.dump && pg_restore -l /tmp/check-access.dump | grep -c 'TABLE DATA'; rm -f /tmp/check-access.dump" 2>&1)
[[ "$out" =~ ^[0-9]+$ ]] && [ "$out" -gt 0 ]; res $? "pg_dump lisible ($out tables de données)" "$out"

echo "$ok OK, $ko échec(s)"
[ "$ko" -eq 0 ]
