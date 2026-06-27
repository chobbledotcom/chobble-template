import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { ROOT_DIR } from "#lib/paths.js";
import {
  createDotsProgress,
  extractTestTotal,
} from "#test/precommit/output.js";

const CACHE_DIR = join(ROOT_DIR, ".cache");
const TEST_COUNT_CACHE = join(CACHE_DIR, "precommit-test-count");

/** Persist the total test count from the latest run's output, so the next
 * run can show `(N/total passed)` progress. No-op when no summary line is
 * found (the suite crashed before printing one). */
export const persistTestTotal = (output) => {
  const total = extractTestTotal(output);
  if (total === undefined) return;
  mkdirSync(CACHE_DIR, { recursive: true });
  writeFileSync(TEST_COUNT_CACHE, String(total));
};

/**
 * Precommit step definitions.
 *
 * Lint / SCSS / knip use the read-only check variants (no `--write` / `--fix`)
 * so a commit hook never mutates the checkout mid-commit. If formatting or
 * dead-code is found the step fails; run `bun run lint:fix` / `bun run
 * knip:fix` and re-stage. The test step uses `--dots` so the runner can stream
 * live `(N/total passed)` progress even when stdout is piped.
 */
export const getSteps = () => {
  const cachedTotal = existsSync(TEST_COUNT_CACHE)
    ? Number.parseInt(readFileSync(TEST_COUNT_CACHE, "utf8").trim(), 10)
    : Number.NaN;

  return [
    { name: "install", cmd: ["bun", "install"] },
    {
      name: "generate-types",
      cmd: ["bun", "scripts/generate-pages-cms-types.js"],
    },
    { name: "lint", cmd: ["bun", "run", "lint"] },
    { name: "lint:scss", cmd: ["bun", "run", "lint:scss"] },
    { name: "knip", cmd: ["bun", "run", "knip"] },
    { name: "typecheck", cmd: ["bun", "run", "typecheck"] },
    { name: "typecheck:strict", cmd: ["bun", "run", "typecheck:strict"] },
    { name: "cpd:fp", cmd: ["bun", "run", "cpd:fp"] },
    { name: "cpd:design-system", cmd: ["bun", "run", "cpd:design-system"] },
    { name: "cpd", cmd: ["bun", "run", "cpd"] },
    { name: "cpd:ratchet", cmd: ["bun", "run", "cpd:ratchet"] },
    {
      name: "tests",
      cmd: ["bun", "test", "--dots", "--timeout", "1500"],
      progress: createDotsProgress(
        Number.isFinite(cachedTotal) && cachedTotal > 0
          ? cachedTotal
          : undefined,
      ),
      postRun: persistTestTotal,
    },
  ];
};
