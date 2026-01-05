import { describe, expect, test } from "bun:test";
import { resolve } from "node:path";
import { fs, rootDir } from "#test/test-utils.js";

const forbiddenLockfiles = [
  "package-lock.json",
  "yarn.lock",
  "pnpm-lock.yaml",
  "npm-shrinkwrap.json",
];

describe("lockfile", () => {
  test("only bun.lock should exist (this project uses bun)", () => {
    for (const lockfile of forbiddenLockfiles) {
      const lockfilePath = resolve(rootDir, lockfile);
      const exists = fs.existsSync(lockfilePath);
      expect(exists).toBe(false);
    }

    const bunLockPath = resolve(rootDir, "bun.lock");
    expect(fs.existsSync(bunLockPath)).toBe(true);
  });
});
