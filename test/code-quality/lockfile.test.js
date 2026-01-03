import { resolve } from "node:path";
import {
  createTestRunner,
  expectFalse,
  fs,
  rootDir,
} from "#test/test-utils.js";

const testCases = [
  {
    name: "no-package-lock",
    description: "package-lock.json should not exist (this project uses bun)",
    test: () => {
      const lockfilePath = resolve(rootDir, "package-lock.json");
      const exists = fs.existsSync(lockfilePath);
      expectFalse(
        exists,
        "package-lock.json exists but this project uses bun. Delete it and use 'bun install' instead of 'npm install'.",
      );
    },
  },
];

createTestRunner("lockfile", testCases);
