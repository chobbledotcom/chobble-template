import { resolve } from "node:path";
import { describe, expect, test } from "vitest";
import { fs, getFiles, rootDir } from "#test/test-utils.js";

// Any directory depth, including the repository root: no package manager
// other than npm may leave its lockfile behind.
const FOREIGN_LOCKFILE_PATTERN =
  /(?:^|\/)(?:bun\.lockb?|yarn\.lock|pnpm-lock\.yaml|deno\.lock)$/;

describe("lockfile", () => {
  test("only package-lock.json exists anywhere in the repo (this project uses npm)", () => {
    const foreignLockfiles = getFiles(FOREIGN_LOCKFILE_PATTERN);
    expect(
      foreignLockfiles,
      "this project uses npm: remove the foreign lockfile(s) and rely on package-lock.json",
    ).toEqual([]);

    const npmLockPath = resolve(rootDir, "package-lock.json");
    expect(fs.existsSync(npmLockPath)).toBe(true);
  });
});
