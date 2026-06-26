/** ANSI colour + raw-write helpers for the precommit runner. */

export const green = (s) => `\x1b[32m${s}\x1b[0m`;
export const yellow = (s) => `\x1b[33m${s}\x1b[0m`;
export const red = (s) => `\x1b[31m${s}\x1b[0m`;
export const bold = (s) => `\x1b[1m${s}\x1b[0m`;
export const dim = (s) => `\x1b[2m${s}\x1b[0m`;

export const write = (s) => process.stdout.write(s);
