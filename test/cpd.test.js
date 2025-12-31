import { spawnSync } from "node:child_process";
import {
  createTestRunner,
  expectStrictEqual,
  rootDir,
} from "#test/test-utils.js";

const testCases = [
  {
    name: "no-duplicate-code",
    description: "jscpd finds no copy-pasted code blocks",
    test: () => {
      const result = spawnSync("pnpm", ["cpd"], {
        cwd: rootDir,
        encoding: "utf-8",
        stdio: ["pipe", "pipe", "pipe"],
      });

      if (result.status !== 0) {
        console.log("\n  Duplicate code detected:\n");
        console.log(result.stdout || result.stderr);
      }

      expectStrictEqual(
        result.status,
        0,
        "jscpd found duplicate code blocks. Run 'pnpm cpd' to see details.",
      );
    },
  },
];

createTestRunner("cpd", testCases);
