import path from "path";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/utils/logger";
import { getBackupConfig } from "./config";
import { decryptBuffer, encryptBuffer, gunzipBuffer, gzipBuffer, sha256Hex } from "./crypto";
import {
  createDriveClient,
  createDriveFolder,
  deleteDriveItem,
  downloadDriveFile,
  ensureDriveFolderPath,
  findDriveChild,
  listDriveChildren,
  updateDriveFile,
  uploadToDrive,
} from "./drive-client";
import type {
  BackupChecksumsFile,
  BackupManifest,
  BackupResult,
  BackupStatus,
  BackupStorageArtifact,
  BackupStorageBucketManifest,
  BackupTableArtifact,
} from "./types";
import {
  BACKUP_CHECKSUMS_FILE,
  BACKUP_DATABASE_DIR,
  BACKUP_FOLDER_PREFIX,
  BACKUP_MANIFEST_FILE,
  BACKUP_STORAGE_DIR,
  STUDENT_TABLES,
} from "./types";

interface BackupFolderCandidate {
  id: string;
  name: string;
  createdAt: Date;
  status: BackupStatus;
}

interface UploadedArtifact {
  fileId: string;
  artifactPath: string;
  sha256: string;
  sizeBytes: number;
}

export async function runBackup(): Promise<BackupResult> {
  const config = await getBackupConfig();
  const supabase = createAdminClient();
  const drive = createDriveClient(config.googleServiceAccountKey);
  const backupId = buildBackupId();
  const startedAt = new Date().toISOString();

  let manifestFileId: string | null = null;
  let folderId: string | null = null;
  let driveFolderUrl = "";
  let manifest = createManifest({
    backupId,
    startedAt,
    appVersion: config.appVersion,
    schemaVersion: config.schemaVersion,
    driveFolderUrl,
    status: "started",
  });
  const checksums: BackupChecksumsFile = {
    backupId,
    generatedAt: startedAt,
    items: [],
  };

  try {
    folderId = await createDriveFolder(drive, backupId, config.parentFolderId);
    driveFolderUrl = `https://drive.google.com/drive/folders/${folderId}`;
    const databaseFolderId = await ensureDriveFolderPath(drive, folderId, [BACKUP_DATABASE_DIR]);
    const storageFolderId = await ensureDriveFolderPath(drive, folderId, [BACKUP_STORAGE_DIR]);

    manifest.driveFolderUrl = driveFolderUrl;
    manifestFileId = await uploadManifest(drive, folderId, manifest);

    for (const table of config.tables) {
      const artifact = await exportTableArtifact({
        drive,
        supabase,
        parentFolderId: databaseFolderId,
        table,
        masterKey: config.masterKey,
      });

      checksums.items.push({
        path: artifact.artifactPath,
        sha256: artifact.sha256,
        sizeBytes: artifact.encryptedSizeBytes,
      });
      manifest.database.tables.push(artifact);
      manifest.totals.tablesExported += 1;
      manifest.totals.rowsExported += artifact.rowCount;
      manifest.totals.bytesUploaded += artifact.encryptedSizeBytes;
    }

    for (const bucket of config.storageBuckets) {
      const bucketManifest = await exportStorageBucket({
        drive,
        supabase,
        parentFolderId: storageFolderId,
        bucket,
        masterKey: config.masterKey,
      });

      for (const file of bucketManifest.files) {
        checksums.items.push({
          path: file.artifactPath,
          sha256: file.sha256,
          sizeBytes: file.encryptedSizeBytes,
        });
        manifest.totals.filesExported += 1;
        manifest.totals.bytesUploaded += file.encryptedSizeBytes;
      }

      manifest.storage.buckets.push(bucketManifest);
    }

    checksums.generatedAt = new Date().toISOString();
    const checksumsBuffer = Buffer.from(JSON.stringify(checksums, null, 2), "utf8");
    const uploadedChecksums = await uploadArtifactBuffer({
      drive,
      parentFolderId: folderId,
      fileName: BACKUP_CHECKSUMS_FILE,
      artifactPath: BACKUP_CHECKSUMS_FILE,
      content: checksumsBuffer,
      mimeType: "application/json",
    });
    manifest.totals.bytesUploaded += uploadedChecksums.sizeBytes;

    manifest = finalizeManifest(manifest, undefined);
    const finalManifestBuffer = Buffer.from(JSON.stringify(manifest, null, 2), "utf8");
    const manifestHash = sha256Hex(finalManifestBuffer);

    if (!manifestFileId) {
      throw new Error("Manifest file was not created");
    }

    await updateDriveFile(drive, manifestFileId, finalManifestBuffer, "application/json");
    await verifyDriveHash(drive, manifestFileId, manifestHash, BACKUP_MANIFEST_FILE);

    await pruneExpiredBackups(
      drive,
      config.parentFolderId,
      config.retentionDays,
      config.retentionMonths,
      folderId
    );

    return {
      backupId,
      status: manifest.status,
      driveFolderUrl,
      manifestHash,
      tablesExported: manifest.totals.tablesExported,
      filesExported: manifest.totals.filesExported,
      bytesUploaded: manifest.totals.bytesUploaded,
      startedAt,
      completedAt: manifest.completedAt ?? startedAt,
    };
  } catch (error) {
    logger.error("Backup execution failed", error, {
      context: "BACKUP",
      forceProduction: true,
    });

    manifest = finalizeManifest(
      manifest,
      error instanceof Error ? error.message : "Unknown backup error",
      "failed"
    );

    if (folderId) {
      const failedBuffer = Buffer.from(JSON.stringify(manifest, null, 2), "utf8");
      try {
        if (manifestFileId) {
          await updateDriveFile(drive, manifestFileId, failedBuffer, "application/json");
        } else {
          await uploadToDrive(drive, BACKUP_MANIFEST_FILE, failedBuffer, "application/json", folderId);
        }
      } catch (manifestError) {
        logger.error("Failed to persist failed manifest", manifestError, {
          context: "BACKUP",
          forceProduction: true,
        });
      }
    }

    throw error;
  }
}

