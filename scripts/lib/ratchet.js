/**
 * Shared output helpers for the repository's ratchet gates.
 */

/**
 * Print a green "✅ … passed" summary line. Every ratchet script reports
 * success this way, so the line lives here instead of being repeated at
 * each call site.
 * @param {string} message - The gate that passed, without the ✅ prefix
 */
export const printRatchetPassed = (message) => console.log(`\n✅ ${message}`);
