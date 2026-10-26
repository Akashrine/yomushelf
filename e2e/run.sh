#!/usr/bin/env bash
# Runs every end-to-end journey against the LOCAL Supabase stack, in one command.
#   e2e/run.sh            mobile + desktop journeys, then the Christmas list
#   e2e/run.sh journeys   only the journeys
#   e2e/run.sh family     only the Christmas list
#   e2e/run.sh serve      the app alone, to explore
# Never touches production : the app gets the local stack's address and keys
# through its environment (which wins over .env.local), and the script stops
# if that address is not local. The prod .env.local is never edited.
# Needs : docker, the local stack (npx supabase start), a Chromium
# (npx playwright-core install chromium, or CHROME=<path>).
set -euo pipefail
cd "$(dirname "$0")/.."

WHAT="${1:-all}"
PROJECT="${SUPABASE_PROJECT:-Yomushelf-v2}"
DB_CONTAINER="supabase_db_${PROJECT}"
API_PORT="${API_PORT:-55421}"
PORT="${PORT:-3100}"
LOG_DIR="$(mktemp -d)"

command -v docker >/dev/null || { echo "docker est requis."; exit 2; }
docker ps --format '{{.Names}}' | grep -qx "$DB_CONTAINER" || { echo "La base locale ($DB_CONTAINER) ne tourne pas : npx supabase start."; exit 2; }

KEYS="$(npx supabase status -o env 2>/dev/null || true)"
ANON_KEY="$(printf '%s\n' "$KEYS" | sed -n 's/^ANON_KEY="\{0,1\}\([^"]*\)"\{0,1\}$/\1/p')"
SERVICE_KEY="$(printf '%s\n' "$KEYS" | sed -n 's/^SERVICE_ROLE_KEY="\{0,1\}\([^"]*\)"\{0,1\}$/\1/p')"
[ -n "$ANON_KEY" ] && [ -n "$SERVICE_KEY" ] || { echo "Clés locales introuvables (npx supabase status)."; exit 2; }

export NEXT_PUBLIC_SUPABASE_URL="http://127.0.0.1:${API_PORT}"
export NEXT_PUBLIC_SUPABASE_ANON_KEY="$ANON_KEY"
export SUPABASE_SERVICE_ROLE_KEY="$SERVICE_KEY"
export NEXT_PUBLIC_APP_URL="http://localhost:${PORT}"
# No real email, no background cover job : emails go to the server log.
export RESEND_API_KEY="" RESEND_FROM_EMAIL="" VOLUME_COVERS_MODE="off"
case "$NEXT_PUBLIC_SUPABASE_URL" in http://127.0.0.1:*|http://localhost:*) ;; *) echo "Refusé : la base n'est pas locale."; exit 2 ;; esac

sql() { docker exec -i "$DB_CONTAINER" psql -U postgres -q -v ON_ERROR_STOP=1 < "$1" >/dev/null; }
SERVER_PID=""
stop_server() { [ -n "$SERVER_PID" ] && kill "$SERVER_PID" 2>/dev/null || true; pkill -f "next-server" 2>/dev/null || true; SERVER_PID=""; }
trap stop_server EXIT
wait_up() { for _ in $(seq 1 90); do curl -s -o /dev/null "http://localhost:${PORT}/login" && return 0; sleep 1; done; echo "Le serveur ne répond pas."; return 1; }

# e2e/run.sh serve : the app on the local stack with fresh test accounts, to
# poke around in a browser (accounts in e2e/reset.sql). Ctrl+C to stop.
if [ "$WHAT" = "serve" ]; then
  sql e2e/reset.sql
  npx next build > "$LOG_DIR/build.log" 2>&1 || { tail -20 "$LOG_DIR/build.log"; exit 1; }
  echo "http://localhost:${PORT} (e2e@, other@, kid@yomushelf.local, mot de passe e2e-yomushelf)"
  npx next start -p "$PORT"
  exit 0
fi

FAILED=0
run() { echo; echo "── $1"; shift; "$@" || FAILED=1; }

if [ "$WHAT" = "all" ] || [ "$WHAT" = "journeys" ]; then
  echo "Build de production sur la base locale…"
  npx next build > "$LOG_DIR/build.log" 2>&1 || { tail -20 "$LOG_DIR/build.log"; exit 1; }
  npx next start -p "$PORT" > "$LOG_DIR/start.log" 2>&1 & SERVER_PID=$!
  wait_up
  sql e2e/reset.sql
  run "Parcours, mobile" env BASE="http://localhost:${PORT}" node e2e/journeys.mjs
  sql e2e/reset.sql
  run "Parcours, ordinateur" env BASE="http://localhost:${PORT}" VIEWPORT=desktop node e2e/journeys.mjs
  stop_server
fi

if [ "$WHAT" = "all" ] || [ "$WHAT" = "family" ]; then
  # Emails are written to the server log : only `next dev` does that.
  npx next dev -p "$PORT" > "$LOG_DIR/dev.log" 2>&1 & SERVER_PID=$!
  wait_up
  sql e2e/reset.sql
  sql e2e/seed-family.sql
  run "Liste de Noël en famille" env BASE="http://localhost:${PORT}" LOG="$LOG_DIR/dev.log" SUPABASE_URL="$NEXT_PUBLIC_SUPABASE_URL" SERVICE="$SERVICE_KEY" node e2e/family-list.mjs
  stop_server
fi

sql e2e/reset.sql
echo
if [ "$FAILED" -eq 0 ]; then echo "Tout passe. (journaux : $LOG_DIR)"; else echo "Des vérifications échouent. (journaux : $LOG_DIR)"; fi
exit "$FAILED"
