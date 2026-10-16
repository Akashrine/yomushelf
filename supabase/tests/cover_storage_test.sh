#!/usr/bin/env bash
# Access test of the cover bucket (20261017000800). LOCAL / TEST ONLY.
# Usage : API=http://127.0.0.1:55421 ANON=<anon key> SERVICE=<service key> \
#         USER_EMAIL=... USER_PASSWORD=... bash supabase/tests/cover_storage_test.sh
set -u
API=${API:-http://127.0.0.1:55421}
S="$API/storage/v1"
tmp=$(mktemp -d)
printf '\xff\xd8\xff\xe0\x00\x10JFIF\x00\x01\x01\x00\x00\x01\x00\x01\x00\x00\xff\xd9' > "$tmp/ok.jpg"
printf '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>' > "$tmp/bad.svg"
head -c 3000000 /dev/zero | tr '\0' 'a' > "$tmp/big.jpg"
USER_TOKEN=$(curl -s "$API/auth/v1/token?grant_type=password" -H "apikey: $ANON" -H 'content-type: application/json' \
  -d "{\"email\":\"$USER_EMAIL\",\"password\":\"$USER_PASSWORD\"}" | python3 -c 'import json,sys; print(json.load(sys.stdin).get("access_token",""))')
pass=0; fail=0
expect() { # name expected actual
  if [[ "$3" =~ $2 ]]; then echo "PASS  $1 ($3)"; pass=$((pass+1)); else echo "FAIL  $1 (attendu $2, obtenu $3)"; fail=$((fail+1)); fi
}
up() { # token file type path
  curl -s -o /dev/null -w '%{http_code}' -X POST "$S/object/manga-covers/$4" -H "apikey: $ANON" -H "authorization: Bearer $1" -H "content-type: $3" -H 'x-upsert: true' --data-binary "@$2"
}
expect "serveur : dépôt d'une couverture JPEG" '^200$' "$(up "$SERVICE" "$tmp/ok.jpg" image/jpeg covers/test-ok.jpg)"
expect "visiteur : lecture publique de la couverture" '^200$' "$(curl -s -o /dev/null -w '%{http_code}' "$S/object/public/manga-covers/covers/test-ok.jpg")"
expect "visiteur : dépôt refusé" '^(400|401|403)$' "$(up "$ANON" "$tmp/ok.jpg" image/jpeg covers/anon.jpg)"
expect "lecteur connecté : dépôt refusé" '^(400|401|403)$' "$(up "$USER_TOKEN" "$tmp/ok.jpg" image/jpeg covers/user.jpg)"
expect "lecteur connecté : remplacement refusé" '^(400|401|403)$' "$(up "$USER_TOKEN" "$tmp/ok.jpg" image/jpeg covers/test-ok.jpg)"
expect "lecteur connecté : suppression sans effet" '^(200|400|401|403|404)$' "$(curl -s -o /dev/null -w '%{http_code}' -X DELETE "$S/object/manga-covers/covers/test-ok.jpg" -H "apikey: $ANON" -H "authorization: Bearer $USER_TOKEN")"
expect "… la couverture est toujours là" '^200$' "$(curl -s -o /dev/null -w '%{http_code}' "$S/object/public/manga-covers/covers/test-ok.jpg")"
expect "visiteur : liste du bucket vide" '^\[\]$' "$(curl -s -X POST "$S/object/list/manga-covers" -H "apikey: $ANON" -H "authorization: Bearer $ANON" -H 'content-type: application/json' -d '{"prefix":"covers/"}')"
expect "serveur : SVG refusé par le bucket" '^(400|415|422)$' "$(up "$SERVICE" "$tmp/bad.svg" image/svg+xml covers/bad.svg)"
expect "serveur : fichier de 3 Mo refusé" '^(400|413)$' "$(up "$SERVICE" "$tmp/big.jpg" image/jpeg covers/big.jpg)"
curl -s -o /dev/null -X DELETE "$S/object/manga-covers/covers/test-ok.jpg" -H "apikey: $ANON" -H "authorization: Bearer $SERVICE"
rm -rf "$tmp"
echo "$pass réussis, $fail échoués"
[ "$fail" -eq 0 ]
