#!/usr/bin/env node

/**
 * Precommit hook wrapper that reduces output verbosity by default.
 * Use --verbose flag to see full output from all checks.
 */

import {
  COMMON_STEPS,
  isMainModule,
  runSteps,
  verbose,
} from "#test/test-runner-utils.js";

// Precommit uses fix variants of lint/knip plus basic test (no coverage)
const steps = [
  COMMON_STEPS.install,
  COMMON_STEPS.generateTypes,
  COMMON_STEPS.lintFix,
  COMMON_STEPS.knipFix,
  COMMON_STEPS.typecheck,
  COMMON_STEPS.cpdFp,
  COMMON_STEPS.cpd,
  COMMON_STEPS.cpdRatchet,
  COMMON_STEPS.test,
];

// Run all steps (only when executed directly, not when imported)
if (isMainModule(import.meta.url)) {
  console.log(
    verbose
      ? "Running precommit checks (verbose)...\n"
      : "Running precommit checks...",
  );

  runSteps({ steps, verbose, title: "PRECOMMIT SUMMARY" });
}
