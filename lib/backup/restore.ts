import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/utils/logger";
import { getBackupConfig } from "./config";
import { decodeEncryptedBackupBlob, loadBackupManifest } from "./backup";
import { sha256Hex } from "./crypto";
import {
  createDriveClient,
  downloadDriveFile,
  findDriveChild,
  listDriveChildren,
} from "./drive-client";
import type {
  BackupChecksumsFile,
  BackupManifest,
  BackupStorageArtifact,
  BackupTableArtifact,
  RestoreOptions,
  RestoreResult,
} from "./types";
import {
  BACKUP_CHECKSUMS_FILE,
  BACKUP_FOLDER_PREFIX,
  STUDENT_TABLES,
} from "./types";

export async function restoreBackup(options: RestoreOptions = {}): Promise<RestoreResult> {
  const config = await getBackupConfig();
  const drive = createDriveClient(config.googleServiceAccountKey);
  const supabase = createAdminClient();
  const folder = await resolveBackupFolder(drive, config.parentFolderId, options.backupId);

  const manifest = await loadBackupManifest(folder.id, drive);
  if (!manifest) {
    throw new Error(`manifest.json not found for ${folder.name}`);
  }
  if (manifest.status !== "completed") {
    throw new Error(`Backup ${manifest.backupId} is not completed`);
  }

  const checksums = await loadChecksums(drive, folder.id);
  const validation = await validateBackupArtifacts(drive, folder.id, manifest, checksums, config.masterKey);

  const shouldApply = options.apply === true;
  const restoreDatabase = options.restoreDatabase !== false;
  const restoreStorage = options.restoreStorage !== false;

  let restoredTables = 0;
  let restoredFiles = 0;

  if (shouldApply && restoreDatabase) {
    for (const tableName of STUDENT_TABLES) {
      const table = manifest.database.tables.find((item) => item.tableName === tableName);
      if (!table) {
        continue;
      }

      const rows = await readTableRows(drive, folder.id, table, config.masterKey);
      if (rows.length === 0) {
        restoredTables += 1;
        continue;
      }

      await upsertRows(supabase, table.tableName, rows);
      restoredTables += 1;
    }
  }

  if (shouldApply && restoreStorage) {
    for (const bucket of manifest.storage.buckets) {
      for (const file of bucket.files) {
        const content = await readStorageFile(drive, folder.id, file, config.masterKey);
        await supabase.storage.from(file.bucketName).upload(file.originalPath, content, {
          upsert: true,
          contentType: file.contentType,
        });
        restoredFiles += 1;
      }
    }
  }

  logger.info("Backup restore finished", {
    backupId: manifest.backupId,
    mode: shouldApply ? "apply" : "dry-run",
    validatedArtifacts: validation.validatedArtifacts,
    restoredTables,
    restoredFiles,
  }, { context: "BACKUP", forceProduction: true });

  return {
    backupId: manifest.backupId,
    mode: shouldApply ? "apply" : "dry-run",
    validatedArtifacts: validation.validatedArtifacts,
    restoredTables,
    restoredFiles,
  };
}

export async function validateLatestBackup(): Promise<RestoreResult> {
  return restoreBackup({ apply: false });
}

async function resolveBackupFolder(
  drive: ReturnType<typeof createDriveClient>,
  parentFolderId: string,
  requestedBackupId?: string
) {
  const children = await listDriveChildren(drive, parentFolderId);
  const folders = children
    .filter(
      (child) =>
        child.mimeType === "application/vnd.google-apps.folder" &&
        child.name.startsWith(BACKUP_FOLDER_PREFIX)
    )
    .sort((left, right) => right.name.localeCompare(left.name));

  if (requestedBackupId) {
    const match = folders.find((folder) => folder.name === requestedBackupId);
    if (!match) {
      throw new Error(`Backup folder not found: ${requestedBackupId}`);
    }
    return match;
  }

  for (const folder of folders) {
    const manifest = await loadBackupManifest(folder.id, drive);
    if (manifest?.status === "completed") {
      return folder;
    }
  }

  throw new Error("No completed backup folder found");
}

async function loadChecksums(
  drive: ReturnType<typeof createDriveClient>,
  folderId: string
): Promise<BackupChecksumsFile> {
  const file = await findDriveChild(drive, folderId, BACKUP_CHECKSUMS_FILE);
  if (!file?.id) {
    throw new Error(`checksums.json not found in folder ${folderId}`);
  }

  const buffer = await downloadDriveFile(drive, file.id);
  return JSON.parse(buffer.toString("utf8")) as BackupChecksumsFile;
}

