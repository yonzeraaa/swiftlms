import { describe, it, expect, vi, beforeEach } from "vitest";
import { listStorageFilesRecursively } from "../../../../lib/backup/backup";

// ─── helpers ───────────────────────────────────────────────────────────────

function makeSupabase(listImpl: (folder: string) => any) {
  return {
    from: () => ({ select: async () => ({ data: [], error: null }) }),
    storage: {
      from: (_bucket: string) => ({
        list: (folder: string, _opts?: any) => listImpl(folder),
        download: () => ({ data: null, error: { message: "not implemented" } }),
      }),
    },
  } as any;
}

// ─── listStorageFilesRecursively ───────────────────────────────────────────

describe("listStorageFilesRecursively", () => {
  it("returns file paths for a flat bucket", async () => {
    const supabase = makeSupabase(() => ({
      data: [
        { id: "1", name: "cert1.pdf" },
        { id: "2", name: "cert2.pdf" },
      ],
      error: null,
    }));

    const result = await listStorageFilesRecursively(supabase, "certificates");
    expect(result).toEqual(["cert1.pdf", "cert2.pdf"]);
  });

  it("recurses into sub-folders (items with id === null)", async () => {
    let call = 0;
    const supabase = makeSupabase(() => {
      call++;
      if (call === 1) {
        return {
          data: [
            { id: null, name: "2024" },       // folder
            { id: "abc", name: "root.pdf" },
          ],
          error: null,
        };
      }
      return { data: [{ id: "xyz", name: "jan.pdf" }], error: null };
    });

    const result = await listStorageFilesRecursively(supabase, "certificates");
    expect(result).toContain("root.pdf");
    expect(result).toContain("2024/jan.pdf");
  });

  it("returns empty array for an empty bucket", async () => {
    const supabase = makeSupabase(() => ({ data: [], error: null }));
    expect(await listStorageFilesRecursively(supabase, "avatars")).toEqual([]);
  });

  it("returns empty array when data is null", async () => {
    const supabase = makeSupabase(() => ({ data: null, error: null }));
    expect(await listStorageFilesRecursively(supabase, "avatars")).toEqual([]);
  });

  it("throws on Supabase list error", async () => {
    const supabase = makeSupabase(() => ({
      data: null,
      error: { message: "permission denied" },
    }));
    await expect(
      listStorageFilesRecursively(supabase, "certificates")
    ).rejects.toThrow("permission denied");
  });
});

// ─── drive-client ─────────────────────────────────────────────────────────

describe("createDriveClient", () => {
  it("throws when GOOGLE_SERVICE_ACCOUNT_KEY is missing", async () => {
    const original = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
    delete process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
    const { createDriveClient } = await import("../../../../lib/backup/drive-client");
    expect(() => createDriveClient()).toThrow("GOOGLE_SERVICE_ACCOUNT_KEY");
    process.env.GOOGLE_SERVICE_ACCOUNT_KEY = original;
  });
});
