import { describe, test, expect } from "bun:test";
import { resolve } from "node:path";
import { fs, rootDir } from "#test/test-utils.js";

describe("lockfile", () => {
  test("package-lock.json should not exist (this project uses bun)", () => {
    const lockfilePath = resolve(rootDir, "package-lock.json");
    const exists = fs.existsSync(lockfilePath);
    expect(exists).toBe(false);
  });
});
