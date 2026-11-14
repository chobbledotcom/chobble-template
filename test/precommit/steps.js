import {
  existsSync,
  mkdirSync,
  readFileSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";
import { ROOT_DIR } from "#lib/paths.js";
import {
  createDotsProgress,
  extractSlowTests,
  extractTestTotal,
} from "#test/precommit/output.js";
import { getNonCodeQualityTestFiles } from "#test/test-runner-utils.js";

const CACHE_DIR = join(ROOT_DIR, ".cache");
const TEST_COUNT_CACHE = join(CACHE_DIR, "precommit-test-count");
const TEST_REPORT_FILE = join(CACHE_DIR, "precommit-test-results.xml");
const SLOW_TEST_THRESHOLD_MS = 500;

/** Persist the total test count from the latest run's output, so the next
 * run can show `(N/total passed)` progress. No-op when no summary line is
 * found (the suite crashed before printing one). */
export const persistTestTotal = (output) => {
  const total = extractTestTotal(output);
  if (total === undefined) return;
  mkdirSync(CACHE_DIR, { recursive: true });
  writeFileSync(TEST_COUNT_CACHE, String(total));
};

/** Remove stale reports before starting a new test run. */
export const resetTestReport = () => {
  mkdirSync(CACHE_DIR, { recursive: true });
  if (!existsSync(TEST_REPORT_FILE)) return;
  unlinkSync(TEST_REPORT_FILE);
};

/**
 * Print slow test names as a warning. This is intentionally non-blocking:
 * slow tests never fail precommit, they only make expensive tests visible.
 */
export const reportSlowTests = () => {
  if (!existsSync(TEST_REPORT_FILE)) return;

  const slowTests = extractSlowTests(
    readFileSync(TEST_REPORT_FILE, "utf8"),
    SLOW_TEST_THRESHOLD_MS,
  );
  if (slowTests.length === 0) return;

  console.log(`\nSlow tests (>${SLOW_TEST_THRESHOLD_MS}ms):`);
  for (const test of slowTests) {
    const location = test.file
      ? ` (${test.file}${test.line ? `:${test.line}` : ""})`
      : "";
    console.log(`  ${test.durationMs}ms ${test.name}${location}`);
  }
};

export const finishTestRun = (output, status) => {
  persistTestTotal(output);
  if (status !== 0) return;
  reportSlowTests();
};

/**
 * Precommit step definitions.
 *
 * Lint / SCSS / knip use the read-only check variants (no `--write` / `--fix`)
 * so a commit hook never mutates the checkout mid-commit. If formatting or
 * dead-code is found the step fails; run `npm run lint:fix` / `npm run
 * knip:fix` and re-stage. Generated artifacts are checked for freshness, not
 * regenerated, so a stale index cannot pass via a repaired working tree.
 * The test step uses the dot reporter so the runner
 * can stream live `(N/total passed)` progress even when stdout is piped.
 */
export const getSteps = () => {
  const cachedTotal = existsSync(TEST_COUNT_CACHE)
    ? Number.parseInt(readFileSync(TEST_COUNT_CACHE, "utf8").trim(), 10)
    : Number.NaN;

  return [
    { name: "install", cmd: ["npm", "install"] },
    {
      name: "tests:code-quality",
      cmd: ["npx", "vitest", "run", "test/unit/code-quality"],
    },
    { name: "lint", cmd: ["npm", "run", "lint"] },
    { name: "lint:scss", cmd: ["npm", "run", "lint:scss"] },
    { name: "knip", cmd: ["npm", "run", "knip"] },
    { name: "typecheck", cmd: ["npm", "run", "typecheck"] },
    { name: "typecheck:strict", cmd: ["npm", "run", "typecheck:strict"] },
    { name: "cpd", cmd: ["npm", "run", "cpd"] },
    { name: "cpd:ratchet", cmd: ["npm", "run", "cpd:ratchet"] },
    {
      name: "tests",
      cmd: [
        "npx",
        "vitest",
        "run",
        ...getNonCodeQualityTestFiles("test/**/*.test.js"),
        "--reporter=dot",
        "--reporter=junit",
        `--outputFile.junit=${TEST_REPORT_FILE}`,
      ],
      preRun: resetTestReport,
      progress: createDotsProgress(
        Number.isFinite(cachedTotal) && cachedTotal > 0
          ? cachedTotal
          : undefined,
      ),
      postRun: finishTestRun,
    },
  ];
};
