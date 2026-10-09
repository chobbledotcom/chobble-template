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

import { isMainModule } from "#scripts/lib/is-main-module.js";
import {
  COMMON_STEPS,
  codeQualityTestsStep,
  integrationTestsStep,
  runLanes,
  unitTestsStep,
  verbose,
} from "#test/test-runner-utils.js";

const mainLanes = [
  [COMMON_STEPS.lint],
  [COMMON_STEPS.lintScss],
  [COMMON_STEPS.knip],
  [COMMON_STEPS.typecheck, COMMON_STEPS.typecheckStrict],
  [COMMON_STEPS.cpd, COMMON_STEPS.cpdRatchet],
  // The accessibility check reads the built site, so it follows the build in
  // the same lane rather than racing it in another.
  [COMMON_STEPS.build, COMMON_STEPS.checkA11y],
  [unitTestsStep(verbose)],
  [integrationTestsStep],
];

// Run all lanes (only when executed directly, not when imported)
if (isMainModule(import.meta.url)) {
  console.log(
    verbose ? "Running full test suite (verbose)...\n" : "Running tests...",
  );

  await runLanes({
    lanes: [[codeQualityTestsStep]],
    verbose,
    title: "CODE QUALITY TEST SUMMARY",
  });
  await runLanes({ lanes: mainLanes, verbose, title: "TEST SUMMARY" });
}
