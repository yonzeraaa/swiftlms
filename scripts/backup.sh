#!/usr/bin/env bash
# Backup SwiftLMS: PostgreSQL dump + Supabase Storage → Google Drive
# Schedule via cron: 0 2 * * * cd /home/y0n/swiftlms && bash scripts/backup.sh >> /var/log/swiftlms-backup.log 2>&1

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="$SCRIPT_DIR/../.env.backup"
if [[ -f "$ENV_FILE" ]]; then
  # shellcheck source=/dev/null
  set -a
  source "$ENV_FILE"
  set +a
fi

DATE="$(date +%Y%m%d_%H%M%S)"
DUMP_FILE="/tmp/swiftlms-db-$DATE.sql.gz"
DATABASE_URL="${DATABASE_URL:?DATABASE_URL is required}"

echo "=== SwiftLMS Backup: $DATE ==="

# 1. Full PostgreSQL dump (only available locally — not on Vercel)
echo "[1/2] Dumping database..."
pg_dump "$DATABASE_URL" | gzip > "$DUMP_FILE"
echo "  ✓ database.sql.gz ($(du -sh "$DUMP_FILE" | cut -f1))"

# 2. Tables as JSON + Storage files + pg_dump → Google Drive
echo "[2/2] Uploading to Google Drive..."
npx tsx "$SCRIPT_DIR/backup-runner.ts" "$DUMP_FILE"

echo "=== ✓ Backup complete: $DATE ==="
rm -f "$DUMP_FILE"
