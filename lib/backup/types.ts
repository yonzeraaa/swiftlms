export const STUDENT_TABLES = [
  "profiles",
  "enrollments",
  "enrollment_modules",
  "lesson_progress",
  "test_attempts",
  "test_grades",
  "certificates",
  "certificate_requests",
  "tcc_submissions",
  "student_grade_overrides",
  "student_schedules",
  "activity_logs",
] as const;

export const STUDENT_STORAGE_BUCKETS = ["certificados", "avatars"] as const;

export const BACKUP_FOLDER_PREFIX = "backup_";
export const BACKUP_DATABASE_DIR = "database";
export const BACKUP_STORAGE_DIR = "storage";
export const BACKUP_MANIFEST_FILE = "manifest.json";
export const BACKUP_CHECKSUMS_FILE = "checksums.json";
export const BACKUP_MANIFEST_VERSION = 1;

export type StudentTable = (typeof STUDENT_TABLES)[number];
export type StudentStorageBucket = (typeof STUDENT_STORAGE_BUCKETS)[number];
export type BackupStatus = "started" | "completed" | "failed";

export interface BackupEncryptionMetadata {
  algorithm: "aes-256-gcm";
  keyEnv: "BACKUP_MASTER_KEY_BASE64";
}

export interface BackupTableArtifact {
  tableName: StudentTable;
  artifactPath: string;
  rowCount: number;
  encryptedSizeBytes: number;
  sha256: string;
}

export interface BackupStorageArtifact {
  bucketName: StudentStorageBucket;
  originalPath: string;
  artifactPath: string;
  contentType: string;
  encryptedSizeBytes: number;
  sha256: string;
}

export interface BackupStorageBucketManifest {
  bucketName: StudentStorageBucket;
  fileCount: number;
  files: BackupStorageArtifact[];
}

export interface BackupChecksumsEntry {
  path: string;
  sha256: string;
  sizeBytes: number;
}

export interface BackupChecksumsFile {
  backupId: string;
  generatedAt: string;
  items: BackupChecksumsEntry[];
}

export interface BackupManifest {
  version: number;
  backupId: string;
  status: BackupStatus;
  createdAt: string;
  startedAt: string;
  completedAt?: string;
  durationMs?: number;
  appVersion: string;
  schemaVersion: string;
  driveFolderUrl: string;
  checksumsFile: string;
  encryption: BackupEncryptionMetadata;
  database: {
    tables: BackupTableArtifact[];
  };
  storage: {
    buckets: BackupStorageBucketManifest[];
  };
  totals: {
    tablesExported: number;
    filesExported: number;
    rowsExported: number;
    bytesUploaded: number;
  };
  error?: string;
}

export interface BackupResult {
  backupId: string;
  status: BackupStatus;
  driveFolderUrl: string;
  manifestHash: string;
  tablesExported: number;
  filesExported: number;
  bytesUploaded: number;
  startedAt: string;
  completedAt: string;
}

export interface RestoreOptions {
  backupId?: string;
  apply?: boolean;
  restoreDatabase?: boolean;
  restoreStorage?: boolean;
}

export interface RestoreResult {
  backupId: string;
  mode: "dry-run" | "apply";
  validatedArtifacts: number;
  restoredTables: number;
  restoredFiles: number;
}

export interface BackupSummary {
  backupId: string;
  status: BackupStatus;
  completedAt: string | null;
  driveFolderUrl: string;
  tablesExported: number;
  filesExported: number;
}
