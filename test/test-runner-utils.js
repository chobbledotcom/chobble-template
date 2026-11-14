/**
 * Shared utilities for test runners (precommit.js and run-tests.js)
 */

import { spawn } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { globSync } from "tinyglobby";
import { ROOT_DIR } from "#lib/paths.js";
import { COVERAGE_IGNORE } from "#test/coverage-ignore.js";
import { compact, unique } from "#utils/fp/array.js";
import { frozenSet } from "#utils/fp/set.js";

const rootDir = ROOT_DIR;

/** Check if --verbose flag was passed on command line */
export const verbose = process.argv.includes("--verbose");

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
export const extractUncoveredLines = (record) =>
  [...record.matchAll(/^DA:(\d+),0$/gm)].map((m) => Number.parseInt(m[1], 10));

/**
 * Extract uncovered branch line numbers from BRDA: entries, deduped by line.
 * First-seen order is preserved.
 * @param {string} record - A single lcov record
 * @returns {number[]} Line numbers with at least one uncovered branch
 */
export const extractUncoveredBranchLines = (record) =>
  unique(
    [...record.matchAll(/^BRDA:(\d+),\d+,\d+,(-|0)$/gm)].map((m) =>
      Number.parseInt(m[1], 10),
    ),
  );

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
 * Check line and branch metrics on an lcov record.
 * @param {string} record - A single lcov record
 * @param {string} file - Source file path (from SF:)
 * @returns {{ lineFailures: string[], branchFailures: string[] }} Line- and branch-coverage failures found in the record
 */
export const checkRecord = (record, file) => {
  const lineSuffix = formatUncovered("lines", extractUncoveredLines(record));
  const branchSuffix = formatUncovered(
    "branches",
    extractUncoveredBranchLines(record),
  );

  return {
    lineFailures: compact([
      checkMetric(record, "LH", "LF", file, "lines", lineSuffix),
    ]),
    branchFailures: compact([
      checkMetric(record, "BRH", "BRF", file, "branches", branchSuffix),
    ]),
  };
};

/**
 * Parse an lcov.info text into per-file failure strings.
 * @param {string} lcovText - Contents of lcov.info
 * @param {string[]} excludes - Paths to skip (from coveragePathIgnorePatterns)
 * @returns {{ lineFailures: string[], branchFailures: string[] }}
 */
export const parseLcov = (lcovText, excludes) => {
  const excludeSet = frozenSet(excludes);
  const recordFailures = lcovText
    .split(/^end_of_record$/m)
    .flatMap((record) => {
      const file = record.match(/^SF:(.+)$/m)?.[1].trim();
      if (!file || excludeSet.has(file)) return [];
      return [checkRecord(record, file)];
    });

  return {
    lineFailures: recordFailures.flatMap((r) => r.lineFailures),
    branchFailures: recordFailures.flatMap((r) => r.branchFailures),
  };
};

/**
 * When a coverage failure occurs, read lcov.info and print per-file gaps.
 * @param {string} lcovPath - Absolute path to coverage/lcov.info
 * @returns {boolean} True when a report was printed, false otherwise
 */
export const reportCoverageFailures = (lcovPath) => {
  if (!existsSync(lcovPath)) return false;
  const lcovText = readFileSync(lcovPath, "utf8");
  const { lineFailures, branchFailures } = parseLcov(lcovText, COVERAGE_IGNORE);
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
  lint: { name: "lint", cmd: "npm", args: ["run", "lint"] },
  lintScss: { name: "lint:scss", cmd: "npm", args: ["run", "lint:scss"] },
  typecheck: { name: "typecheck", cmd: "npm", args: ["run", "typecheck"] },
  typecheckStrict: {
    name: "typecheck:strict",
    cmd: "npm",
    args: ["run", "typecheck:strict"],
  },
  cpd: { name: "cpd", cmd: "npm", args: ["run", "cpd"] },
  cpdRatchet: { name: "cpd:ratchet", cmd: "npm", args: ["run", "cpd:ratchet"] },
  knip: { name: "knip", cmd: "npm", args: ["run", "knip"] },
  build: {
    name: "build",
    cmd: "npm",
    args: ["run", "build"],
  },
  checkA11y: {
    name: "check:a11y",
    cmd: "npm",
    args: ["run", "check:a11y"],
  },
};

export const getNonCodeQualityTestFiles = (pattern) =>
  globSync(pattern, { cwd: rootDir }).filter(
    (file) => !file.startsWith("test/unit/code-quality/"),
  );

