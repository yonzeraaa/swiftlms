#!/usr/bin/env tsx
/**
 * Backup Supabase Storage buckets to local disk.
 * Usage: tsx scripts/backup-storage.ts <output-dir>
 *
 * Downloads all files from each bucket recursively and saves them
 * under <output-dir>/storage/<bucket>/<path>.
 */

import { createClient } from "@supabase/supabase-js";
import * as fs from "fs";
import * as path from "path";

const BUCKETS = ["certificates", "avatars", "templates", "excel_templates"];

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

/**
 * Recursively list all file paths in a bucket folder.
 * Supabase `list()` returns both files and "folders" (items with id === null).
 */
export async function listFilesRecursively(
  supabase: ReturnType<typeof createClient>,
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

  const filePaths: string[] = [];

  for (const item of data) {
    const itemPath = folder ? `${folder}/${item.name}` : item.name;

    // Items without an id are "folders" in Supabase Storage
    if (item.id === null) {
      const nested = await listFilesRecursively(supabase, bucket, itemPath);
      filePaths.push(...nested);
    } else {
      filePaths.push(itemPath);
    }
  }

  return filePaths;
}

/**
 * Download a single file from Supabase Storage and write it to disk.
 */
export async function downloadFile(
  supabase: ReturnType<typeof createClient>,
  bucket: string,
  filePath: string,
  outputDir: string
): Promise<void> {
  const { data, error } = await supabase.storage
    .from(bucket)
    .download(filePath);

  if (error) {
    throw new Error(
      `Failed to download ${bucket}/${filePath}: ${error.message}`
    );
  }

  const localPath = path.join(outputDir, "storage", bucket, filePath);
  fs.mkdirSync(path.dirname(localPath), { recursive: true });

  const buffer = Buffer.from(await data.arrayBuffer());
  fs.writeFileSync(localPath, buffer);
}

/**
 * Back up all files from all buckets to outputDir.
 */
export async function backupAllBuckets(
  supabase: ReturnType<typeof createClient>,
  outputDir: string,
  buckets: string[] = BUCKETS
): Promise<void> {
  for (const bucket of buckets) {
    console.log(`  Backing up bucket: ${bucket}`);

    const files = await listFilesRecursively(supabase, bucket);

    if (files.length === 0) {
      console.log(`    (empty)`);
      continue;
    }

    for (const file of files) {
      await downloadFile(supabase, bucket, file, outputDir);
      console.log(`    ✓ ${file}`);
    }

    console.log(`    Done: ${files.length} file(s)`);
  }
}

// Entry point when run directly
if (process.argv[1] && process.argv[1].endsWith("backup-storage.ts")) {
  const outputDir = process.argv[2];
  if (!outputDir) {
    console.error("Usage: tsx scripts/backup-storage.ts <output-dir>");
    process.exit(1);
  }

  const supabase = createClient(
    requireEnv("SUPABASE_URL"),
    requireEnv("SUPABASE_SERVICE_ROLE_KEY")
  );

  backupAllBuckets(supabase, outputDir)
    .then(() => console.log("Storage backup complete."))
    .catch((err) => {
      console.error("Storage backup failed:", err.message);
      process.exit(1);
    });
}
