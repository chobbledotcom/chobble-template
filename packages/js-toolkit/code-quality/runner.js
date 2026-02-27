/**
 * Test runner utilities for precommit and CI workflows.
 */
import { spawnSync } from "node:child_process";
import { frozenObject } from "../fp/object.js";

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
const printTruncatedList =
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
 * Common step definitions used by test runners.
 * These use bun as the command runner.
 * @type {Object.<string, Object>}
 */
const COMMON_STEPS = frozenObject({
  install: { name: "install", cmd: "bun", args: ["install"] },
  lint: { name: "lint", cmd: "bun", args: ["run", "lint"] },
  lintFix: { name: "lint:fix", cmd: "bun", args: ["run", "lint:fix"] },
  knipFix: { name: "knip:fix", cmd: "bun", args: ["run", "knip:fix"] },
  typecheck: { name: "typecheck", cmd: "bun", args: ["run", "typecheck"] },
  cpd: { name: "cpd", cmd: "bun", args: ["run", "cpd"] },
  test: { name: "test", cmd: "bun", args: ["test", "--timeout", "30000"] },
});

/**
 * Create a tests step with coverage and optional verbose flag
 * @param {boolean} verbose - Whether to include verbose flag
 * @returns {Object} Tests step configuration
 */
const coverageStep = (verbose) => ({
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
 * @param {string} rootDir - Root directory to run from
 * @returns {Object} Result with status and output
 */
const runStep = (step, verbose, rootDir) => {
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

  if (verbose) {
    if (stdout) process.stdout.write(stdout);
    if (stderr) process.stderr.write(stderr);
  }

  return {
    status: result.status,
    stdout,
    stderr,
  };
};

/**
 * Check if a line should be skipped (not an error)
 * @param {string} trimmed - Trimmed line
 * @returns {boolean} True if line should be skipped
 */
const shouldSkipLine = (trimmed) =>
  !trimmed ||
  trimmed.startsWith("$") ||
  trimmed.startsWith("/") ||
  trimmed.endsWith(".jpg") ||
  trimmed.endsWith(".png") ||
  trimmed.endsWith(".gif") ||
  trimmed.startsWith("node -e") ||
  trimmed.startsWith("(pass)");

/**
 * Check if line has error indicators
 * @param {string} trimmed - Trimmed line
 * @returns {boolean} True if line has error indicators
 */
const hasErrorIndicator = (trimmed) =>
  trimmed.startsWith("❌") ||
  trimmed.startsWith("error:") ||
  trimmed.startsWith("Error:") ||
  trimmed.startsWith("AssertionError:") ||
  trimmed.includes("FAIL") ||
  (trimmed.toLowerCase().includes("fail") && trimmed !== "0 fail") ||
  trimmed.includes("below threshold") ||
  trimmed.includes("must have test coverage") ||
  /Uncovered lines?:/i.test(trimmed);

/**
 * Check if line matches tool-specific error patterns
 * @param {string} trimmed - Trimmed line
 * @returns {boolean} True if line matches tool patterns
 */
const hasToolPattern = (trimmed) =>
  /^Unused (files|exports|dependencies|types)/i.test(trimmed) ||
  /^Unlisted dependencies/i.test(trimmed) ||
  /^(Clone found|Duplication detected|Total duplicates)/i.test(trimmed) ||
  /\d+ (tests?|errors?) (failed|found)/i.test(trimmed) ||
  /coverage.*\d+%/i.test(trimmed);

/**
 * Check if line is a coverage violation detail
 * @param {string} trimmed - Trimmed line
 * @returns {boolean} True if line is coverage detail
 */
const isCoverageViolationDetail = (trimmed) =>
  /^[\w./-]+\.\w+:\s*.+$/.test(trimmed) &&
  !trimmed.includes("instance(s)") &&
  !trimmed.includes("usage(s)") &&
  !/:\s*lines\s+\d/.test(trimmed);

/**
 * Check if line is a stack trace
 * @param {string} trimmed - Trimmed line
 * @returns {boolean} True if line is stack trace
 */
const isStackTrace = (trimmed) => /^at .+\(.+:\d+:\d+\)/.test(trimmed);

/**
 * Check if line is a coverage table row with uncovered lines
 * @param {string} trimmed - Trimmed line
 * @returns {boolean} True if coverage row with uncovered lines
 */
const hasUncovered = (trimmed) => {
  const match = trimmed.match(
    /^(.+?)\s*\|\s*(\d+\.?\d*)\s*\|\s*(\d+\.?\d*)\s*\|\s*(.*)$/,
  );
  return match?.[4]?.trim();
};

/**
 * Extract error messages from test output
 * @param {string} output - Raw output text
 * @returns {string[]} Array of error messages
 */
const extractErrorsFromOutput = (output) =>
  output
    .split("\n")
    .map((line) => line.trim())
    .filter((trimmed) => !shouldSkipLine(trimmed))
    .filter(
      (trimmed) =>
        hasUncovered(trimmed) ||
        hasErrorIndicator(trimmed) ||
        hasToolPattern(trimmed) ||
        isCoverageViolationDetail(trimmed) ||
        isStackTrace(trimmed),
    );

/**
 * Run all steps in sequence, stopping on first failure
 * @param {Object} options - Runner options
 * @param {Object[]} options.steps - Array of step configurations
 * @param {boolean} options.verbose - Whether to show full output
 * @param {string} options.title - Title for summary output
 * @param {string} options.rootDir - Root directory to run from
 * @returns {Object} Results map from step names to results
 */
const runSteps = ({ steps, verbose, title, rootDir }) => {
  const results = steps.reduce((acc, step) => {
    if (Object.values(acc).some((r) => r.status !== 0)) return acc;

    const result = runStep(step, verbose, rootDir);
    Object.assign(acc, { [step.name]: result });

    if (result.status !== 0) {
      printSummary(steps, acc, title);
      process.exit(1);
    }

    return acc;
  }, Object.create(null));

  printSummary(steps, results, title);
  return results;
};

/**
 * Print a summary of test results
 * @param {Object[]} steps - Array of step configurations
 * @param {Object} results - Map of step names to results
 * @param {string} title - Title for the summary section
 */
const printSummary = (steps, results, title = "SUMMARY") => {
  console.log(`\n${"=".repeat(60)}`);
  console.log(title);
  console.log("=".repeat(60));

  const ranSteps = steps.filter((step) => results[step.name]);
  const isPassed = (step) => results[step.name].status === 0;
  const passedSteps = ranSteps.filter(isPassed).map((s) => s.name);
  const failedSteps = ranSteps.filter((s) => !isPassed(s)).map((s) => s.name);

  const allPassed = failedSteps.length === 0;

  if (passedSteps.length > 0) {
    console.log(`✅ Passed: ${passedSteps.join(", ")}`);
  }

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
        const allOutput = result.stderr || result.stdout || "";
        const isCoverageFailure =
          /\d+ pass/.test(allOutput) &&
          /0 fail/.test(allOutput) &&
          /% Funcs.*% Lines/.test(allOutput);

        if (isCoverageFailure) {
          console.log(
            "  Coverage threshold not met. Check coverage output above.",
          );
          console.log(
            "  Thresholds are defined in bunfig.toml (coverageThreshold).",
          );
        } else {
          console.log(
            "  No specific errors extracted. Last 15 lines of output:",
          );
          const outputLines = allOutput.split("\n");
          const lastLines = outputLines.slice(-15).filter((l) => l.trim());
          for (const line of lastLines) {
            console.log(`  ${line}`);
          }
          console.log(
            "\n  Run with --verbose to see full output, or check exit code:",
          );
          console.log(`  Exit code: ${result.status}`);
        }
      }
    }
  }

  console.log("=".repeat(60));

  if (!allPassed) {
    process.exit(1);
  }
};

export {
  printTruncatedList,
  COMMON_STEPS,
  coverageStep,
  runStep,
  extractErrorsFromOutput,
  runSteps,
  printSummary,
};
