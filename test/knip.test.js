import { execSync } from "node:child_process";
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
      let output = "";
      let exitCode = 0;

      try {
        output = execSync("pnpm knip", {
          cwd: rootDir,
          encoding: "utf-8",
          stdio: ["pipe", "pipe", "pipe"],
        });
      } catch (error) {
        exitCode = error.status || 1;
        output = error.stdout || error.message;
      }

      if (exitCode !== 0) {
        console.log("\n  Knip found issues:\n");
        console.log(output);
      }

      expectStrictEqual(
        exitCode,
        0,
        "Knip found unused exports or dependencies. Run 'pnpm knip' to see details, or 'pnpm knip:fix' to auto-fix.",
      );
    },
  },
];

createTestRunner("knip", testCases);