/**
 * Create the unit tests step with coverage and optional verbose flag.
 * Unit tests alone satisfy the 100% coverage thresholds; integration tests
 * run their Eleventy builds in child processes that coverage never sees,
 * so instrumenting them adds time without adding signal. The code-quality
 * suite also runs in its own earlier fast-fail lane, but it must run here
 * too: it is what exercises the shared code-analysis utilities, so the
 * coverage thresholds depend on it.
 * @param {boolean} verbose - Whether to include verbose flag
 * @returns {Object} Unit tests step configuration
 */
export const unitTestsStep = (verbose) => ({
  name: "tests:unit",
  cmd: "npx",
  args: [
    "vitest",
    "run",
    "test/unit",
    "--coverage",
    ...(verbose ? ["--reporter=verbose"] : []),
  ],
});

export const codeQualityTestsStep = {
  name: "tests:code-quality",
  cmd: "npx",
  args: ["vitest", "run", "test/unit/code-quality"],
};

/**
 * Integration tests step (no coverage - see unitTestsStep).
 * @type {Object}
 */
export const integrationTestsStep = {
  name: "tests:integration",
  cmd: "npx",
  args: ["vitest", "run", "test/integration"],
};

/** Drain a step's output stream into a string */
const drainStepOutput = async (stream) =>
  Buffer.concat(await Array.fromAsync(stream)).toString();

/**
 * Run a single step asynchronously so independent steps can overlap.
 * Output is always captured so errors can be extracted for the summary;
 * verbose mode prints it after capturing.
 * @param {Object} step - Step configuration
 * @param {boolean} verbose - Whether to show full output
 * @returns {Promise<Object>} Result with status and output
 */
export const runStepAsync = async (step, verbose) => {
  const child = spawn(step.cmd, step.args, {
    cwd: rootDir,
    stdio: ["ignore", "pipe", "pipe"],
    env: {
      ...process.env,
      VERBOSE: verbose ? "1" : "0",
    },
  });

  const [stdout, stderr, status] = await Promise.all([
    drainStepOutput(child.stdout),
    drainStepOutput(child.stderr),
    new Promise((resolve) => child.on("close", resolve)),
  ]);

  if (verbose) {
    if (stdout) process.stdout.write(stdout);
    if (stderr) process.stderr.write(stderr);
  }
  return { status, stdout, stderr };
};

/**
 * Run one lane's steps sequentially, returning [name, result] entries.
 * Stops the lane at the first failure; other lanes are unaffected.
 * @param {Object[]} lane - Steps to run in order
 * @param {boolean} verbose - Whether to show full output
 * @param {[string, Object][]} entries - Results recorded so far
 * @returns {Promise<[string, Object][]>} Recorded entries
 */
const runLane = async (lane, verbose, entries = []) => {
  const [step, ...rest] = lane;
  if (!step) return entries;

  const startedAt = Date.now();
  const result = await runStepAsync(step, verbose);
  const seconds = ((Date.now() - startedAt) / 1000).toFixed(1);
  const mark = result.status === 0 ? "✓" : "✗";
  console.log(`${mark} ${step.name} (${seconds}s)`);

  const recorded = [...entries, [step.name, result]];
  return result.status === 0 ? runLane(rest, verbose, recorded) : recorded;
};

/**
 * Run lanes of steps: lanes execute in parallel, steps within a lane
 * execute sequentially. All lanes run to completion (or first failure
 * within the lane) so the summary reports every failure at once.
 * @param {Object} options - Runner options
 * @param {Object[][]} options.lanes - Arrays of step configurations
 * @param {boolean} options.verbose - Whether to show full output
 * @param {string} options.title - Title for summary output
 * @returns {Promise<Object>} Results map from step names to results
 */
export const runLanes = async ({ lanes, verbose, title }) => {
  const entries = (
    await Promise.all(lanes.map((lane) => runLane(lane, verbose)))
  ).flat();
  const results = Object.fromEntries(entries);
  printSummary(lanes.flat(), results, title);
  return results;
};

/**
 * Extract error messages from test output
 * @param {string} output - Raw output text
 * @returns {string[]} Array of error messages
 */
