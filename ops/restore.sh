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

# Reload mode. "replica" (session_replication_role : no triggers, no FK
# checks) needs a permission Supabase grants to postgres ; checked here in
# a transaction that is rolled back. Otherwise "ordered" : the user
# triggers of the old tables are disabled (table owner right) and the
# tables are reloaded parents first, FK checks still on.
MODE=${RESTORE_RELOAD:-auto}
if [ "$MODE" = auto ]; then
  if docker exec "$C" psql "$DB_URL" -q -v ON_ERROR_STOP=1 -c "begin; set local session_replication_role = replica; rollback;" > /dev/null 2>&1; then
    MODE=replica
  else
    MODE=ordered
  fi
fi
echo "Rechargement des données : mode $MODE"
TABLES="profiles mangas volumes user_collections waitlist_entries analytics_events share_events wrapped_snapshots catalog_import_events"
{
  echo '\set ON_ERROR_STOP 1'
  echo 'begin;'
  if [ "$MODE" = replica ]; then
    echo 'set local session_replication_role = replica;'
  else
    for t in $TABLES; do echo "alter table public.$t disable trigger user;"; done
  fi
  echo "truncate $(echo $TABLES | sed 's/\([a-z_]*\)/public.\1/g; s/ /, /g');"
  for t in $TABLES; do echo "\\i /tmp/$NAME-data-$t.sql"; done
  echo "\\i /tmp/$NAME-data-sequences.sql"
  cat <<'SQL'
-- Accounts created after the backup keep a minimal profile (the old app
-- cannot work for them without one). Listed below for a manual check.
insert into public.profiles (id, email, avatar_initials)
select u.id, u.email, upper(left(coalesce(u.email, '?'), 2)) from auth.users u
where not exists (select 1 from public.profiles p where p.id = u.id) and u.email is not null;
delete from supabase_migrations.schema_migrations where version >= '20261015';
SQL
  if [ "$MODE" != replica ]; then
    for t in $TABLES; do echo "alter table public.$t enable trigger user;"; done
  fi
  echo 'commit;'
} > /tmp/restore-data.sql
# one data file per table (parents first in the script above), sequences apart
for t in $TABLES; do
  docker exec "$C" pg_restore --data-only -n public -t "$t" -f "/tmp/$NAME-data-$t.sql" "/tmp/$NAME.dump"
done
docker exec "$C" sh -c "pg_restore -l /tmp/$NAME.dump | grep 'SEQUENCE SET' > /tmp/$NAME-seq.list; pg_restore --data-only -L /tmp/$NAME-seq.list -f /tmp/$NAME-data-sequences.sql /tmp/$NAME.dump"
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
