/**
 * CLI I/O functions that interact with process globals
 *
 * These functions are excluded from coverage as they cannot be
 * meaningfully unit tested without mocking Node.js internals.
 */

import { parseArgs } from "node:util";

/**
 * CLI options definition for parseArgs
 */
const CLI_OPTIONS = {
  help: { type: "boolean", short: "h" },
  regenerate: { type: "boolean", short: "r" },
  collections: { type: "string", short: "c" },
  all: { type: "boolean", short: "a" },
  enable: { type: "string", short: "e" },
  disable: { type: "string", short: "d" },
  "src-folder": { type: "boolean" },
  "no-src-folder": { type: "boolean" },
  "custom-home": { type: "boolean" },
  "no-custom-home": { type: "boolean" },
  "save-config": { type: "boolean" },
  "no-save-config": { type: "boolean" },
  "dry-run": { type: "boolean" },
  quiet: { type: "boolean", short: "q" },
  "list-collections": { type: "boolean" },
  "list-features": { type: "boolean" },
};

/**
 * Parse CLI arguments from process.argv
 * @returns {Object} Parsed arguments with values and positionals
 */
export const parseCliArguments = () =>
  parseArgs({
    args: process.argv.slice(2),
    options: CLI_OPTIONS,
    allowPositionals: false,
    strict: true,
  });

/**
 * Display help and exit process
 * @param {string} helpText - Help text to display
 */
export const showHelp = (helpText) => {
  console.log(helpText);
  process.exit(0);
};
