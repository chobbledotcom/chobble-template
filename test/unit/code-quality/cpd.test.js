import { describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { rootDir } from "#test/test-utils.js";

describe("cpd", () => {
  test("code duplication stays within threshold", () => {
    const result = spawnSync("bun", ["run", "cpd"], {
      cwd: rootDir,
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"],
    });

    if (result.status !== 0) {
      console.log("\n  Duplication exceeds threshold:\n");
      console.log(result.stdout || result.stderr);
    }

    expect(result.status).toBe(0);
  });
});
