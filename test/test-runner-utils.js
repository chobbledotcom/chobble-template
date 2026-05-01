/**
 * Shared utilities for test runners (precommit.js and run-tests.js)
 */

import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { ROOT_DIR } from "#lib/paths.js";

const rootDir = ROOT_DIR;

/** Check if --verbose flag was passed on command line */
export const verbose = process.argv.includes("--verbose");

/**
 * Check if the current module is the main entry point.
 * @param {string} importMetaUrl - The import.meta.url of the calling module
 * @returns {boolean}
 */
export const isMainModule = (importMetaUrl) =>
  importMetaUrl === `file://${process.argv[1]}`;

/**
 * @typedef {Object} TruncateOptions
 * @property {number} [maxItems=10] - Maximum items to show
 * @property {string} [prefix="  "] - Prefix for each line
 * @property {string} [moreLabel="more"] - Label for "more" message
 * @property {string} [suffix="(use --verbose to see all)"] - Suffix for "more" message
 */

/**
 * Print items with truncation and "more" message.
 * Logs each item (up to maxItems) with a prefix, then shows "more" message if truncated.
 * Curried: configure options first, then pass items.
 *
 * @param {TruncateOptions} [options] - Truncation options
 * @returns {(items: Array) => void} Function that prints items
 *
 * @example
 * printTruncatedList()(errors);  // uses defaults
 * printTruncatedList({ moreLabel: "errors" })(errors);
 */
export const printTruncatedList =
  ({
    maxItems = 10,
    prefix = "  ",
    moreLabel = "more",
    suffix = "(use --verbose to see all)",
  } = {}) =>
  (items) => {
    for (const item of items.slice(0, maxItems)) {
      console.log(`${prefix}${item}`);
    }
    if (items.length > maxItems) {
      console.log(
        `${prefix}... and ${items.length - maxItems} ${moreLabel} ${suffix}`,
      );
    }
  };

/**
 * Extract uncovered line numbers from DA: entries in an lcov record.
 * @param {string} record - A single lcov record (between SF: and end_of_record)
 * @returns {number[]} Line numbers with zero hits
 */
export const extractUncoveredLines = (record) => {
  const matches = record.matchAll(/^DA:(\d+),0$/gm);
  const lines = [];
  for (const m of matches) lines.push(Number.parseInt(m[1], 10));
  return lines;
};

/**
 * Extract uncovered branch line numbers from BRDA: entries, deduped by line.
 * First-seen order is preserved.
 * @param {string} record - A single lcov record
 * @returns {number[]} Line numbers with at least one uncovered branch
 */
export const extractUncoveredBranchLines = (record) => {
  const matches = record.matchAll(/^BRDA:(\d+),\d+,\d+,(-|0)$/gm);
  const seen = new Set();
  const lines = [];
  for (const m of matches) {
    const line = Number.parseInt(m[1], 10);
    if (!seen.has(line)) {
      seen.add(line);
      lines.push(line);
    }
  }
  return lines;
};

/**
 * Format uncovered line numbers as an indented suffix, or "" if none.
 * @param {string} label - Label for the list (e.g. "lines", "branches")
 * @param {number[]} nums - Uncovered line numbers
 * @returns {string}
 */
export const formatUncovered = (label, nums) => {
  if (nums.length === 0) return "";
  return `\n      uncovered ${label}: ${nums.join(", ")}`;
};

/**
 * Check a coverage metric (lines or branches) in an lcov record.
 * @param {string} record - A single lcov record
 * @param {string} hitKey - Key for hit count (e.g. "LH", "BRH")
 * @param {string} foundKey - Key for found count (e.g. "LF", "BRF")
 * @param {string} file - Source file path
 * @param {string} label - Human label for the metric
 * @param {string} uncoveredSuffix - Precomputed suffix from formatUncovered
 * @returns {string|undefined} Failure string or undefined when fully covered
 */
export const checkMetric = (
  record,
  hitKey,
  foundKey,
  file,
  label,
  uncoveredSuffix,
) => {
  const hitMatch = record.match(new RegExp(`^${hitKey}:(\\d+)$`, "m"));
  const foundMatch = record.match(new RegExp(`^${foundKey}:(\\d+)$`, "m"));
  if (!hitMatch || !foundMatch) return undefined;
  const hit = Number.parseInt(hitMatch[1], 10);
  const found = Number.parseInt(foundMatch[1], 10);
  return hit < found
    ? `${file}: ${hit}/${found} ${label} covered${uncoveredSuffix}`
    : undefined;
};

/**
 * Check line and branch metrics on an lcov record, pushing failures into the
 * provided arrays.
 * @param {string} record - A single lcov record
 * @param {string} file - Source file path (from SF:)
 * @param {string[]} lineFailures - Mutated with line-coverage failures
 * @param {string[]} branchFailures - Mutated with branch-coverage failures
 */
