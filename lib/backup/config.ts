import fs from "fs";
import path from "path";
import packageJson from "@/package.json";
import { getPublicSettings, getSecret } from "@/lib/setup/service";
import type { DriveAuthConfig } from "./drive-client";
import {
  BACKUP_MANIFEST_VERSION,
  BACKUP_STORAGE_BUCKETS,
  BACKUP_TABLES,
} from "./types";

export interface BackupConfig {
  appVersion: string;
  schemaVersion: string;
  manifestVersion: number;
  driveAuth: DriveAuthConfig;
  parentFolderId: string;
  retentionDays: number;
  retentionMonths: number;
  masterKey: Buffer;
  cronSecret: string | null;
  tables: readonly string[];
  storageBuckets: readonly string[];
}

export async function getBackupConfig(): Promise<BackupConfig> {
  const publicSettings = await getPublicSettings();
  const googleClientSecret =
    (await getSecret("backup.google_client_secret")) ||
    process.env.GOOGLE_CLIENT_SECRET ||
    null;
  const googleRefreshToken =
    (await getSecret("backup.google_refresh_token")) ||
    process.env.GOOGLE_DRIVE_BACKUP_REFRESH_TOKEN ||
    null;
  const googleServiceAccountKey = process.env.GOOGLE_SERVICE_ACCOUNT_KEY || null;
  const parentFolderId =
    (await getSecret("backup.google_drive_backup_folder_id")) ||
    requireEnv("GOOGLE_DRIVE_BACKUP_FOLDER_ID");
  const driveAuth = resolveDriveAuth({
    googleClientId: publicSettings.googleClientId,
    googleClientSecret,
    googleRefreshToken,
    googleServiceAccountKey,
  });

  return {
    appVersion: packageJson.version ?? "0.0.0",
    schemaVersion: getSchemaVersion(),
    manifestVersion: BACKUP_MANIFEST_VERSION,
    driveAuth,
    parentFolderId,
    retentionDays: getOptionalNumberEnv("BACKUP_RETENTION_DAYS", 35),
    retentionMonths: getOptionalNumberEnv("BACKUP_RETENTION_MONTHS", 12),
    masterKey: getBackupMasterKey(),
    cronSecret: process.env.BACKUP_CRON_SECRET || process.env.CRON_SECRET || null,
    tables: BACKUP_TABLES,
    storageBuckets: BACKUP_STORAGE_BUCKETS,
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

function resolveDriveAuth({
  googleClientId,
  googleClientSecret,
  googleRefreshToken,
  googleServiceAccountKey,
}: {
  googleClientId: string;
  googleClientSecret: string | null;
  googleRefreshToken: string | null;
  googleServiceAccountKey: string | null;
}): DriveAuthConfig {
  if (googleClientId && googleClientSecret && googleRefreshToken) {
    return {
      type: "oauth",
      clientId: googleClientId,
      clientSecret: googleClientSecret,
      refreshToken: googleRefreshToken,
    };
  }

  if (googleServiceAccountKey) {
    return {
      type: "service_account",
      credentialsJson: googleServiceAccountKey,
    };
  }

  throw new Error(
    "Missing Google Drive backup auth. Configure OAuth no setup ou GOOGLE_SERVICE_ACCOUNT_KEY."
  );
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
