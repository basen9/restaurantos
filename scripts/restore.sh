#!/usr/bin/env bash
# Restore bazy z backupu pg_dump. Użycie: DATABASE_URL=... ./scripts/restore.sh <plik.dump>
set -euo pipefail
FILE="${1:?Podaj plik .dump}"
: "${DATABASE_URL:?Ustaw DATABASE_URL}"
echo "→ pg_restore z $FILE (clean + if-exists)"
pg_restore --clean --if-exists --no-owner --no-privileges --dbname "$DATABASE_URL" "$FILE"
echo "✓ Restore zakończony"
