#!/usr/bin/env node

/**
 * Full test suite runner.
 * Runs lint, typecheck, cpd, build, and tests (with coverage) in sequence.
 * Use --verbose flag to see full output from all checks.
 */

import {
  COMMON_STEPS,
  coverageStep,
  isMainModule,
  runSteps,
  verbose,
} from "#test/test-runner-utils.js";

// Full test suite uses lint (not fix), includes build, and coverage
const steps = [
  COMMON_STEPS.lint,
  COMMON_STEPS.typecheck,
  COMMON_STEPS.typecheckStrict,
  COMMON_STEPS.cpdDesignSystem,
  COMMON_STEPS.cpd,
  COMMON_STEPS.build,
  coverageStep(verbose),
];

// Run all steps (only when executed directly, not when imported)
if (isMainModule(import.meta.url)) {
  console.log(
    verbose ? "Running full test suite (verbose)...\n" : "Running tests...",
  );

  runSteps({ steps, verbose, title: "TEST SUMMARY" });
}