export async function listStorageFilesRecursively(
  supabase: SupabaseClient<any, any, any>,
  bucket: string,
  folder: string = ""
): Promise<string[]> {
  const { data, error } = await supabase.storage.from(bucket).list(folder, {
    limit: 1000,
    offset: 0,
  });

  if (error) {
    throw new Error(`Failed to list ${bucket}/${folder}: ${error.message}`);
  }
  if (!data || data.length === 0) {
    return [];
  }

  const paths: string[] = [];
  for (const item of data) {
    const itemPath = folder ? `${folder}/${item.name}` : item.name;
    if (item.id === null) {
      paths.push(...(await listStorageFilesRecursively(supabase, bucket, itemPath)));
    } else {
      paths.push(itemPath);
    }
  }

  return paths;
}

export function buildBackupId(date: Date = new Date()): string {
  const pad = (value: number) => String(value).padStart(2, "0");
  return (
    `${BACKUP_FOLDER_PREFIX}${date.getUTCFullYear()}` +
    `${pad(date.getUTCMonth() + 1)}${pad(date.getUTCDate())}_` +
    `${pad(date.getUTCHours())}${pad(date.getUTCMinutes())}${pad(date.getUTCSeconds())}`
  );
}

export function serializeRowsToNdjson(rows: unknown[]): Buffer {
  const lines = rows.map((row) => JSON.stringify(row)).join("\n");
  return Buffer.from(lines.length > 0 ? `${lines}\n` : "", "utf8");
}

export function selectBackupFoldersForDeletion(
  backups: BackupFolderCandidate[],
  retentionDays: number,
  retentionMonths: number
): string[] {
  const sorted = [...backups].sort(
    (left, right) => right.createdAt.getTime() - left.createdAt.getTime()
  );
  const keepIds = new Set<string>();
  const seenDays = new Set<string>();
  const seenMonths = new Set<string>();

  for (const backup of sorted) {
    const dayKey = backup.createdAt.toISOString().slice(0, 10);
    if (seenDays.size < retentionDays && !seenDays.has(dayKey)) {
      seenDays.add(dayKey);
      keepIds.add(backup.id);
    }

    const monthKey = backup.createdAt.toISOString().slice(0, 7);
    if (seenMonths.size < retentionMonths && !seenMonths.has(monthKey)) {
      seenMonths.add(monthKey);
      keepIds.add(backup.id);
    }
  }

  return sorted.filter((backup) => !keepIds.has(backup.id)).map((backup) => backup.id);
}

export async function loadBackupManifest(
  folderId: string,
  driveClient?: ReturnType<typeof createDriveClient>
): Promise<BackupManifest | null> {
  const drive = driveClient || createDriveClient();
  const manifestFile = await findDriveChild(drive, folderId, BACKUP_MANIFEST_FILE);
  if (!manifestFile?.id) {
    return null;
  }

  const buffer = await downloadDriveFile(drive, manifestFile.id);
  return JSON.parse(buffer.toString("utf8")) as BackupManifest;
}

