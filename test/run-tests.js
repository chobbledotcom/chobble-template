#!/usr/bin/env node

/**
 * Full test suite runner.
 * Runs lint, typecheck, cpd, knip, build, and tests in parallel lanes:
 * lanes execute concurrently, steps within a lane execute sequentially.
 * Lane notes:
 * - typecheck and typecheck:strict share a lane so the two tsc processes
 *   don't compete for the same cores at once
 * - the jscpd scans share a lane because both write .jscpd-report
 * - unit tests carry the coverage thresholds; integration tests spawn
 *   uninstrumented child builds so coverage would add nothing there
 * Use --verbose flag to see full output from all checks.
 */

import {
  COMMON_STEPS,
  integrationTestsStep,
  isMainModule,
  runLanes,
  unitTestsStep,
  verbose,
} from "#test/test-runner-utils.js";

const lanes = [
  [COMMON_STEPS.lint],
  [COMMON_STEPS.lintScss],
  [COMMON_STEPS.knip],
  [COMMON_STEPS.typecheck, COMMON_STEPS.typecheckStrict],
  [COMMON_STEPS.cpdDesignSystem, COMMON_STEPS.cpd],
  [COMMON_STEPS.build],
  [unitTestsStep(verbose)],
  [integrationTestsStep],
];

// Run all lanes (only when executed directly, not when imported)
if (isMainModule(import.meta.url)) {
  console.log(
    verbose ? "Running full test suite (verbose)...\n" : "Running tests...",
  );

  await runLanes({ lanes, verbose, title: "TEST SUMMARY" });
}
