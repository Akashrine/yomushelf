#!/usr/bin/env bash
# Test of the write freeze (ops/freeze.sql) through the real Supabase API.
# LOCAL / TEST ONLY. The database must be frozen first (psql -f ops/freeze.sql)
# and contain an existing reader (READER_EMAIL / READER_PASSWORD) with at
# least one user_collections row.
# Usage : API=… ANON=… SERVICE=… READER_EMAIL=… READER_PASSWORD=… ALLOWED_EMAIL=… \
#         bash supabase/tests/freeze_test.sh [old|new]
set -u
SCHEMA=${1:-old}
API=${API:-http://127.0.0.1:55421}
R="$API/rest/v1"
pass=0; fail=0
expect() { if [[ "$3" =~ $2 ]]; then echo "PASS  $1 ($3)"; pass=$((pass+1)); else echo "FAIL  $1 (attendu $2, obtenu $3)"; fail=$((fail+1)); fi; }
token() { curl -s "$API/auth/v1/token?grant_type=password" -H "apikey: $ANON" -H 'content-type: application/json' \
  -d "{\"email\":\"$1\",\"password\":\"$2\"}" | python3 -c 'import json,sys; print(json.load(sys.stdin).get("access_token",""))'; }
# "<http status> <error code>" : the freeze answers with code P0001
code() { curl -s -w ' %{http_code}' "$@" | python3 -c 'import sys,json; raw=sys.stdin.read(); body,c=raw.rsplit(" ",1); d=json.loads(body) if body.strip().startswith("{") else {}; print(c, d.get("code") or d.get("error_code") or "-")'; }

READER=$(token "$READER_EMAIL" "$READER_PASSWORD")
expect "une session existante peut encore se connecter (Auth seul)" '^.{20,}$' "${READER:0:24}"
UID_R=$(python3 -c "import base64,json,sys; p=sys.argv[1].split('.')[1]; p+='='*(-len(p)%4); print(json.loads(base64.urlsafe_b64decode(p))['sub'])" "$READER")
MID=$(curl -s "$R/user_collections?select=manga_id&limit=1" -H "apikey: $ANON" -H "authorization: Bearer $READER" | python3 -c 'import json,sys; d=json.load(sys.stdin); print(d[0]["manga_id"] if d else "")')
expect "lecture toujours possible pendant le gel" '^[0-9a-f-]{36}$' "$MID"

expect "session existante : modifier sa collection" '^[45][0-9][0-9] P0001$' \
  "$(code -X PATCH "$R/user_collections?manga_id=eq.$MID" -H "apikey: $ANON" -H "authorization: Bearer $READER" -H 'content-type: application/json' -d '{"status":"dropped"}')"
expect "session existante : supprimer une série" '^[45][0-9][0-9] P0001$' \
  "$(code -X DELETE "$R/user_collections?manga_id=eq.$MID" -H "apikey: $ANON" -H "authorization: Bearer $READER")"
expect "session existante : modifier son profil" '^[45][0-9][0-9] P0001$' \
  "$(code -X PATCH "$R/profiles?id=eq.$UID_R" -H "apikey: $ANON" -H "authorization: Bearer $READER" -H 'content-type: application/json' -d '{"username":"gel"}')"
expect "visiteur : inscription à la liste d'attente" '^[45][0-9][0-9] P0001$' \
  "$(code -X POST "$R/waitlist_entries" -H "apikey: $ANON" -H 'content-type: application/json' -d '{"email":"gel@yomushelf.local","source":"other"}')"
expect "visiteur : événement d'analyse" '^[45][0-9][0-9] P0001$' \
  "$(code -X POST "$R/analytics_events" -H "apikey: $ANON" -H 'content-type: application/json' -d '{"event_name":"gel","properties":{}}')"
expect "clé serveur via l'API : écriture refusée aussi" '^[45][0-9][0-9] P0001$' \
  "$(code -X PATCH "$R/user_collections?manga_id=eq.$MID" -H "apikey: $SERVICE" -H "authorization: Bearer $SERVICE" -H 'content-type: application/json' -d '{"status":"dropped"}')"
if [ "$SCHEMA" = new ]; then
  VOL=$(printf '{"user_id":"%s","manga_id":"%s","volume_number":499}' "$UID_R" "$MID")
  expect "nouveau schéma : ajouter un tome" '^[45][0-9][0-9] P0001$' \
    "$(code -X POST "$R/user_volumes" -H "apikey: $ANON" -H "authorization: Bearer $READER" -H 'content-type: application/json' -d "$VOL")"
fi
STRANGER="inconnu-$(date +%s)@yomushelf.local"
signup() { # email -> "http_code error_code"
  local body; body=$(printf '{"email":"%s","password":"gel-gel-gel-1"}' "$1")
  curl -s -w ' %{http_code}' -X POST "$API/auth/v1/signup" -H "apikey: $ANON" -H 'content-type: application/json' -d "$body" \
    | python3 -c 'import sys,json; raw=sys.stdin.read(); body,code=raw.rsplit(" ",1); d=json.loads(body or "{}"); print(code, d.get("error_code") or d.get("code") or ("ok" if d.get("id") else "?"))'
}
# refused by the database (the profile insert fails), not by input validation
expect "inscription d'un inconnu refusée par le gel" '^[45][0-9][0-9] (P0001|unexpected_failure)$' "$(signup "$STRANGER")"
expect "compte de test autorisé : inscription acceptée" '^200 ok$' "$(signup "$ALLOWED_EMAIL")"
echo "$pass réussis, $fail échoués"
echo "STRANGER=$STRANGER"
[ "$fail" -eq 0 ]
