#!/usr/bin/env node

/**
 * Precommit hook wrapper that reduces output verbosity by default.
 * Use --verbose flag to see full output from all checks.
 */

import {
  extractErrorsFromOutput,
  printSummary,
  runStep,
} from "#test/test-runner-utils.js";

const verbose = process.argv.includes("--verbose");
const isMainModule = import.meta.url === `file://${process.argv[1]}`;

// Define the steps to run
const steps = [
  { name: "install", cmd: "bun", args: ["install"] },
  {
    name: "generate-types",
    cmd: "bun",
    args: ["scripts/generate-pages-cms-types.js"],
  },
  { name: "lint:fix", cmd: "bun", args: ["run", "lint:fix"] },
  { name: "knip:fix", cmd: "bun", args: ["run", "knip:fix"] },
  { name: "typecheck", cmd: "bun", args: ["run", "typecheck"] },
  { name: "cpd", cmd: "bun", args: ["run", "cpd"] },
  { name: "test:unit", cmd: "bun", args: ["run", "test:unit"] },
];

const results = {};

// Export extractErrorsFromOutput for backwards compatibility with tests
export { extractErrorsFromOutput };

// Run all steps (only when executed directly, not when imported)
if (isMainModule) {
  console.log(
    verbose
      ? "Running precommit checks (verbose)...\n"
      : "Running precommit checks...",
  );

  for (const step of steps) {
    const result = runStep(step, verbose);
    results[step.name] = result;

    if (result.status !== 0) {
      printSummary(steps, results, "PRECOMMIT SUMMARY");
      process.exit(1);
    }
  }

  printSummary(steps, results, "PRECOMMIT SUMMARY");
}
