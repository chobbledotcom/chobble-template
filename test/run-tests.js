#!/usr/bin/env node

/**
 * Full test suite runner.
 * Runs lint, typecheck, cpd, build, and tests (with coverage) in sequence.
 * Use --verbose flag to see full output from all checks.
 */

import { printSummary, runStep } from "#test/test-runner-utils.js";

const verbose = process.argv.includes("--verbose");
const isMainModule = import.meta.url === `file://${process.argv[1]}`;

// Define the steps to run
const steps = [
  { name: "lint", cmd: "bun", args: ["run", "lint"] },
  { name: "typecheck", cmd: "bun", args: ["run", "typecheck"] },
  { name: "cpd", cmd: "bun", args: ["run", "cpd"] },
  {
    name: "build",
    cmd: "bun",
    args: ["./node_modules/@11ty/eleventy/cmd.cjs", "--quiet"],
  },
  {
    name: "tests",
    cmd: "bun",
    args: [
      "test",
      "--coverage",
      "--coverage-reporter=lcov",
      "--concurrent",
      "--timeout",
      "30000",
      ...(verbose ? ["--verbose"] : []),
    ],
  },
];

const results = {};

// Run all steps (only when executed directly, not when imported)
if (isMainModule) {
  console.log(
    verbose ? "Running full test suite (verbose)...\n" : "Running tests...",
  );

  for (const step of steps) {
    const result = runStep(step, verbose);
    results[step.name] = result;

    if (result.status !== 0) {
      printSummary(steps, results, "TEST SUMMARY");
      process.exit(1);
    }
  }

  printSummary(steps, results, "TEST SUMMARY");
}
