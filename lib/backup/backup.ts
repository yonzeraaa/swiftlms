import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { createDriveClient, createDriveFolder, uploadToDrive } from "./drive-client";

// Tables exported as JSON in every backup
const BACKUP_TABLES = [
  "profiles",
  "courses",
  "course_modules",
  "subjects",
  "module_subjects",
  "course_subjects",
  "subject_lessons",
  "lessons",
  "tests",
  "test_answer_keys",
  "test_attempts",
  "test_grades",
  "enrollments",
  "enrollment_modules",
  "lesson_progress",
  "certificates",
  "certificate_requests",
  "certificate_requirements",
  "certificate_templates",
  "excel_templates",
  "tcc_submissions",
  "student_grade_overrides",
  "student_schedules",
  "activity_logs",
] as const;

const STORAGE_BUCKETS = ["certificates", "avatars", "templates", "excel_templates"];

export interface BackupResult {
  backupId: string;
  driveFolderUrl: string;
  tablesExported: number;
  storageFilesExported: number;
}

/**
 * Runs a full backup:
 * 1. Exports all key tables as JSON
 * 2. Downloads and uploads all storage files
 * 3. Creates a dated folder in Google Drive with everything
 *
 * @param extraFiles - Optional extra files to include (e.g. pg_dump).
 *                     Key = file name in Drive, Value = file Buffer.
 */
export async function runBackup(
  extraFiles?: Record<string, Buffer>
): Promise<BackupResult> {
  const supabase = createSupabaseAdminClient();
  const drive = createDriveClient();

  const backupId = buildBackupId();
  const parentFolderId = requireEnv("GOOGLE_DRIVE_BACKUP_FOLDER_ID");

  // Create dated folder in Drive
  const folderId = await createDriveFolder(drive, backupId, parentFolderId);
  const driveFolderUrl = `https://drive.google.com/drive/folders/${folderId}`;

  // Sub-folders
  const [dbFolderId, storageFolderId] = await Promise.all([
    createDriveFolder(drive, "database", folderId),
    createDriveFolder(drive, "storage", folderId),
  ]);

  // Export tables
  let tablesExported = 0;
  for (const table of BACKUP_TABLES) {
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
      dbFolderId
    );
    tablesExported++;
  }

  // Export storage buckets
  let storageFilesExported = 0;
  for (const bucket of STORAGE_BUCKETS) {
    const bucketFolderId = await createDriveFolder(drive, bucket, storageFolderId);
    const files = await listStorageFilesRecursively(supabase, bucket);

    for (const filePath of files) {
      const { data, error } = await supabase.storage.from(bucket).download(filePath);
      if (error) {
        console.warn(`Skipping ${bucket}/${filePath}: ${error.message}`);
        continue;
      }
      const buffer = Buffer.from(await data.arrayBuffer());
      // Flatten path to avoid nested folder creation complexity
      const safeName = filePath.replace(/\//g, "__");
      await uploadToDrive(drive, safeName, buffer, data.type || "application/octet-stream", bucketFolderId);
      storageFilesExported++;
    }
  }

  // Upload any extra files (e.g. pg_dump from cron)
  if (extraFiles) {
    for (const [fileName, buffer] of Object.entries(extraFiles)) {
      await uploadToDrive(drive, fileName, buffer, "application/octet-stream", folderId);
    }
  }

  return { backupId, driveFolderUrl, tablesExported, storageFilesExported };
}

/**
 * Lists all file paths in a Supabase Storage bucket recursively.
 * Folders are items with id === null.
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
