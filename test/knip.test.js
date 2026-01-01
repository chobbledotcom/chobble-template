import { spawnSync } from "node:child_process";
import {
  createTestRunner,
  expectStrictEqual,
  rootDir,
} from "#test/test-utils.js";

const testCases = [
  {
    name: "no-unused-exports",
    description: "Knip finds no unused exports or dependencies",
    test: () => {
      const result = spawnSync("pnpm", ["knip"], {
        cwd: rootDir,
        encoding: "utf-8",
        stdio: ["pipe", "pipe", "pipe"],
      });

      if (result.status !== 0) {
        console.log("\n  Knip found issues:\n");
        console.log(result.stdout || result.stderr);
      }

      expectStrictEqual(
        result.status,
        0,
        "Knip found unused exports or dependencies. Run 'pnpm knip' to see details, or 'pnpm knip:fix' to auto-fix.",
      );
    },
  },
];

createTestRunner("knip", testCases);
