import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { createDriveClient, createDriveFolder, uploadToDrive } from "./drive-client";

// Only student-related tables — course structure and platform config are excluded
const STUDENT_TABLES = [
  "profiles",           // student accounts (filtered by role)
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

export interface BackupResult {
  backupId: string;
  driveFolderUrl: string;
  tablesExported: number;
}

/**
 * Exports all student-related Supabase tables as JSON
 * and uploads them to a dated folder in Google Drive.
 */
export async function runBackup(): Promise<BackupResult> {
  const supabase = createSupabaseAdminClient();
  const drive = createDriveClient();

  const backupId = buildBackupId();
  const parentFolderId = requireEnv("GOOGLE_DRIVE_BACKUP_FOLDER_ID");

  const folderId = await createDriveFolder(drive, backupId, parentFolderId);
  const driveFolderUrl = `https://drive.google.com/drive/folders/${folderId}`;

  let tablesExported = 0;
  for (const table of STUDENT_TABLES) {
    const { data, error } = await supabase.from(table).select("*");
    if (error) {
      console.warn(`Skipping table ${table}: ${error.message}`);
      continue;
    }
    await uploadToDrive(
      drive,
      `${table}.json`,
      JSON.stringify(data, null, 2),
      "application/json",
      folderId
    );
    tablesExported++;
  }

  return { backupId, driveFolderUrl, tablesExported };
}

// ─── helpers ──────────────────────────────────────────────────────────────────

/**
 * Lists all file paths in a Supabase Storage bucket recursively.
 * Kept here for use by the legacy backup-storage.ts script.
 */
export async function listStorageFilesRecursively(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any, any, any>,
  bucket: string,
  folder: string = ""
): Promise<string[]> {
  const { data, error } = await supabase.storage.from(bucket).list(folder, {
    limit: 1000,
  });

  if (error) throw new Error(`Failed to list ${bucket}/${folder}: ${error.message}`);
  if (!data || data.length === 0) return [];

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

function buildBackupId(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    `backup_${now.getFullYear()}` +
    `${pad(now.getMonth() + 1)}${pad(now.getDate())}` +
    `_${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`
  );
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required env var: ${name}`);
  return value;
}

function createSupabaseAdminClient() {
  return createClient(
    requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
    requireEnv("SUPABASE_SERVICE_ROLE_KEY")
  );
}
