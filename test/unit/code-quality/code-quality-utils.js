/**
 * Code quality test utilities
 * Shared helpers for code quality tests
 */

import { spawnSync } from "node:child_process";
import { rootDir } from "#test/test-utils.js";

/**
 * Run a package.json script as a test assertion.
 * Captures stdout/stderr; on non-zero exit, prints the output and asserts.
 *
 * @param {string} scriptName - The npm script name to run
 * @param {string} failureLabel - Header shown when the script fails
 * @param {number} [timeoutMs=25000] - Timeout in milliseconds
 * @returns {number} The script's exit status
 */
const runScriptCheck = (scriptName, failureLabel, timeoutMs = 25000) => {
  const result = spawnSync("bun", ["run", scriptName], {
    cwd: rootDir,
    encoding: "utf-8",
    stdio: ["pipe", "pipe", "pipe"],
    timeout: timeoutMs,
  });

  if (result.status !== 0) {
    console.log(`\n  ${failureLabel}:\n`);
    console.log(result.stdout || result.stderr);
  }

  return result.status;
};

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

export { logAllowedItems, runScriptCheck };
