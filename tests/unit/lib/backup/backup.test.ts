import { describe, expect, it } from "vitest";
import {
  buildBackupId,
  listStorageFilesRecursively,
  selectBackupFoldersForDeletion,
  serializeRowsToNdjson,
} from "../../../../lib/backup/backup";

function makeSupabase(listImpl: (folder: string) => any) {
  return {
    from: () => ({ select: async () => ({ data: [], error: null }) }),
    storage: {
      from: () => ({
        list: (folder: string) => listImpl(folder),
      }),
    },
  } as any;
}

describe("listStorageFilesRecursively", () => {
  it("returns file paths for a flat bucket", async () => {
    const supabase = makeSupabase(() => ({
      data: [
        { id: "1", name: "cert1.pdf" },
        { id: "2", name: "cert2.pdf" },
      ],
      error: null,
    }));

    const result = await listStorageFilesRecursively(supabase, "certificados");
    expect(result).toEqual(["cert1.pdf", "cert2.pdf"]);
  });

  it("recurses into sub-folders", async () => {
    let call = 0;
    const supabase = makeSupabase(() => {
      call += 1;
      if (call === 1) {
        return {
          data: [
            { id: null, name: "2026" },
            { id: "abc", name: "root.pdf" },
          ],
          error: null,
        };
      }

      return {
        data: [{ id: "nested", name: "jan.pdf" }],
        error: null,
      };
    });

    const result = await listStorageFilesRecursively(supabase, "certificados");
    expect(result).toEqual(["2026/jan.pdf", "root.pdf"]);
  });

  it("throws on storage list error", async () => {
    const supabase = makeSupabase(() => ({
      data: null,
      error: { message: "permission denied" },
    }));

    await expect(listStorageFilesRecursively(supabase, "avatars")).rejects.toThrow(
      "permission denied"
    );
  });
});

describe("buildBackupId", () => {
  it("uses UTC timestamp format", () => {
    const backupId = buildBackupId(new Date("2026-03-06T08:09:10.000Z"));
    expect(backupId).toBe("backup_20260306_080910");
  });
});

describe("serializeRowsToNdjson", () => {
  it("serializes rows as ndjson", () => {
    const buffer = serializeRowsToNdjson([{ id: 1 }, { id: 2 }]);
    expect(buffer.toString("utf8")).toBe('{"id":1}\n{"id":2}\n');
  });
});

describe("selectBackupFoldersForDeletion", () => {
  it("keeps newest daily and monthly restore points", () => {
    const deletions = selectBackupFoldersForDeletion(
      [
        {
          id: "1",
          name: "backup_20260306_050000",
          createdAt: new Date("2026-03-06T05:00:00.000Z"),
          status: "completed",
        },
        {
          id: "2",
          name: "backup_20260305_050000",
          createdAt: new Date("2026-03-05T05:00:00.000Z"),
          status: "completed",
        },
        {
          id: "3",
          name: "backup_20260201_050000",
          createdAt: new Date("2026-02-01T05:00:00.000Z"),
          status: "completed",
        },
      ],
      2,
      1
    );

    expect(deletions).toEqual(["3"]);
  });
});

describe("createDriveClient", () => {
  it("throws when GOOGLE_SERVICE_ACCOUNT_KEY is missing", async () => {
    const original = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
    delete process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
    const { createDriveClient } = await import("../../../../lib/backup/drive-client");
    expect(() => createDriveClient()).toThrow("GOOGLE_SERVICE_ACCOUNT_KEY");
    if (original) {
      process.env.GOOGLE_SERVICE_ACCOUNT_KEY = original;
    }
  });
});