export const checkRecord = (record, file, lineFailures, branchFailures) => {
  const lineSuffix = formatUncovered("lines", extractUncoveredLines(record));
  const branchSuffix = formatUncovered(
    "branches",
    extractUncoveredBranchLines(record),
  );
  const lineFail = checkMetric(record, "LH", "LF", file, "lines", lineSuffix);
  if (lineFail) lineFailures.push(lineFail);
  const branchFail = checkMetric(
    record,
    "BRH",
    "BRF",
    file,
    "branches",
    branchSuffix,
  );
  if (branchFail) branchFailures.push(branchFail);
};

/**
 * Read coveragePathIgnorePatterns from bunfig.toml.
 * Returns [] when the file does not exist.
 * Throws when the file exists but the expected array block is missing.
 * @param {string} bunfigPath - Absolute path to bunfig.toml
 * @returns {string[]}
 */
export const readCoverageIgnorePatterns = (bunfigPath) => {
  if (!existsSync(bunfigPath)) return [];
  const text = readFileSync(bunfigPath, "utf8");
  const block = text.match(/coveragePathIgnorePatterns\s*=\s*\[([\s\S]*?)\]/);
  if (!block) {
    throw new Error(
      `coveragePathIgnorePatterns not found in ${bunfigPath}. ` +
        "If the key was renamed, update readCoverageIgnorePatterns.",
    );
  }
  const entries = [];
  for (const m of block[1].matchAll(/"([^"]+)"/g)) entries.push(m[1]);
  return entries;
};

/**
 * Parse an lcov.info text into per-file failure strings.
 * @param {string} lcovText - Contents of lcov.info
 * @param {string[]} excludes - Paths to skip (from coveragePathIgnorePatterns)
 * @returns {{ lineFailures: string[], branchFailures: string[] }}
 */
export const parseLcov = (lcovText, excludes) => {
  const excludeSet = new Set(excludes);
  const lineFailures = [];
  const branchFailures = [];
  const records = lcovText.split(/^end_of_record$/m);
  for (const record of records) {
    const sfMatch = record.match(/^SF:(.+)$/m);
    if (!sfMatch) continue;
    const file = sfMatch[1].trim();
    if (excludeSet.has(file)) continue;
    checkRecord(record, file, lineFailures, branchFailures);
  }
  return { lineFailures, branchFailures };
};

/**
 * When a coverage failure occurs, read lcov.info and print per-file gaps.
 * @param {string} lcovPath - Absolute path to coverage/lcov.info
 * @param {string} bunfigPath - Absolute path to bunfig.toml
 * @returns {boolean} True when a report was printed, false otherwise
 */
export const reportCoverageFailures = (lcovPath, bunfigPath) => {
  if (!existsSync(lcovPath)) return false;
  const lcovText = readFileSync(lcovPath, "utf8");
  const excludes = readCoverageIgnorePatterns(bunfigPath);
  const { lineFailures, branchFailures } = parseLcov(lcovText, excludes);
  const all = [...lineFailures, ...branchFailures];
  if (all.length === 0) return false;
  console.log("\n  Per-file coverage gaps:");
  printTruncatedList({ prefix: "    ", moreLabel: "files" })(all);
  return true;
};

/**
 * Common step definitions used by test runners
 * @type {Object.<string, Object>}
 */
export const COMMON_STEPS = {
  install: { name: "install", cmd: "bun", args: ["install"] },
  generateTypes: {
    name: "generate-types",
    cmd: "bun",
    args: ["scripts/generate-pages-cms-types.js"],
  },
  lint: { name: "lint", cmd: "bun", args: ["run", "lint"] },
  lintFix: { name: "lint:fix", cmd: "bun", args: ["run", "lint:fix"] },
  knipFix: { name: "knip:fix", cmd: "bun", args: ["run", "knip:fix"] },
  typecheck: { name: "typecheck", cmd: "bun", args: ["run", "typecheck"] },
  typecheckStrict: {
    name: "typecheck:strict",
    cmd: "bun",
    args: ["run", "typecheck:strict"],
  },
  cpdFp: { name: "cpd:fp", cmd: "bun", args: ["run", "cpd:fp"] },
  cpdDesignSystem: {
    name: "cpd:design-system",
    cmd: "bun",
    args: ["run", "cpd:design-system"],
  },
  cpd: { name: "cpd", cmd: "bun", args: ["run", "cpd"] },
  cpdRatchet: { name: "cpd:ratchet", cmd: "bun", args: ["run", "cpd:ratchet"] },
  test: { name: "test", cmd: "bun", args: ["test", "--timeout", "30000"] },
  build: {
    name: "build",
    cmd: "bun",
    args: ["./node_modules/@11ty/eleventy/cmd.cjs", "--quiet"],
  },
};

