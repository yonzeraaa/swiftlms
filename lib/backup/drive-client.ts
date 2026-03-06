import { google, drive_v3 } from "googleapis";
import { Readable } from "stream";
import { requireEnv } from "./config";
import { logger } from "@/lib/utils/logger";

const DRIVE_FOLDER_MIME = "application/vnd.google-apps.folder";
const DEFAULT_RETRY_ATTEMPTS = 3;

export interface DriveFileDescriptor {
  id: string;
  name: string;
  mimeType: string;
  parents: string[];
  webViewLink?: string | null;
}

export interface DriveUploadResult {
  id: string;
  webViewLink: string;
}

export function createDriveClient(credentialsJson?: string): drive_v3.Drive {
  const credentials = JSON.parse(credentialsJson || requireEnv("GOOGLE_SERVICE_ACCOUNT_KEY"));
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ["https://www.googleapis.com/auth/drive"],
  });

  return google.drive({ version: "v3", auth });
}

export async function createDriveFolder(
  drive: drive_v3.Drive,
  name: string,
  parentFolderId: string
): Promise<string> {
  const response = await withRetry(() =>
    drive.files.create({
      requestBody: {
        name,
        mimeType: DRIVE_FOLDER_MIME,
        parents: [parentFolderId],
      },
      fields: "id",
    })
  );

  const folderId = response.data.id;
  if (!folderId) {
    throw new Error(`Failed to create Drive folder: ${name}`);
  }

  return folderId;
}

export async function ensureDriveFolderPath(
  drive: drive_v3.Drive,
  parentFolderId: string,
  segments: string[]
): Promise<string> {
  let currentParent = parentFolderId;

  for (const segment of segments) {
    const existing = await findDriveChild(drive, currentParent, segment, DRIVE_FOLDER_MIME);
    if (existing?.id) {
      currentParent = existing.id;
      continue;
    }

    currentParent = await createDriveFolder(drive, segment, currentParent);
  }

  return currentParent;
}

export async function uploadToDrive(
  drive: drive_v3.Drive,
  fileName: string,
  content: Buffer | string,
  mimeType: string,
  parentFolderId: string
): Promise<DriveUploadResult> {
  const buffer = typeof content === "string" ? Buffer.from(content, "utf8") : content;

  const response = await withRetry(() =>
    drive.files.create({
      requestBody: {
        name: fileName,
        parents: [parentFolderId],
      },
      media: {
        mimeType,
        body: bufferToStream(buffer),
      },
      fields: "id,webViewLink",
    })
  );

  const id = response.data.id;
  if (!id) {
    throw new Error(`Drive upload did not return file id for ${fileName}`);
  }

  return {
    id,
    webViewLink: response.data.webViewLink ?? `https://drive.google.com/file/d/${id}`,
  };
}

export async function updateDriveFile(
  drive: drive_v3.Drive,
  fileId: string,
  content: Buffer | string,
  mimeType: string
): Promise<void> {
  const buffer = typeof content === "string" ? Buffer.from(content, "utf8") : content;

  await withRetry(() =>
    drive.files.update({
      fileId,
      media: {
        mimeType,
        body: bufferToStream(buffer),
      },
    })
  );
}

export async function downloadDriveFile(
  drive: drive_v3.Drive,
  fileId: string
): Promise<Buffer> {
  const response = await withRetry(() =>
    drive.files.get(
      {
        fileId,
        alt: "media",
      },
      {
        responseType: "arraybuffer",
      }
    )
  );

  return Buffer.from(response.data as ArrayBuffer);
}

export async function listDriveChildren(
  drive: drive_v3.Drive,
  parentFolderId: string
): Promise<DriveFileDescriptor[]> {
  const response = await withRetry(() =>
    drive.files.list({
      q: `'${parentFolderId}' in parents and trashed = false`,
      fields: "files(id,name,mimeType,parents,webViewLink)",
      pageSize: 1000,
      supportsAllDrives: true,
      includeItemsFromAllDrives: true,
    })
  );

  return (response.data.files ?? []).map((file) => ({
    id: file.id ?? "",
    name: file.name ?? "",
    mimeType: file.mimeType ?? "",
    parents: file.parents ?? [],
    webViewLink: file.webViewLink,
  }));
}

export async function findDriveChild(
  drive: drive_v3.Drive,
  parentFolderId: string,
  name: string,
  mimeType?: string
): Promise<DriveFileDescriptor | null> {
  const escapedName = name.replace(/'/g, "\\'");
  const mimeFilter = mimeType ? ` and mimeType = '${mimeType}'` : "";
  const response = await withRetry(() =>
    drive.files.list({
      q: `'${parentFolderId}' in parents and name = '${escapedName}' and trashed = false${mimeFilter}`,
      fields: "files(id,name,mimeType,parents,webViewLink)",
      pageSize: 1,
      supportsAllDrives: true,
      includeItemsFromAllDrives: true,
    })
  );

  const file = response.data.files?.[0];
  if (!file?.id) {
    return null;
  }

  return {
    id: file.id,
    name: file.name ?? "",
    mimeType: file.mimeType ?? "",
    parents: file.parents ?? [],
    webViewLink: file.webViewLink,
  };
}

export async function deleteDriveItem(
  drive: drive_v3.Drive,
  fileId: string
): Promise<void> {
  await withRetry(() =>
    drive.files.delete({
      fileId,
      supportsAllDrives: true,
    })
  );
}

async function withRetry<T>(
  fn: () => Promise<T>,
  attempts: number = DEFAULT_RETRY_ATTEMPTS
): Promise<T> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      if (attempt === attempts) {
        break;
      }

      const delayMs = 300 * 2 ** (attempt - 1);
      logger.warn("Drive operation failed, retrying", {
        attempt,
        delayMs,
        error: error instanceof Error ? error.message : String(error),
      }, { context: "BACKUP", forceProduction: true });
      await sleep(delayMs);
    }
  }

  throw lastError;
}

function bufferToStream(buffer: Buffer) {
  const stream = new Readable();
  stream.push(buffer);
  stream.push(null);
  return stream;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
