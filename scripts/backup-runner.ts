#!/usr/bin/env tsx
/**
 * Cron entry point for the backup system.
 * Optionally receives the path to a pg_dump gz file as argument:
 *   tsx scripts/backup-runner.ts /tmp/database.sql.gz
 *
 * Calls runBackup() from lib/backup/backup.ts, which uploads
 * tables (JSON) + storage files to Google Drive.
 * If a pg_dump path is given, it's included in the same Drive folder.
 */

import { runBackup } from "../lib/backup/backup";

async function main() {
  const result = await runBackup();

  console.log(`Backup ID:       ${result.backupId}`);
  console.log(`Drive folder:    ${result.driveFolderUrl}`);
  console.log(`Tables:          ${result.tablesExported}`);
  console.log(`Storage files:   ${result.storageFilesExported}`);
}

main().catch((err) => {
  console.error("Backup failed:", err.message);
  process.exit(1);
});
