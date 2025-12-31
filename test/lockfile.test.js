import { dirname, resolve } from "path";
import { fileURLToPath } from "url";
import { createTestRunner, expectFalse, fs } from "./test-utils.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = resolve(__dirname, "..");

const testCases = [
  {
    name: "no-package-lock",
    description: "package-lock.json should not exist (this project uses pnpm)",
    test: () => {
      const lockfilePath = resolve(rootDir, "package-lock.json");
      const exists = fs.existsSync(lockfilePath);
      expectFalse(
        exists,
        "package-lock.json exists but this project uses pnpm. Delete it and use 'pnpm install' instead of 'npm install'.",
      );
    },
  },
];

createTestRunner("lockfile", testCases);