/**
 * Create a tests step with coverage and optional verbose flag
 * @param {boolean} verbose - Whether to include verbose flag
 * @returns {Object} Tests step configuration
 */
export const coverageStep = (verbose) => ({
  name: "tests",
  cmd: "bun",
  args: [
    "test",
    "--coverage",
    "--coverage-reporter=lcov",
    "--coverage-reporter=text",
    "--concurrent",
    "--timeout",
    "30000",
    ...(verbose ? ["--verbose"] : []),
  ],
});

/**
 * Run a single test step
 * @param {Object} step - Step configuration
 * @param {boolean} verbose - Whether to show full output
 * @returns {Object} Result with status and output
 */
export function runStep(step, verbose) {
  // Always capture stdout/stderr so we can extract errors for the summary
  // If verbose, we'll print the output after capturing it
  const result = spawnSync(step.cmd, step.args, {
    cwd: rootDir,
    stdio: ["inherit", "pipe", "pipe"],
    env: {
      ...process.env,
      VERBOSE: verbose ? "1" : "0",
    },
  });

  const stdout = result.stdout?.toString() || "";
  const stderr = result.stderr?.toString() || "";

  // In verbose mode, print captured output to console
  if (verbose) {
    if (stdout) process.stdout.write(stdout);
    if (stderr) process.stderr.write(stderr);
  }

  return {
    status: result.status,
    stdout,
    stderr,
  };
}

/**
 * Extract error messages from test output
 * @param {string} output - Raw output text
 * @returns {string[]} Array of error messages
 */
export function extractErrorsFromOutput(output) {
  const lines = output.split("\n");
  const errors = [];

  for (const line of lines) {
    const trimmed = line.trim();

    // Skip empty lines and cruft
    if (!trimmed) continue;

    // Skip command outputs and file paths at the start
    if (trimmed.startsWith("$") || trimmed.startsWith("/")) continue;

    // Skip image filenames and other generic file paths
    if (
      trimmed.endsWith(".jpg") ||
      trimmed.endsWith(".png") ||
      trimmed.endsWith(".gif")
    ) {
      continue;
    }

    // Skip long command lines that start with "node -e"
    if (trimmed.startsWith("node -e")) continue;

    // Skip Bun's passing test output lines (they may contain words like "error" or "FAIL" in test names)
    if (trimmed.startsWith("(pass)")) continue;

    // Look for error indicators
    const hasErrorIndicator =
      trimmed.startsWith("❌") ||
      trimmed.startsWith("error:") ||
      trimmed.startsWith("Error:") ||
      trimmed.startsWith("AssertionError:") ||
      trimmed.includes("FAIL") ||
      (trimmed.toLowerCase().includes("fail") && trimmed !== "0 fail") ||
      trimmed.includes("below threshold") ||
      trimmed.includes("must have test coverage") ||
      // Coverage errors like "Uncovered lines: 10-15" but not table header "Uncovered Line #s"
      /Uncovered lines?:/i.test(trimmed);

    // Detect coverage table rows with uncovered lines (Bun coverage output format)
    // Format: " src/file.js | 95.00 | 90.00 | 21-22,41" or "All files | 99.00 | 98.00 |"
    const coverageTableMatch = trimmed.match(
      /^(.+?)\s*\|\s*(\d+\.?\d*)\s*\|\s*(\d+\.?\d*)\s*\|\s*(.*)$/,
    );
    if (coverageTableMatch) {
      const [, , , , uncoveredLines] = coverageTableMatch;
      // Include rows that have uncovered lines listed
      if (uncoveredLines?.trim()) {
        errors.push(trimmed);
        continue;
      }
    }

    // Look for tool-specific error patterns
    const hasToolPattern =
      // Knip outputs: "Unused files (3)", "Unused exports (5)", etc.
      /^Unused (files|exports|dependencies|types)/i.test(trimmed) ||
      /^Unlisted dependencies/i.test(trimmed) ||
      // Duplication/jscpd: "Clone found", "Duplication detected"
      /^(Clone found|Duplication detected|Total duplicates)/i.test(trimmed) ||
      // Test counts: "2 tests failed", "15 errors found"
      /\d+ (tests?|errors?) (failed|found)/i.test(trimmed) ||
      // Coverage patterns
      /coverage.*\d+%/i.test(trimmed);

    if (hasErrorIndicator || hasToolPattern) {
      errors.push(trimmed);
    }

    // Include coverage violation details (path/file.ext: items)
    // These lines show which specific files/lines/functions/branches need coverage
    // Matches patterns like: src/file.js: 10, 20 or src/file.js: funcName, otherFunc
    // BUT skip informational test output from allowlist tracking:
    //   - HTML-in-JS allowlist: "file.js: N instance(s)"
    //   - try-catch allowlist: "file.js: lines N, N, N"
    //   - let/const allowlist: "file.js: N usage(s)"
    if (
      /^[\w./-]+\.\w+:\s*.+$/.test(trimmed) &&
      !trimmed.includes("instance(s)") &&
      !trimmed.includes("usage(s)") &&
      !/:\s*lines\s+\d/.test(trimmed) // Skip "file.js: lines 12, 28" pattern
    ) {
      errors.push(trimmed);
    }

    // Include stack trace lines that provide context (but not all of them)
    // Match lines like "at Object.<anonymous> (src/index.js:5:15)"
    // Note: trimmed already has leading whitespace removed
    if (/^at .+\(.+:\d+:\d+\)/.test(trimmed)) {
      // Only include the first few stack frames (limit added when displaying)
      errors.push(trimmed);
    }
  }

  return errors;
}

