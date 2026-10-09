/** ANSI colour + raw-write helpers for the precommit runner. */

/** @param {string} s */
export const green = (s) => `\x1b[32m${s}\x1b[0m`;
/** @param {string} s */
export const yellow = (s) => `\x1b[33m${s}\x1b[0m`;
/** @param {string} s */
export const red = (s) => `\x1b[31m${s}\x1b[0m`;
/** @param {string} s */
export const bold = (s) => `\x1b[1m${s}\x1b[0m`;
/** @param {string} s */
export const dim = (s) => `\x1b[2m${s}\x1b[0m`;

/** @param {string} s */
export const write = (s) => process.stdout.write(s);
