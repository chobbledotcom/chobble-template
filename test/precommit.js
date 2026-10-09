#!/usr/bin/env node

/**
 * Precommit entry point.
 *
 * Quiet by default: one pass/fail line per step with live progress for the
 * test step, full output shown only for failures (use --verbose to see all).
 * Also probes for merge conflicts against the default remote branch before
 * running, and offers to `git push` after a successful manual run.
 *
 * Installed as the git pre-commit hook by devenv (runs `npm run precommit`),
 * and available ad-hoc as the `pc` shell command.
 */

import { isMainModule } from "#scripts/lib/is-main-module.js";
import { main } from "#test/precommit/runner.js";

if (isMainModule(import.meta.url)) {
  await main();
}
