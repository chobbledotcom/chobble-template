import { execSync } from "child_process";
import { createTestRunner, expectStrictEqual, rootDir } from "#test/test-utils.js";

const testCases = [
  {
    name: "no-duplicate-code",
    description: "jscpd finds no copy-pasted code blocks",
    test: () => {
      let output = "";
      let exitCode = 0;

      try {
        output = execSync("pnpm cpd", {
          cwd: rootDir,
          encoding: "utf-8",
          stdio: ["pipe", "pipe", "pipe"],
        });
      } catch (error) {
        exitCode = error.status || 1;
        output = error.stdout || error.stderr || error.message;
      }

      if (exitCode !== 0) {
        console.log("\n  Duplicate code detected:\n");
        console.log(output);
      }

      expectStrictEqual(
        exitCode,
        0,
        "jscpd found duplicate code blocks. Run 'pnpm cpd' to see details.",
      );
    },
  },
];

createTestRunner("cpd", testCases);
