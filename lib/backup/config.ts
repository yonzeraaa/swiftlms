import fs from "fs";
import path from "path";
import packageJson from "@/package.json";
import { getSecret } from "@/lib/setup/service";
import {
  BACKUP_MANIFEST_VERSION,
  STUDENT_STORAGE_BUCKETS,
  STUDENT_TABLES,
} from "./types";

export interface BackupConfig {
  appVersion: string;
  schemaVersion: string;
  manifestVersion: number;
  googleServiceAccountKey: string;
  parentFolderId: string;
  retentionDays: number;
  retentionMonths: number;
  masterKey: Buffer;
  cronSecret: string | null;
  tables: readonly string[];
  storageBuckets: readonly string[];
}

export async function getBackupConfig(): Promise<BackupConfig> {
  const googleServiceAccountKey =
    (await getSecret("backup.google_service_account_key")) ||
    requireEnv("GOOGLE_SERVICE_ACCOUNT_KEY");
  const parentFolderId =
    (await getSecret("backup.google_drive_backup_folder_id")) ||
    requireEnv("GOOGLE_DRIVE_BACKUP_FOLDER_ID");

  return {
    appVersion: packageJson.version ?? "0.0.0",
    schemaVersion: getSchemaVersion(),
    manifestVersion: BACKUP_MANIFEST_VERSION,
    googleServiceAccountKey,
    parentFolderId,
    retentionDays: getOptionalNumberEnv("BACKUP_RETENTION_DAYS", 35),
    retentionMonths: getOptionalNumberEnv("BACKUP_RETENTION_MONTHS", 12),
    masterKey: getBackupMasterKey(),
    cronSecret: process.env.BACKUP_CRON_SECRET || process.env.CRON_SECRET || null,
    tables: STUDENT_TABLES,
    storageBuckets: STUDENT_STORAGE_BUCKETS,
  };
}

export function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}

export function getBackupMasterKey(): Buffer {
  const value = requireEnv("BACKUP_MASTER_KEY_BASE64");
  const key = Buffer.from(value, "base64");

  if (key.length !== 32) {
    throw new Error("BACKUP_MASTER_KEY_BASE64 must decode to 32 bytes");
  }

  return key;
}

function getOptionalNumberEnv(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) {
    return fallback;
  }

  const value = Number.parseInt(raw, 10);
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`${name} must be a positive integer`);
  }

  return value;
}

function getSchemaVersion(): string {
  try {
    const migrationsDir = path.join(process.cwd(), "supabase", "migrations");
    const files = fs
      .readdirSync(migrationsDir, { withFileTypes: true })
      .filter((entry) => entry.isFile())
      .map((entry) => entry.name)
      .sort();

    return files.at(-1) ?? "unknown";
  } catch {
    return "unknown";
  }
}
