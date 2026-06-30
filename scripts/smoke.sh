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

echo "== Publiczne menu QR (bez logowania) =="
chk "GET /api/public/menu/krakow-bakery" 200 "$(curl -s -o /dev/null -w '%{http_code}' "$B/api/public/menu/krakow-bakery")"
chk "GET /m/krakow-bakery (publiczne)" 200 "$(curl -s -o /dev/null -w '%{http_code}' "$B/m/krakow-bakery")"
chk "GET /api/public/menu/nieistnieje -> 404" 404 "$(curl -s -o /dev/null -w '%{http_code}' "$B/api/public/menu/nieistnieje")"

echo "== PWA =="
chk "GET /manifest.webmanifest" 200 "$(curl -s -o /dev/null -w '%{http_code}' "$B/manifest.webmanifest")"
chk "GET /sw.js" 200 "$(curl -s -o /dev/null -w '%{http_code}' "$B/sw.js")"
chk "GET /offline.html" 200 "$(curl -s -o /dev/null -w '%{http_code}' "$B/offline.html")"
chk "GET /icon-192.png" 200 "$(curl -s -o /dev/null -w '%{http_code}' "$B/icon-192.png")"

echo "== Logowanie =="
login owner owner@workos.pl owner123 >/dev/null; chk "OWNER login" OWNER "$(role owner)"
login emp anna@workos.pl anna123 >/dev/null;    chk "EMPLOYEE login" EMPLOYEE "$(role emp)"

echo "== RBAC / izolacja =="
chk "EMP /owner -> 307" 307 "$(code emp /owner)"
chk "EMP GET /api/users -> 403" 403 "$(code emp /api/users)"
chk "EMP GET /api/analytics -> 403" 403 "$(code emp /api/analytics)"
chk "EMP POST /api/locations -> 403" 403 "$(pcode emp POST /api/locations '{"name":"x"}')"
chk "EMP POST /api/zones -> 403" 403 "$(pcode emp POST /api/zones '{"name":"x"}')"
chk "EMP GET /api/floor -> 200" 200 "$(code emp /api/floor)"
chk "EMP close rachunku -> 403" 403 "$(pcode emp POST /api/orders/nieistnieje/close '{}')"
chk "EMP POST /api/products -> 403" 403 "$(pcode emp POST /api/products '{"name":"x","category":"y"}')"
chk "EMP GET /api/cash -> 403" 403 "$(code emp /api/cash)"
chk "OWNER GET /api/cash -> 200" 200 "$(code owner /api/cash)"
chk "EMP GET /api/reports/payroll -> 403" 403 "$(code emp /api/reports/payroll)"
chk "OWNER GET /api/reports/payroll -> 200" 200 "$(code owner /api/reports/payroll)"
chk "EMP GET /api/reports/servers -> 403" 403 "$(code emp /api/reports/servers)"
chk "OWNER GET /api/reports/servers -> 200" 200 "$(code owner /api/reports/servers)"
chk "EMP storno bez uprawnień -> 403" 403 "$(pcode emp POST /api/order-items/x/void '{"reason":"test"}')"
chk "EMP POST /api/reservations -> 403" 403 "$(pcode emp POST /api/reservations '{"guestName":"x","startsAt":"2026-07-01T18:00:00"}')"
chk "OWNER GET /api/reservations -> 200" 200 "$(code owner /api/reservations)"
chk "EMP GET /api/guests -> 200" 200 "$(code emp /api/guests)"
chk "EMP DELETE guest -> 403" 403 "$(pcode emp DELETE /api/guests/x '{}')"
chk "EMP GET /api/settings -> 200" 200 "$(code emp /api/settings)"
chk "EMP PATCH /api/settings -> 403" 403 "$(pcode emp PATCH /api/settings '{"currency":"USD"}')"
chk "OWNER GET /api/analytics -> 200" 200 "$(code owner /api/analytics)"
chk "OWNER GET /api/locations -> 200" 200 "$(code owner /api/locations)"
chk "OWNER GET /api/floor -> 200" 200 "$(code owner /api/floor)"

echo "== Strony OWNER (brak placeholderów) =="
for p in /owner /owner/coo /owner/alerts /owner/analytics /owner/insights /owner/payroll /owner/floor /owner/reservations /owner/menu /owner/cash /owner/warehouse /owner/invoices /owner/recipes /owner/schedule /owner/locations /owner/reports /owner/employees /owner/guests /owner/tasks /owner/vacations /owner/waste /owner/incidents /owner/settings; do
  chk "OWNER $p -> 200" 200 "$(code owner $p)"
done

echo "== Strony EMPLOYEE =="
for p in /dashboard /floor /kds /schedule /time /availability /sop /recipes /checklists /production /inventory /messages /performance /tasks /waste /incidents /vacation /assistant; do
  chk "EMP $p -> 200" 200 "$(code emp $p)"
done

echo ""
echo "WYNIK: $pass PASS / $fail FAIL"
rm -rf "$JAR_DIR"
[ "$fail" -eq 0 ]
