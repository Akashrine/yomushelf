#!/usr/bin/env bash
# Pre-migration backup, as rehearsed (docs/publication.md).
# Usage : DB_URL=postgresql://… ops/backup.sh <name>
# Dumps the schemas the migrations touch (public + migration history) with
# PostgreSQL 17 tools from the local Supabase container, then prints the
# row fingerprint to keep next to the file.
set -euo pipefail
NAME=${1:?backup name}
C=${PG_CONTAINER:-supabase_db_Yomushelf-v2}
docker exec "$C" pg_dump -Fc --schema=public --schema=supabase_migrations -f "/tmp/$NAME.dump" "$DB_URL"
docker cp "$C:/tmp/$NAME.dump" "./$NAME.dump"
docker cp ops/fingerprint.sql "$C:/tmp/fingerprint.sql"
docker exec "$C" psql "$DB_URL" -At -f /tmp/fingerprint.sql | tee "./$NAME.fingerprint"
echo "Sauvegarde : ./$NAME.dump ($(wc -c < "./$NAME.dump") octets), empreinte : ./$NAME.fingerprint"
