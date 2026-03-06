import crypto from "crypto";

interface EncryptedEnvelope {
  version: 1;
  algorithm: "aes-256-gcm";
  iv: string;
  authTag: string;
  ciphertext: string;
}

export function getSetupMasterKey(): Buffer {
  const value = process.env.APP_SETUP_MASTER_KEY_BASE64;
  if (!value) {
    throw new Error("APP_SETUP_MASTER_KEY_BASE64 não configurada");
  }

  const key = Buffer.from(value, "base64");
  if (key.length !== 32) {
    throw new Error("APP_SETUP_MASTER_KEY_BASE64 deve decodificar para 32 bytes");
  }

  return key;
}

export function encryptSecret(value: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", getSetupMasterKey(), iv);
  const ciphertext = Buffer.concat([
    cipher.update(Buffer.from(value, "utf8")),
    cipher.final(),
  ]);

  const envelope: EncryptedEnvelope = {
    version: 1,
    algorithm: "aes-256-gcm",
    iv: iv.toString("base64"),
    authTag: cipher.getAuthTag().toString("base64"),
    ciphertext: ciphertext.toString("base64"),
  };

  return JSON.stringify(envelope);
}

export function decryptSecret(payload: string): string {
  const envelope = JSON.parse(payload) as EncryptedEnvelope;
  const decipher = crypto.createDecipheriv(
    envelope.algorithm,
    getSetupMasterKey(),
    Buffer.from(envelope.iv, "base64")
  );

  decipher.setAuthTag(Buffer.from(envelope.authTag, "base64"));

  return Buffer.concat([
    decipher.update(Buffer.from(envelope.ciphertext, "base64")),
    decipher.final(),
  ]).toString("utf8");
}

export function maskSecret(value: string): string {
  if (!value) {
    return "";
  }

  if (value.length <= 8) {
    return `${value.slice(0, 2)}***`;
  }

  return `${value.slice(0, 4)}***${value.slice(-4)}`;
}
