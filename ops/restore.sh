#!/usr/bin/env bash
# Back to the pre-migration state, as rehearsed (docs/publication.md) :
#   1. rollback files in reverse order (schema back to the old shape)
#   2. rows of the old tables reloaded from the backup, migration history
#      cleaned, in one transaction
#   3. fingerprint compared with the one taken at backup time
# Usage : DB_URL=postgresql://… ops/restore.sh <name>   (needs <name>.dump and <name>.fingerprint)
# The app must be in maintenance (MAINTENANCE_MODE=1) during the restore.
set -euo pipefail
NAME=${1:?backup name}
C=${PG_CONTAINER:-supabase_db_Yomushelf-v2}
for f in $(ls supabase/rollbacks/*_down.sql | sort -r); do
  b=$(basename "$f"); [[ "$b" > "20261015" ]] || continue
  if docker exec "$C" psql "$DB_URL" -At -c "select 1 from supabase_migrations.schema_migrations where version = '${b%%_*}'" | grep -q 1; then
    docker cp "$f" "$C:/tmp/$b"
    docker exec "$C" psql "$DB_URL" -q -v ON_ERROR_STOP=1 -1 -f "/tmp/$b"
    echo "annulé : $b"
  fi
done
docker cp "./$NAME.dump" "$C:/tmp/$NAME.dump"
docker exec "$C" pg_restore --data-only -n public -f "/tmp/$NAME-data.sql" "/tmp/$NAME.dump"
cat > /tmp/restore-data.sql <<SQL
\set ON_ERROR_STOP 1
begin;
set local session_replication_role = replica;
truncate public.user_collections, public.volumes, public.mangas, public.profiles, public.waitlist_entries,
         public.analytics_events, public.share_events, public.wrapped_snapshots, public.catalog_import_events;
\i /tmp/$NAME-data.sql
delete from supabase_migrations.schema_migrations where version >= '20261015';
commit;
SQL
docker cp /tmp/restore-data.sql "$C:/tmp/restore-data.sql"
docker exec "$C" psql "$DB_URL" -q -f /tmp/restore-data.sql > /dev/null
docker cp ops/fingerprint.sql "$C:/tmp/fingerprint.sql"
docker exec "$C" psql "$DB_URL" -At -f /tmp/fingerprint.sql > "./$NAME.after-restore"
if diff -q "./$NAME.fingerprint" "./$NAME.after-restore" > /dev/null; then
  echo "Données identiques à la sauvegarde."
else
  echo "ÉCART avec la sauvegarde :"; diff "./$NAME.fingerprint" "./$NAME.after-restore"; exit 1
fi