export function extractErrorsFromOutput(output) {
  /**
   * Collect one clone block's lines, starting at the "❌ Clone found" marker.
   * Stops before a blank line or the tool's summary/guidance.
   * @param {string[]} lines - Full output lines
   * @param {number} startIndex - Index of the block's first line
   * @returns {string[]} Trimmed lines of the block, marker included
   */
  const cloneBlockLines = (lines, startIndex) => {
    const remaining = lines.slice(startIndex);
    const end = remaining.findIndex((line, offset) => {
      const trimmed = line.trim();
      return (
        offset > 0 &&
        (!trimmed ||
          trimmed === "jscpd found duplicated code." ||
          trimmed.startsWith("Do not use "))
      );
    });
    return remaining
      .slice(0, end === -1 ? remaining.length : end)
      .map((line) => line.trimEnd());
  };

  const extractCpdCloneBlocks = (lines) => {
    const cloneStartIndexes = lines.flatMap((line, index) =>
      line.trim().startsWith("❌ Clone found") ? [index] : [],
    );
    const blocks = cloneStartIndexes.map((startIndex) => ({
      startIndex,
      collected: cloneBlockLines(lines, startIndex),
    }));
    return {
      cloneBlocks: blocks.map((block) => block.collected.join("\n")),
      consumedLines: frozenSet(
        blocks.flatMap((block) =>
          Array.from(
            { length: block.collected.length },
            (_, offset) => block.startIndex + offset,
          ),
        ),
      ),
    };
  };

  const isSkippableErrorLine = (line) =>
    !line ||
    line.startsWith("$") ||
    line.startsWith("/") ||
    line.endsWith(".jpg") ||
    line.endsWith(".png") ||
    line.endsWith(".gif") ||
    line.startsWith("node -e") ||
    line.startsWith("(pass)");

  const hasErrorIndicator = (line) =>
    line.startsWith("❌") ||
    line.startsWith("error:") ||
    line.startsWith("Error:") ||
    line.startsWith("AssertionError:") ||
    line.includes("FAIL") ||
    (line.toLowerCase().includes("fail") && line !== "0 fail") ||
    line.includes("below threshold") ||
    line.includes("must have test coverage") ||
    /Uncovered lines?:/i.test(line);

  const hasToolPattern = (line) =>
    /^Unused (files|exports|dependencies|types)/i.test(line) ||
    /^Unlisted dependencies/i.test(line) ||
    /^(Clone found|Duplication detected|Total duplicates)/i.test(line) ||
    /\d+ (tests?|errors?) (failed|found)/i.test(line) ||
    /coverage.*\d+%/i.test(line);

  const hasCoverageTableViolation = (line) => {
    const coverageTableMatch = line.match(
      /^(.+?)\s*\|\s*(\d+\.?\d*)\s*\|\s*(\d+\.?\d*)\s*\|\s*(.*)$/,
    );
    if (!coverageTableMatch) return false;

    const [, , , , uncoveredLines] = coverageTableMatch;
    return Boolean(uncoveredLines?.trim());
  };

  const isCoverageViolationDetail = (line) =>
    /^[\w./-]+\.\w+:\s*.+$/.test(line) &&
    !line.includes("instance(s)") &&
    !line.includes("usage(s)") &&
    !/:\s*lines\s+\d/.test(line);

  const isStackTraceLine = (line) => /^at .+\(.+:\d+:\d+\)/.test(line);

  const lines = output.split("\n");
  const { cloneBlocks, consumedLines } = extractCpdCloneBlocks(lines);
  const errors = [...cloneBlocks];

  for (const [index, line] of lines.entries()) {
    if (consumedLines.has(index)) continue;

    const trimmed = line.trim();

    // Skip empty lines and cruft
    if (isSkippableErrorLine(trimmed)) continue;

    if (hasCoverageTableViolation(trimmed)) {
      errors.push(trimmed);
      continue;
    }

    if (hasErrorIndicator(trimmed) || hasToolPattern(trimmed)) {
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
      isCoverageViolationDetail(trimmed) // Skip "file.js: lines 12, 28" pattern
    ) {
      errors.push(trimmed);
    }

    // Include stack trace lines that provide context (but not all of them)
    // Match lines like "at Object.<anonymous> (src/index.js:5:15)"
    // Note: trimmed already has leading whitespace removed
    if (isStackTraceLine(trimmed)) {
      // Only include the first few stack frames (limit added when displaying)
      errors.push(trimmed);
    }
  }

  return errors;
}

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

  const runSteps = steps.filter((step) => results[step.name]);
  const passedSteps = runSteps
    .filter((step) => results[step.name].status === 0)
    .map((step) => step.name);
  const failedSteps = runSteps
    .filter((step) => results[step.name].status !== 0)
    .map((step) => step.name);

  const allPassed = failedSteps.length === 0;

  // Print passed checks
  if (passedSteps.length > 0) {
    console.log(`✅ Passed: ${passedSteps.join(", ")}`);
  }

  /**
   * Print the coverage-failure diagnostic block when the failed step output
   * matches the "tests passed + coverage table present" heuristic.
   */
  const printCoverageFailureBlock = () => {
    const lcovPath = join(rootDir, "coverage/lcov.info");
    const reported = reportCoverageFailures(lcovPath);
    if (!reported) {
      console.log("  Coverage threshold not met. Check coverage output above.");
    }
    console.log("  Excluded files are listed in test/coverage-ignore.js.");
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
    console.log(
      "\n  Run with --verbose to see full output, or check exit code:",
    );
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
