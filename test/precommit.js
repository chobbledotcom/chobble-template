#!/usr/bin/env node

/**
 * Precommit entry point.
 *
 * Quiet by default: one pass/fail line per step with live progress for the
 * test step, full output shown only for failures (use --verbose to see all).
 * Also probes for merge conflicts against the default remote branch before
 * running, and offers to `git push` after a successful manual run.
 *
 * Installed as the git pre-commit hook by flake.nix (runs `bun run precommit`),
 * and available ad-hoc as the `pc` shell command.
 */

import { main } from "#test/precommit/runner.js";
import { isMainModule } from "#test/test-runner-utils.js";

if (isMainModule(import.meta.url)) {
  await main();
}
