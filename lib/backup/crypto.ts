import crypto from "crypto";
import zlib from "zlib";

interface EncryptedEnvelope {
  version: 1;
  algorithm: "aes-256-gcm";
  iv: string;
  authTag: string;
  ciphertext: string;
}

export function gzipBuffer(buffer: Buffer): Buffer {
  return zlib.gzipSync(buffer);
}

export function gunzipBuffer(buffer: Buffer): Buffer {
  return zlib.gunzipSync(buffer);
}

export function encryptBuffer(buffer: Buffer, key: Buffer): Buffer {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([cipher.update(buffer), cipher.final()]);
  const authTag = cipher.getAuthTag();

  const envelope: EncryptedEnvelope = {
    version: 1,
    algorithm: "aes-256-gcm",
    iv: iv.toString("base64"),
    authTag: authTag.toString("base64"),
    ciphertext: ciphertext.toString("base64"),
  };

  return Buffer.from(JSON.stringify(envelope), "utf8");
}

export function decryptBuffer(buffer: Buffer, key: Buffer): Buffer {
  const envelope = JSON.parse(buffer.toString("utf8")) as EncryptedEnvelope;
  const decipher = crypto.createDecipheriv(
    envelope.algorithm,
    key,
    Buffer.from(envelope.iv, "base64")
  );

  decipher.setAuthTag(Buffer.from(envelope.authTag, "base64"));

  return Buffer.concat([
    decipher.update(Buffer.from(envelope.ciphertext, "base64")),
    decipher.final(),
  ]);
}

export function sha256Hex(buffer: Buffer): string {
  return crypto.createHash("sha256").update(buffer).digest("hex");
}
