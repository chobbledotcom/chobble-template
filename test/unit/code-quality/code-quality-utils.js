/**
 * Code quality test utilities
 * Shared helpers for code quality tests
 */

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

export { logAllowedItems };
