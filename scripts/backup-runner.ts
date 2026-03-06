#!/usr/bin/env tsx

import { runBackup } from "../lib/backup/backup";

async function main() {
  const result = await runBackup();

  console.log(`Backup ID:       ${result.backupId}`);
  console.log(`Status:          ${result.status}`);
  console.log(`Drive folder:    ${result.driveFolderUrl}`);
  console.log(`Manifest hash:   ${result.manifestHash}`);
  console.log(`Tables:          ${result.tablesExported}`);
  console.log(`Files:           ${result.filesExported}`);
  console.log(`Bytes uploaded:  ${result.bytesUploaded}`);
}

main().catch((error) => {
  console.error("Backup failed:", error.message);
  process.exit(1);
});
