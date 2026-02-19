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

import * as fs from "fs";
import * as path from "path";
import { runBackup } from "../lib/backup/backup";

async function main() {
  const pgDumpPath = process.argv[2];

  let extraFiles: Record<string, Buffer> | undefined;
  if (pgDumpPath) {
    if (!fs.existsSync(pgDumpPath)) {
      console.error(`pg_dump file not found: ${pgDumpPath}`);
      process.exit(1);
    }
    extraFiles = {
      [path.basename(pgDumpPath)]: fs.readFileSync(pgDumpPath),
    };
    console.log(`  Including pg_dump: ${path.basename(pgDumpPath)}`);
  }

  const result = await runBackup(extraFiles);

  console.log(`Backup ID:       ${result.backupId}`);
  console.log(`Drive folder:    ${result.driveFolderUrl}`);
  console.log(`Tables:          ${result.tablesExported}`);
  console.log(`Storage files:   ${result.storageFilesExported}`);
}

main().catch((err) => {
  console.error("Backup failed:", err.message);
  process.exit(1);
});
