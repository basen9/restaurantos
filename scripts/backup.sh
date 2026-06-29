#!/usr/bin/env bash
# Backup bazy PostgreSQL (pg_dump). Użycie: DATABASE_URL=... ./scripts/backup.sh [katalog]
set -euo pipefail
OUT_DIR="${1:-./backups}"
mkdir -p "$OUT_DIR"
TS="$(date +%Y%m%d_%H%M%S)"
FILE="$OUT_DIR/workos_${TS}.dump"
: "${DATABASE_URL:?Ustaw DATABASE_URL}"
echo "→ pg_dump → $FILE"
pg_dump --format=custom --no-owner --no-privileges --dbname "$DATABASE_URL" --file "$FILE"
echo "✓ Backup gotowy: $FILE"
# Retencja: zostaw 14 ostatnich
ls -1t "$OUT_DIR"/workos_*.dump 2>/dev/null | tail -n +15 | xargs -r rm -f
echo "✓ Retencja: zachowano 14 ostatnich backupów"
