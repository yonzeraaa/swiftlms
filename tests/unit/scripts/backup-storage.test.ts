import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  listFilesRecursively,
  downloadFile,
  backupAllBuckets,
} from "../../../scripts/backup-storage";
import * as fs from "fs";

vi.mock("fs");

// Helper to build a fake Supabase storage client
function makeStorage(listImpl: (folder: string) => any, downloadImpl?: () => any) {
  return {
    storage: {
      from: (_bucket: string) => ({
        list: (_folder: string, _opts?: any) => listImpl(_folder),
        download: (_path: string) => downloadImpl?.() ?? { data: null, error: { message: "not implemented" } },
      }),
    },
  } as any;
}

describe("listFilesRecursively", () => {
  it("returns file paths for a flat bucket", async () => {
    const supabase = makeStorage(() => ({
      data: [
        { id: "abc", name: "file1.pdf" },
        { id: "def", name: "file2.jpg" },
      ],
      error: null,
    }));

    const result = await listFilesRecursively(supabase, "certificates");
    expect(result).toEqual(["file1.pdf", "file2.jpg"]);
  });

  it("recurses into sub-folders (items with id === null)", async () => {
    // First call returns a folder + a file; second call (into folder/) returns a file
    let callCount = 0;
    const supabase = makeStorage(() => {
      callCount++;
      if (callCount === 1) {
        return {
          data: [
            { id: null, name: "subfolder" },   // folder
            { id: "abc", name: "root-file.pdf" },
          ],
          error: null,
        };
      }
      return {
        data: [{ id: "xyz", name: "nested.pdf" }],
        error: null,
      };
    });

    const result = await listFilesRecursively(supabase, "certificates");
    expect(result).toContain("root-file.pdf");
    expect(result).toContain("subfolder/nested.pdf");
  });

  it("returns empty array for an empty bucket", async () => {
    const supabase = makeStorage(() => ({ data: [], error: null }));
    const result = await listFilesRecursively(supabase, "avatars");
    expect(result).toEqual([]);
  });

  it("returns empty array when data is null", async () => {
    const supabase = makeStorage(() => ({ data: null, error: null }));
    const result = await listFilesRecursively(supabase, "avatars");
    expect(result).toEqual([]);
  });

  it("throws on Supabase list error", async () => {
    const supabase = makeStorage(() => ({
      data: null,
      error: { message: "permission denied" },
    }));

    await expect(
      listFilesRecursively(supabase, "certificates")
    ).rejects.toThrow("permission denied");
  });
});

describe("downloadFile", () => {
  beforeEach(() => {
    vi.mocked(fs.mkdirSync).mockReturnValue(undefined as any);
    vi.mocked(fs.writeFileSync).mockReturnValue(undefined);
  });

  it("writes file to the correct local path", async () => {
    const fakeBlob = {
      arrayBuffer: async () => new ArrayBuffer(8),
    };
    const supabase = makeStorage(
      () => ({ data: [], error: null }),
      () => ({ data: fakeBlob, error: null })
    );

    await downloadFile(supabase, "avatars", "user/avatar.jpg", "/tmp/backup");

    expect(fs.mkdirSync).toHaveBeenCalledWith(
      expect.stringContaining("avatars/user"),
      { recursive: true }
    );
    expect(fs.writeFileSync).toHaveBeenCalledWith(
      expect.stringContaining("avatar.jpg"),
      expect.any(Buffer)
    );
  });

  it("throws on download error", async () => {
    const supabase = makeStorage(
      () => ({ data: [], error: null }),
      () => ({ data: null, error: { message: "not found" } })
    );

    await expect(
      downloadFile(supabase, "avatars", "missing.jpg", "/tmp/backup")
    ).rejects.toThrow("not found");
  });
});

describe("backupAllBuckets", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(fs.mkdirSync).mockReturnValue(undefined as any);
    vi.mocked(fs.writeFileSync).mockReturnValue(undefined);
  });

  it("skips empty buckets without error", async () => {
    const supabase = makeStorage(() => ({ data: [], error: null }));
    await expect(
      backupAllBuckets(supabase, "/tmp/backup", ["certificates"])
    ).resolves.toBeUndefined();
  });

  it("downloads files from all specified buckets", async () => {
    const fakeBlob = { arrayBuffer: async () => new ArrayBuffer(4) };
    const supabase = makeStorage(
      () => ({ data: [{ id: "1", name: "a.pdf" }], error: null }),
      () => ({ data: fakeBlob, error: null })
    );

    await backupAllBuckets(supabase, "/tmp/backup", ["certificates", "avatars"]);

    // writeFileSync called once per bucket (1 file each)
    expect(fs.writeFileSync).toHaveBeenCalledTimes(2);
  });
});
