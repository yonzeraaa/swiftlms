#!/usr/bin/env bash
# Backup SwiftLMS: exporta dados dos alunos para Google Drive
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
echo "=== SwiftLMS Backup: $DATE ==="

npx tsx "$SCRIPT_DIR/backup-runner.ts"

echo "=== ✓ Backup complete: $DATE ==="