async function validateBackupArtifacts(
  drive: ReturnType<typeof createDriveClient>,
  folderId: string,
  manifest: BackupManifest,
  checksums: BackupChecksumsFile,
  masterKey: Buffer
) {
  let validatedArtifacts = 0;

  for (const table of manifest.database.tables) {
    const content = await validateAndReadArtifactByPath(
      drive,
      folderId,
      table.artifactPath,
      masterKey,
      checksums,
      table.sha256
    );
    const actualRows = parseNdjson(content).length;
    if (actualRows !== table.rowCount) {
      throw new Error(`Row count mismatch for ${table.tableName}`);
    }
    validatedArtifacts += 1;
  }

  for (const bucket of manifest.storage.buckets) {
    for (const file of bucket.files) {
      await validateAndReadArtifactByPath(
        drive,
        folderId,
        file.artifactPath,
        masterKey,
        checksums,
        file.sha256
      );
      validatedArtifacts += 1;
    }
  }

  return { validatedArtifacts };
}

async function readTableRows(
  drive: ReturnType<typeof createDriveClient>,
  folderId: string,
  table: BackupTableArtifact,
  masterKey: Buffer
) {
  const buffer = await readArtifactByPath(drive, folderId, table.artifactPath, masterKey);
  return parseNdjson(buffer);
}

async function readStorageFile(
  drive: ReturnType<typeof createDriveClient>,
  folderId: string,
  file: BackupStorageArtifact,
  masterKey: Buffer
) {
  return readArtifactByPath(drive, folderId, file.artifactPath, masterKey);
}

async function readArtifactByPath(
  drive: ReturnType<typeof createDriveClient>,
  folderId: string,
  artifactPath: string,
  masterKey: Buffer
) {
  const file = await resolveArtifactFile(drive, folderId, artifactPath);
  const encrypted = await downloadDriveFile(drive, file.id);
  return decodeEncryptedBackupBlob(encrypted, masterKey);
}

async function validateAndReadArtifactByPath(
  drive: ReturnType<typeof createDriveClient>,
  folderId: string,
  artifactPath: string,
  masterKey: Buffer,
  checksums: BackupChecksumsFile,
  expectedSha256: string
) {
  const file = await resolveArtifactFile(drive, folderId, artifactPath);
  const encrypted = await downloadDriveFile(drive, file.id);
  const actualSha256 = sha256Hex(encrypted);

  assertChecksum(checksums, artifactPath, expectedSha256, actualSha256);
  return decodeEncryptedBackupBlob(encrypted, masterKey);
}

async function resolveArtifactFile(
  drive: ReturnType<typeof createDriveClient>,
  folderId: string,
  artifactPath: string
) {
  const segments = artifactPath.split("/").filter(Boolean);
  const fileName = segments.pop();
  if (!fileName) {
    throw new Error(`Invalid artifact path: ${artifactPath}`);
  }

  let currentParent = folderId;
  for (const segment of segments) {
    const child = await findDriveChild(drive, currentParent, segment);
    if (!child?.id) {
      throw new Error(`Artifact directory not found: ${artifactPath}`);
    }
    currentParent = child.id;
  }

  const file = await findDriveChild(drive, currentParent, fileName);
  if (!file?.id) {
    throw new Error(`Artifact file not found: ${artifactPath}`);
  }

  return file;
}

function assertChecksum(
  checksums: BackupChecksumsFile,
  artifactPath: string,
  expectedSha256: string,
  actualSha256: string
) {
  const entry = checksums.items.find((item) => item.path === artifactPath);
  if (!entry) {
    throw new Error(`Missing checksum entry for ${artifactPath}`);
  }

  if (entry.sha256 !== expectedSha256) {
    throw new Error(`Checksum metadata mismatch for ${artifactPath}`);
  }

  if (actualSha256 !== expectedSha256) {
    throw new Error(`Checksum validation failed for ${artifactPath}`);
  }
}

function parseNdjson(buffer: Buffer) {
  const raw = buffer.toString("utf8").trim();
  if (!raw) {
    return [];
  }

  return raw.split("\n").filter(Boolean).map((line) => JSON.parse(line));
}

async function upsertRows(
  supabase: SupabaseClient<any, any, any>,
  tableName: string,
  rows: Record<string, unknown>[]
) {
  const chunkSize = 200;

  for (let index = 0; index < rows.length; index += chunkSize) {
    const chunk = rows.slice(index, index + chunkSize);
    const { error } = await supabase.from(tableName).upsert(chunk);
    if (error) {
      throw new Error(`Failed to restore ${tableName}: ${error.message}`);
    }
  }
}

export function parseRestoreArgs(argv: string[]) {
  const args = new Set(argv);
  const backupIdIndex = argv.findIndex((arg) => arg === "--backup-id");
  const backupId =
    backupIdIndex >= 0 && backupIdIndex + 1 < argv.length
      ? argv[backupIdIndex + 1]
      : undefined;

  return {
    backupId,
    apply: args.has("--apply"),
    restoreDatabase: !args.has("--skip-db"),
    restoreStorage: !args.has("--skip-storage"),
  } satisfies RestoreOptions;
}
