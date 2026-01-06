import { describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { rootDir } from "#test/test-utils.js";

describe("knip", () => {
  test("Knip finds no unused exports or dependencies", () => {
    const result = spawnSync("bun", ["run", "knip"], {
      cwd: rootDir,
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"],
    });

    if (result.status !== 0) {
      console.log("\n  Knip found issues:\n");
      console.log(result.stdout || result.stderr);
    }

    expect(result.status).toBe(0);
  });
});
