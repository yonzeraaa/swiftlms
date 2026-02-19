import { google, drive_v3 } from "googleapis";

/**
 * Creates an authenticated Google Drive client using a service account.
 *
 * Required env var: GOOGLE_SERVICE_ACCOUNT_KEY (JSON-stringified credentials)
 * Scope: drive.file — allows creating/writing files the service account owns,
 * without read access to the entire Drive.
 */
export function createDriveClient(): drive_v3.Drive {
  const keyJson = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
  if (!keyJson) {
    throw new Error("GOOGLE_SERVICE_ACCOUNT_KEY environment variable is not set");
  }

  const credentials = JSON.parse(keyJson);
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ["https://www.googleapis.com/auth/drive.file"],
  });

  return google.drive({ version: "v3", auth });
}

/**
 * Creates a folder in Google Drive and returns its ID.
 */
export async function createDriveFolder(
  drive: drive_v3.Drive,
  name: string,
  parentFolderId: string
): Promise<string> {
  const response = await drive.files.create({
    requestBody: {
      name,
      mimeType: "application/vnd.google-apps.folder",
      parents: [parentFolderId],
    },
    fields: "id",
  });

  const folderId = response.data.id;
  if (!folderId) {
    throw new Error(`Failed to create Drive folder: ${name}`);
  }

  return folderId;
}

/**
 * Uploads a Buffer or string as a file to Google Drive.
 * Returns the file's web view URL.
 */
export async function uploadToDrive(
  drive: drive_v3.Drive,
  fileName: string,
  content: Buffer | string,
  mimeType: string,
  parentFolderId: string
): Promise<string> {
  const buffer = typeof content === "string" ? Buffer.from(content) : content;

  const response = await drive.files.create({
    requestBody: {
      name: fileName,
      parents: [parentFolderId],
    },
    media: {
      mimeType,
      body: bufferToStream(buffer),
    },
    fields: "id,webViewLink",
  });

  return response.data.webViewLink ?? `https://drive.google.com/file/d/${response.data.id}`;
}

function bufferToStream(buffer: Buffer) {
  const { Readable } = require("stream");
  const stream = new Readable();
  stream.push(buffer);
  stream.push(null);
  return stream;
}