async function exportTableArtifact({
  drive,
  supabase,
  parentFolderId,
  table,
  masterKey,
}: {
  drive: ReturnType<typeof createDriveClient>;
  supabase: SupabaseClient<any, any, any>;
  parentFolderId: string;
  table: string;
  masterKey: Buffer;
}): Promise<BackupTableArtifact> {
  const { data, error } = await supabase.from(table).select("*");
  if (error) {
    throw new Error(`Failed to export ${table}: ${error.message}`);
  }

  const rows = data ?? [];
  const ndjson = serializeRowsToNdjson(rows);
  const encrypted = encryptBuffer(gzipBuffer(ndjson), masterKey);
  const artifactPath = path.posix.join(BACKUP_DATABASE_DIR, `${table}.ndjson.gz.enc`);

  const uploaded = await uploadArtifactBuffer({
    drive,
    parentFolderId,
    fileName: `${table}.ndjson.gz.enc`,
    artifactPath,
    content: encrypted,
    mimeType: "application/octet-stream",
  });

  return {
    tableName: table as BackupTableArtifact["tableName"],
    artifactPath,
    rowCount: rows.length,
    encryptedSizeBytes: uploaded.sizeBytes,
    sha256: uploaded.sha256,
  };
}

async function exportStorageBucket({
  drive,
  supabase,
  parentFolderId,
  bucket,
  masterKey,
}: {
  drive: ReturnType<typeof createDriveClient>;
  supabase: SupabaseClient<any, any, any>;
  parentFolderId: string;
  bucket: string;
  masterKey: Buffer;
}): Promise<BackupStorageBucketManifest> {
  const files = await listStorageFilesRecursively(supabase, bucket);
  const bucketManifest: BackupStorageBucketManifest = {
    bucketName: bucket as BackupStorageBucketManifest["bucketName"],
    fileCount: 0,
    files: [],
  };

  for (const filePath of files) {
    const file = await exportStorageFile({
      drive,
      supabase,
      parentFolderId,
      bucket,
      filePath,
      masterKey,
    });
    bucketManifest.files.push(file);
    bucketManifest.fileCount += 1;
  }

  return bucketManifest;
}

async function exportStorageFile({
  drive,
  supabase,
  parentFolderId,
  bucket,
  filePath,
  masterKey,
}: {
  drive: ReturnType<typeof createDriveClient>;
  supabase: SupabaseClient<any, any, any>;
  parentFolderId: string;
  bucket: string;
  filePath: string;
  masterKey: Buffer;
}): Promise<BackupStorageArtifact> {
  const { data, error } = await supabase.storage.from(bucket).download(filePath);
  if (error || !data) {
    throw new Error(`Failed to download ${bucket}/${filePath}: ${error?.message ?? "missing blob"}`);
  }

  const sourceBuffer = Buffer.from(await data.arrayBuffer());
  const contentType = data.type || "application/octet-stream";
  const encrypted = encryptBuffer(gzipBuffer(sourceBuffer), masterKey);

  const directorySegments = filePath.split("/").slice(0, -1);
  const fileName = `${path.posix.basename(filePath)}.gz.enc`;
  const finalParentId = await ensureDriveFolderPath(
    drive,
    parentFolderId,
    [bucket, ...directorySegments]
  );
  const artifactPath = path.posix.join(BACKUP_STORAGE_DIR, bucket, ...directorySegments, fileName);
  const uploaded = await uploadArtifactBuffer({
    drive,
    parentFolderId: finalParentId,
    fileName,
    artifactPath,
    content: encrypted,
    mimeType: "application/octet-stream",
  });

  return {
    bucketName: bucket as BackupStorageArtifact["bucketName"],
    originalPath: filePath,
    artifactPath,
    contentType,
    encryptedSizeBytes: uploaded.sizeBytes,
    sha256: uploaded.sha256,
  };
}

async function uploadArtifactBuffer({
  drive,
  parentFolderId,
  fileName,
  artifactPath,
  content,
  mimeType,
}: {
  drive: ReturnType<typeof createDriveClient>;
  parentFolderId: string;
  fileName: string;
  artifactPath: string;
  content: Buffer;
  mimeType: string;
}): Promise<UploadedArtifact> {
  const sha256 = sha256Hex(content);
  const upload = await uploadToDrive(drive, fileName, content, mimeType, parentFolderId);
  await verifyDriveHash(drive, upload.id, sha256, artifactPath);

  return {
    fileId: upload.id,
    artifactPath,
    sha256,
    sizeBytes: content.length,
  };
}

async function uploadManifest(
  drive: ReturnType<typeof createDriveClient>,
  parentFolderId: string,
  manifest: BackupManifest
): Promise<string> {
  const result = await uploadToDrive(
    drive,
    BACKUP_MANIFEST_FILE,
    Buffer.from(JSON.stringify(manifest, null, 2), "utf8"),
    "application/json",
    parentFolderId
  );

  return result.id;
}

