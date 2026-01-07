/**
 * Shared utilities for test runners (precommit.js and run-tests.js)
 */

import { spawnSync } from "node:child_process";
import { ROOT_DIR } from "#lib/paths.js";
import { printTruncatedList } from "#utils/array-utils.js";

const rootDir = ROOT_DIR;

/**
 * Run a single test step
 * @param {Object} step - Step configuration
 * @param {boolean} verbose - Whether to show full output
 * @returns {Object} Result with status and output
 */
export function runStep(step, verbose) {
  const stdio = verbose ? "inherit" : ["inherit", "pipe", "pipe"];

  const result = spawnSync(step.cmd, step.args, {
    cwd: rootDir,
    stdio,
    env: {
      ...process.env,
      VERBOSE: verbose ? "1" : "0",
    },
  });

  return {
    status: result.status,
    stdout: result.stdout?.toString() || "",
    stderr: result.stderr?.toString() || "",
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

    // Look for error indicators
    const hasErrorIndicator =
      trimmed.startsWith("❌") ||
      trimmed.startsWith("error:") ||
      trimmed.startsWith("Error:") ||
      trimmed.startsWith("AssertionError:") ||
      trimmed.includes("FAIL") ||
      trimmed.toLowerCase().includes("fail") ||
      trimmed.includes("below threshold") ||
      // Coverage-related errors
      trimmed.includes("Uncovered") ||
      trimmed.includes("must have test coverage");

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
        // Show last 15 lines of output when no specific errors extracted
        console.log("  No specific errors extracted. Last 15 lines of output:");
        const allOutput = (result.stderr || result.stdout || "").split("\n");
        const lastLines = allOutput.slice(-15).filter((l) => l.trim());
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

  console.log("=".repeat(60));

  if (!allPassed) {
    process.exit(1);
  }
}
