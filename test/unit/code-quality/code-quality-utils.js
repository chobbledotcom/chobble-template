/**
 * Code quality test utilities
 * Shared helpers for code quality tests
 */

import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { rootDir } from "#test/test-utils.js";

/**
 * Log allowed items with optional reason field
 * Used to display allowlist items from code quality checks
 *
 * @param {Array<Object>} items - Array of allowed items with location property
 * @param {string} label - Label for the output
 * @param {boolean} [showReason=false] - Whether to show reason field
 *
 * @example
 * logAllowedItems(allowedMutations, "Allowlisted object mutations");
 * logAllowedItems(staleExceptions, "Stale exceptions", true);
 */
const logAllowedItems = (items, label, showReason = false) => {
  console.log(`\n  ${label}: ${items.length}`);
  if (items.length > 0) {
    console.log("  Locations:");
    for (const item of items) {
      const reason = showReason && item.reason ? ` (${item.reason})` : "";
      console.log(`    - ${item.location}${reason}`);
    }
  }
};

/**
 * Run a generator script with its output redirected to a temp path and
 * return the generated content. Freshness tests use this so committed
 * files are never rewritten while parallel pipeline steps may read them.
 *
 * @param {string} script - Absolute path to the generator script
 * @param {string} envVar - Env var the script reads as its output override
 * @param {string} tempDir - Temp directory to write into
 * @returns {string} The generated file content
 */
const regenerateToTemp = (script, envVar, tempDir) => {
  const outputPath = join(tempDir, "generated-output");
  execSync(`bun ${script}`, {
    cwd: rootDir,
    stdio: "pipe",
    env: { ...process.env, [envVar]: outputPath },
  });
  return readFileSync(outputPath, "utf-8");
};

export { logAllowedItems, regenerateToTemp };
