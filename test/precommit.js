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
  { name: "test", cmd: "bun", args: ["run", "test"] },
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
  const isSkippable = (trimmed) =>
    !trimmed ||
    trimmed.startsWith("$") ||
    trimmed.startsWith("/") ||
    trimmed.startsWith("node -e") ||
    trimmed.endsWith(".jpg") ||
    trimmed.endsWith(".png") ||
    trimmed.endsWith(".gif");

  const isErrorLine = (trimmed) =>
    trimmed.startsWith("❌") ||
    trimmed.startsWith("error:") ||
    trimmed.startsWith("Error:") ||
    trimmed.includes("FAIL") ||
    trimmed.includes("below threshold") ||
    trimmed.includes("Uncovered") ||
    trimmed.includes("must have test coverage") ||
    /^[\w./-]+\.\w+:\s*.+$/.test(trimmed);

  return output
    .split("\n")
    .map((line) => line.trim())
    .filter((trimmed) => !isSkippable(trimmed) && isErrorLine(trimmed));
}

function printSummary() {
  console.log(`\n${"=".repeat(60)}`);
  console.log("PRECOMMIT SUMMARY");
  console.log("=".repeat(60));

  const partitionResults = (steps) => {
    const passed = [];
    const failed = [];
    for (const step of steps) {
      const result = results[step.name];
      if (result) {
        (result.status === 0 ? passed : failed).push(step.name);
      }
    }
    return { passed, failed };
  };

  const printErrors = (stepName, stdout, stderr) => {
    const errors = [
      ...extractErrorsFromOutput(stdout),
      ...extractErrorsFromOutput(stderr),
    ];

    if (errors.length === 0) return;

    console.log(`\n${stepName} errors:`);
    errors.slice(0, 10).forEach((error) => console.log(`  ${error}`));
    if (errors.length > 10) {
      console.log(
        `  ... and ${errors.length - 10} more errors (use --verbose to see all)`,
      );
    }
  };

  const { passed, failed } = partitionResults(steps);

  if (passed.length > 0) console.log(`✅ Passed: ${passed.join(", ")}`);

  if (failed.length > 0) {
    console.log(`\n❌ Failed: ${failed.join(", ")}`);
    failed.forEach((step) => {
      const result = results[step];
      printErrors(step, result.stdout, result.stderr);
    });
  }

  console.log("=".repeat(60));

  if (failed.length > 0) {
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