async function verifyDriveHash(
  drive: ReturnType<typeof createDriveClient>,
  fileId: string,
  expectedSha256: string,
  label: string
) {
  const uploaded = await downloadDriveFile(drive, fileId);
  const uploadedHash = sha256Hex(uploaded);

  if (uploadedHash !== expectedSha256) {
    throw new Error(`Checksum mismatch after upload for ${label}`);
  }
}

function createManifest({
  backupId,
  startedAt,
  appVersion,
  schemaVersion,
  driveFolderUrl,
  status,
}: {
  backupId: string;
  startedAt: string;
  appVersion: string;
  schemaVersion: string;
  driveFolderUrl: string;
  status: BackupStatus;
}): BackupManifest {
  return {
    version: 1,
    backupId,
    status,
    createdAt: startedAt,
    startedAt,
    appVersion,
    schemaVersion,
    driveFolderUrl,
    checksumsFile: BACKUP_CHECKSUMS_FILE,
    encryption: {
      algorithm: "aes-256-gcm",
      keyEnv: "BACKUP_MASTER_KEY_BASE64",
    },
    database: {
      tables: [],
    },
    storage: {
      buckets: [],
    },
    totals: {
      tablesExported: 0,
      filesExported: 0,
      rowsExported: 0,
      bytesUploaded: 0,
    },
  };
}

function finalizeManifest(
  manifest: BackupManifest,
  error?: string,
  status: BackupStatus = "completed"
): BackupManifest {
  const completedAt = new Date().toISOString();

  return {
    ...manifest,
    status,
    completedAt,
    durationMs: new Date(completedAt).getTime() - new Date(manifest.startedAt).getTime(),
    error,
  };
}

async function pruneExpiredBackups(
  drive: ReturnType<typeof createDriveClient>,
  parentFolderId: string,
  retentionDays: number,
  retentionMonths: number,
  currentFolderId: string
) {
  const children = await listDriveChildren(drive, parentFolderId);
  const folders = children.filter(
    (child) =>
      child.mimeType === "application/vnd.google-apps.folder" &&
      child.name.startsWith(BACKUP_FOLDER_PREFIX)
  );

  const candidates: BackupFolderCandidate[] = [];
  for (const folder of folders) {
    const createdAt = parseBackupIdDate(folder.name);
    if (!createdAt) {
      continue;
    }

    const manifest = await loadManifestFromDrive(drive, folder.id);
    candidates.push({
      id: folder.id,
      name: folder.name,
      createdAt,
      status: manifest?.status ?? "failed",
    });
  }

  const completed = candidates.filter(
    (candidate) => candidate.status === "completed" && candidate.id !== currentFolderId
  );
  if (completed.length === 0) {
    return;
  }

  const deletableCompleted = selectBackupFoldersForDeletion(
    completed,
    retentionDays,
    retentionMonths
  );

  const failedCutoff = Date.now() - retentionDays * 24 * 60 * 60 * 1000;
  const failedFolders = candidates
    .filter(
      (candidate) =>
        candidate.id !== currentFolderId &&
        candidate.status !== "completed" &&
        candidate.createdAt.getTime() < failedCutoff
    )
    .map((candidate) => candidate.id);

  for (const folderId of [...deletableCompleted, ...failedFolders]) {
    await deleteDriveItem(drive, folderId);
  }
}

async function loadManifestFromDrive(
  drive: ReturnType<typeof createDriveClient>,
  folderId: string
): Promise<BackupManifest | null> {
  const manifestFile = await findDriveChild(drive, folderId, BACKUP_MANIFEST_FILE);
  if (!manifestFile?.id) {
    return null;
  }

  const buffer = await downloadDriveFile(drive, manifestFile.id);
  return JSON.parse(buffer.toString("utf8")) as BackupManifest;
}

function parseBackupIdDate(backupId: string): Date | null {
  const match = /^backup_(\d{4})(\d{2})(\d{2})_(\d{2})(\d{2})(\d{2})$/.exec(backupId);
  if (!match) {
    return null;
  }

  return new Date(
    Date.UTC(
      Number(match[1]),
      Number(match[2]) - 1,
      Number(match[3]),
      Number(match[4]),
      Number(match[5]),
      Number(match[6])
    )
  );
}

export async function decodeEncryptedBackupBlob(
  encrypted: Buffer,
  masterKey: Buffer
): Promise<Buffer> {
  return gunzipBuffer(decryptBuffer(encrypted, masterKey));
}

export const backupTables = STUDENT_TABLES;
