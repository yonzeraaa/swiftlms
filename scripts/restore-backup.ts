#!/usr/bin/env tsx

import { parseRestoreArgs, restoreBackup } from "../lib/backup/restore";

async function main() {
  const options = parseRestoreArgs(process.argv.slice(2));
  const result = await restoreBackup(options);

  console.log(`Backup ID:           ${result.backupId}`);
  console.log(`Mode:                ${result.mode}`);
  console.log(`Validated artifacts: ${result.validatedArtifacts}`);
  console.log(`Restored tables:     ${result.restoredTables}`);
  console.log(`Restored files:      ${result.restoredFiles}`);
}

main().catch((error) => {
  console.error("Restore failed:", error.message);
  process.exit(1);
});
