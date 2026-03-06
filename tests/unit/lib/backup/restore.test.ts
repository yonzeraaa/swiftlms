import { describe, expect, it } from "vitest";
import { parseRestoreArgs } from "../../../../lib/backup/restore";

describe("parseRestoreArgs", () => {
  it("parses backup id and apply flags", () => {
    expect(parseRestoreArgs(["--backup-id", "backup_20260306_050000", "--apply"])).toEqual({
      backupId: "backup_20260306_050000",
      apply: true,
      restoreDatabase: true,
      restoreStorage: true,
    });
  });

  it("supports skipping database or storage restore", () => {
    expect(parseRestoreArgs(["--skip-db", "--skip-storage"])).toEqual({
      backupId: undefined,
      apply: false,
      restoreDatabase: false,
      restoreStorage: false,
    });
  });
});
