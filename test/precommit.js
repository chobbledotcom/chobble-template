#!/usr/bin/env node

/**
 * Precommit hook wrapper that reduces output verbosity by default.
 * Use --verbose flag to see full output from all checks.
 */

import { spawnSync } from "node:child_process";
import { ROOT_DIR } from "../src/_lib/paths.js";

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
  const lines = output.split("\n");
  const errors = [];

  for (const line of lines) {
    // Look for error indicators
    if (
      line.includes("error") ||
      line.includes("ERROR") ||
      line.includes("❌") ||
      line.includes("FAIL")
    ) {
      errors.push(line);
    }
  }

  return errors;
}

function printSummary() {
  console.log(`\n${"=".repeat(60)}`);
  console.log("PRECOMMIT SUMMARY");
  console.log("=".repeat(60));

  let allPassed = true;
  const passedSteps = [];
  const failedSteps = [];

  for (const step of steps) {
    const result = results[step.name];
    if (!result) continue; // Skip if step wasn't run
    if (result.status === 0) {
      passedSteps.push(step.name);
    } else {
      failedSteps.push(step.name);
      allPassed = false;
    }
  }

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

      if (errors.length > 0) {
        console.log(`\n${step} errors:`);
        for (const error of errors.slice(0, 10)) {
          console.log(`  ${error}`);
        }
        if (errors.length > 10) {
          console.log(
            `  ... and ${errors.length - 10} more errors (use --verbose to see all)`,
          );
        }
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
