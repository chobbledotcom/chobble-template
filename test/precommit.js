#!/usr/bin/env node

/**
 * Precommit hook wrapper that reduces output verbosity by default.
 * Use --verbose flag to see full output from all checks.
 */

import { spawnSync } from "node:child_process";
import { ROOT_DIR } from "#lib/paths.js";

const rootDir = ROOT_DIR;
const verbose = process.argv.includes("--verbose");

// Define the steps to run
const steps = [
  { name: "install", cmd: "bun", args: ["install"] },
  { name: "lint:fix", cmd: "bun", args: ["run", "lint:fix"] },
  { name: "knip:fix", cmd: "bun", args: ["run", "knip:fix"] },
  { name: "test:unit", cmd: "bun", args: ["run", "test:unit"] },
];

const results = {};

function runStep(step) {
  const stdio = verbose ? "inherit" : ["inherit", "pipe", "pipe"];

  const result = spawnSync(step.cmd, step.args, {
    cwd: rootDir,
    stdio,
    env: {
      ...process.env,
      VERBOSE: verbose ? "1" : "0",
    },
  });

  results[step.name] = {
    status: result.status,
    stdout: result.stdout?.toString() || "",
    stderr: result.stderr?.toString() || "",
  };

  return result.status === 0;
}

function extractErrorsFromOutput(output) {
  const lines = output.split("\n");
  const errors = [];

  for (const line of lines) {
    const trimmed = line.trim();

    // Skip empty lines and cruft
    if (!trimmed) continue;

    // Skip command outputs and file paths
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

    // Look for actual error messages
    if (
      trimmed.startsWith("❌") ||
      trimmed.startsWith("error:") ||
      trimmed.startsWith("Error:") ||
      trimmed.includes("FAIL") ||
      trimmed.includes("below threshold") ||
      // Coverage-specific errors from run-coverage.js
      trimmed.includes("Uncovered") ||
      trimmed.includes("must have test coverage")
    ) {
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
  }

  return errors;
}

function printSummary() {
  console.log(`\n${"=".repeat(60)}`);
  console.log("PRECOMMIT SUMMARY");
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
        for (const error of errors.slice(0, 10)) {
          console.log(`  ${error}`);
        }
        if (errors.length > 10) {
          console.log(
            `  ... and ${errors.length - 10} more errors (use --verbose to see all)`,
          );
        }
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

// Run all steps
console.log(
  verbose
    ? "Running precommit checks (verbose)...\n"
    : "Running precommit checks...",
);

for (const step of steps) {
  if (!runStep(step)) {
    printSummary();
    process.exit(1);
  }
}

printSummary();
