import { afterEach, describe, expect, it } from "vitest";
import {
  decryptSecret,
  encryptSecret,
  getSetupMasterKey,
  maskSecret,
} from "../../../../lib/setup/crypto";

const ORIGINAL_KEY = process.env.APP_SETUP_MASTER_KEY_BASE64;

describe("setup crypto", () => {
  afterEach(() => {
    if (ORIGINAL_KEY) {
      process.env.APP_SETUP_MASTER_KEY_BASE64 = ORIGINAL_KEY;
      return;
    }

    delete process.env.APP_SETUP_MASTER_KEY_BASE64;
  });

  it("encrypts and decrypts setup secrets", () => {
    process.env.APP_SETUP_MASTER_KEY_BASE64 = Buffer.alloc(32, 9).toString("base64");

    const encrypted = encryptSecret('{"type":"service_account"}');

    expect(encrypted).not.toContain("service_account");
    expect(decryptSecret(encrypted)).toBe('{"type":"service_account"}');
  });

  it("validates master key size", () => {
    process.env.APP_SETUP_MASTER_KEY_BASE64 = Buffer.alloc(16, 1).toString("base64");

    expect(() => getSetupMasterKey()).toThrow(
      "APP_SETUP_MASTER_KEY_BASE64 deve decodificar para 32 bytes"
    );
  });

  it("masks stored values", () => {
    expect(maskSecret("")).toBe("");
    expect(maskSecret("12345678")).toBe("12***");
    expect(maskSecret("swiftlms-secret")).toBe("swif***cret");
  });
});