/**
 * Run all steps in sequence, stopping on first failure
 * @param {Object} options - Runner options
 * @param {Object[]} options.steps - Array of step configurations
 * @param {boolean} options.verbose - Whether to show full output
 * @param {string} options.title - Title for summary output
 * @returns {Object} Results map from step names to results
 */
export function runSteps({ steps, verbose, title }) {
  const results = {};

  for (const step of steps) {
    const result = runStep(step, verbose);
    results[step.name] = result;

    if (result.status !== 0) {
      printSummary(steps, results, title);
      process.exit(1);
    }
  }

  printSummary(steps, results, title);
  return results;
}

/**
 * Print the coverage-failure diagnostic block when the failed step output
 * matches the "tests passed + coverage table present" heuristic.
 */
const printCoverageFailureBlock = () => {
  const lcovPath = join(rootDir, "coverage/lcov.info");
  const bunfigPath = join(rootDir, "bunfig.toml");
  const reported = reportCoverageFailures(lcovPath, bunfigPath);
  if (!reported) {
    console.log("  Coverage threshold not met. Check coverage output above.");
  }
  console.log("  Thresholds are defined in bunfig.toml (coverageThreshold).");
};

/**
 * Print the generic "last 15 lines" fallback for a failed step with no
 * specific errors extracted.
 */
const printGenericFailureBlock = (result, allOutput) => {
  console.log("  No specific errors extracted. Last 15 lines of output:");
  const outputLines = allOutput.split("\n");
  const lastLines = outputLines.slice(-15).filter((l) => l.trim());
  for (const line of lastLines) {
    console.log(`  ${line}`);
  }
  console.log("\n  Run with --verbose to see full output, or check exit code:");
  console.log(`  Exit code: ${result.status}`);
};

/**
 * Print diagnostics for a single failing step when no errors were extracted.
 * Branches between the coverage-failure report and the generic fallback.
 */
const printStepFailureDiagnostics = (result) => {
  const allOutput = result.stderr || result.stdout || "";
  const hasPassingTests = /\d+ pass/.test(allOutput);
  const hasZeroFail = /0 fail/.test(allOutput);
  const hasCoverageTable = /% Funcs.*% Lines/.test(allOutput);
  if (hasPassingTests && hasZeroFail && hasCoverageTable) {
    printCoverageFailureBlock();
  } else {
    printGenericFailureBlock(result, allOutput);
  }
};

/**
 * Print a summary of test results
 * @param {Object[]} steps - Array of step configurations
 * @param {Object} results - Map of step names to results
 * @param {string} title - Title for the summary section
 */
export function printSummary(steps, results, title = "SUMMARY") {
  console.log(`\n${"=".repeat(60)}`);
  console.log(title);
  console.log("=".repeat(60));

  const passedSteps = [];
  const failedSteps = [];

  for (const step of steps) {
    const result = results[step.name];
    if (!result) continue; // Skip if step wasn't run
    if (result.status === 0) {
      passedSteps.push(step.name);
    } else {
      failedSteps.push(step.name);
    }
  }

  const allPassed = failedSteps.length === 0;

  // Print passed checks
  if (passedSteps.length > 0) {
    console.log(`✅ Passed: ${passedSteps.join(", ")}`);
  }

  // Print failed checks with errors
  if (failedSteps.length > 0) {
    console.log(`\n❌ Failed: ${failedSteps.join(", ")}`);

    for (const step of failedSteps) {
      const result = results[step];
      const errors = [
        ...extractErrorsFromOutput(result.stdout),
        ...extractErrorsFromOutput(result.stderr),
      ];

      console.log(`\n${step} errors:`);
      if (errors.length > 0) {
        printTruncatedList({ moreLabel: "errors" })(errors);
      } else {
        printStepFailureDiagnostics(result);
      }
    }
  }

  console.log("=".repeat(60));

  if (!allPassed) {
    process.exit(1);
  }
}
