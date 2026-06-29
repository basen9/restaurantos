#!/usr/bin/env bash
# Smoke / testy integracyjne API na działającej aplikacji.
# Wymaga uruchomionego serwera (domyślnie http://localhost:3000) i zseedowanej bazy.
# Użycie: BASE=http://localhost:3000 ./scripts/smoke.sh
set -uo pipefail
B="${BASE:-http://localhost:3000}"
pass=0; fail=0
chk() { if [ "$2" = "$3" ]; then echo "  ✅ $1"; pass=$((pass+1)); else echo "  ❌ $1 (oczekiwano '$2', jest '$3')"; fail=$((fail+1)); fi }
JAR_DIR="$(mktemp -d)"
login() { local jar="$JAR_DIR/$1"; rm -f "$jar"
  local c; c=$(curl -s -c "$jar" "$B/api/auth/csrf" | python3 -c "import sys,json;print(json.load(sys.stdin)['csrfToken'])")
  curl -s -b "$jar" -c "$jar" -o /dev/null -d "csrfToken=$c" -d "email=$2" -d "password=$3" -d "json=true" "$B/api/auth/callback/credentials"
}
role() { curl -s -b "$JAR_DIR/$1" "$B/api/auth/session" | python3 -c "import sys,json;print(json.load(sys.stdin).get('user',{}).get('role') or 'none')" 2>/dev/null; }
code() { curl -s -b "$JAR_DIR/$1" -o /dev/null -w "%{http_code}" "$B$2"; }
pcode() { curl -s -b "$JAR_DIR/$1" -o /dev/null -w "%{http_code}" -X "$2" -H 'Content-Type: application/json' -d "$4" "$B$3"; }

echo "== Health =="
chk "GET /api/health" 200 "$(curl -s -o /dev/null -w '%{http_code}' "$B/api/health")"

echo "== Logowanie =="
login owner owner@workos.pl owner123 >/dev/null; chk "OWNER login" OWNER "$(role owner)"
login emp anna@workos.pl anna123 >/dev/null;    chk "EMPLOYEE login" EMPLOYEE "$(role emp)"

echo "== RBAC / izolacja =="
chk "EMP /owner -> 307" 307 "$(code emp /owner)"
chk "EMP GET /api/users -> 403" 403 "$(code emp /api/users)"
chk "EMP GET /api/analytics -> 403" 403 "$(code emp /api/analytics)"
chk "EMP POST /api/locations -> 403" 403 "$(pcode emp POST /api/locations '{"name":"x"}')"
chk "OWNER GET /api/analytics -> 200" 200 "$(code owner /api/analytics)"
chk "OWNER GET /api/locations -> 200" 200 "$(code owner /api/locations)"

echo "== Strony OWNER (brak placeholderów) =="
for p in /owner /owner/coo /owner/analytics /owner/warehouse /owner/invoices /owner/recipes /owner/schedule /owner/locations /owner/employees /owner/tasks /owner/vacations /owner/waste /owner/incidents; do
  chk "OWNER $p -> 200" 200 "$(code owner $p)"
done

echo "== Strony EMPLOYEE =="
for p in /dashboard /schedule /time /checklists /production /inventory /messages /performance /tasks /waste /incidents /vacation /assistant; do
  chk "EMP $p -> 200" 200 "$(code emp $p)"
done

echo ""
echo "WYNIK: $pass PASS / $fail FAIL"
rm -rf "$JAR_DIR"
[ "$fail" -eq 0 ]
