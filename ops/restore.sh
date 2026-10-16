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
# Each rollback and the removal of its line from the migration history go
# in ONE transaction : after a failure, running the script again skips
# what is already undone.
for f in $(ls supabase/rollbacks/*_down.sql | sort -r); do
  b=$(basename "$f"); [[ "$b" > "20261015" ]] || continue
  v=${b%%_*}
  if docker exec "$C" psql "$DB_URL" -At -c "select 1 from supabase_migrations.schema_migrations where version = '$v'" | grep -q 1; then
    { cat "$f"; echo; echo "delete from supabase_migrations.schema_migrations where version = '$v';"; } > "/tmp/$b"
    docker cp "/tmp/$b" "$C:/tmp/$b"
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
-- Accounts created after the backup keep a minimal profile (the old app
-- cannot work for them without one). Listed below for a manual check.
insert into public.profiles (id, email, avatar_initials)
select u.id, u.email, upper(left(coalesce(u.email, '?'), 2)) from auth.users u
where not exists (select 1 from public.profiles p where p.id = u.id) and u.email is not null;
delete from supabase_migrations.schema_migrations where version >= '20261015';
commit;
SQL
docker cp /tmp/restore-data.sql "$C:/tmp/restore-data.sql"
docker exec "$C" psql "$DB_URL" -q -f /tmp/restore-data.sql > /dev/null
NEW=0
if [ -f "./$NAME.timestamp" ]; then
  echo "Comptes créés après la sauvegarde (profil minimal recréé, leurs données d'après sont perdues) :"
  docker exec "$C" psql "$DB_URL" -At -c "select id, email, created_at from auth.users where created_at > '$(cat "./$NAME.timestamp")'"
  NEW=$(docker exec "$C" psql "$DB_URL" -At -c "select count(*) from auth.users where created_at > '$(cat "./$NAME.timestamp")'")
fi
docker cp ops/fingerprint.sql "$C:/tmp/fingerprint.sql"
docker exec "$C" psql "$DB_URL" -At -f /tmp/fingerprint.sql > "./$NAME.after-restore"
# Every table must match the backup exactly ; profiles may only differ by
# the minimal profiles recreated for the accounts listed above.
if diff -q <(grep -v '^profiles|' "./$NAME.fingerprint") <(grep -v '^profiles|' "./$NAME.after-restore") > /dev/null; then
  before=$(grep '^profiles|' "./$NAME.fingerprint" | cut -d'|' -f2)
  after=$(grep '^profiles|' "./$NAME.after-restore" | cut -d'|' -f2)
  if [ "$after" -eq $(( before + NEW )) ]; then
    echo "Données identiques à la sauvegarde (profils : $before + $NEW recréés)."
    exit 0
  fi
fi
echo "ÉCART avec la sauvegarde :"; diff "./$NAME.fingerprint" "./$NAME.after-restore"; exit 1
