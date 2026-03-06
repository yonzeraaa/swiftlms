import { describe, expect, it } from "vitest";
import {
  decryptBuffer,
  encryptBuffer,
  gunzipBuffer,
  gzipBuffer,
  sha256Hex,
} from "../../../../lib/backup/crypto";

describe("backup crypto", () => {
  it("encrypts and decrypts buffers", () => {
    const key = Buffer.alloc(32, 7);
    const source = Buffer.from("aluno:123", "utf8");

    const encrypted = encryptBuffer(source, key);

    expect(encrypted.toString("utf8")).not.toContain("aluno:123");
    expect(decryptBuffer(encrypted, key).toString("utf8")).toBe("aluno:123");
  });

  it("compresses and decompresses buffers", () => {
    const source = Buffer.from("linha-1\nlinha-2\n", "utf8");
    const compressed = gzipBuffer(source);

    expect(compressed.equals(source)).toBe(false);
    expect(gunzipBuffer(compressed).toString("utf8")).toBe(source.toString("utf8"));
  });

  it("calculates deterministic sha256", () => {
    expect(sha256Hex(Buffer.from("swiftlms", "utf8"))).toBe(
      "ed09adb407335411fef48f6b0f2f878ebe5833610bd92871c573f5044035e7f7"
    );
  });
});
