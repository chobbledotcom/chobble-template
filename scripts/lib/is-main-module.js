import { pathToFileURL } from "node:url";

/**
 * Whether the module at importMetaUrl is the entry point of this process.
 * URL-safe: paths with spaces or non-ASCII characters compare correctly,
 * unlike naive `file://` string concatenation.
 *
 * @param {string} importMetaUrl - The caller's import.meta.url
 * @returns {boolean}
 */
export const isMainModule = (importMetaUrl) =>
  Boolean(process.argv[1]) &&
  importMetaUrl === pathToFileURL(process.argv[1]).href;

/**
 * Run a script's main function only when its module is the process entry
 * point - the standard tail for every dual importable/executable script.
 * Awaits async mains so callers can `await runIfMain(...)` at top level
 * and rejections fail the process instead of floating.
 *
 * @param {string} importMetaUrl - The caller's import.meta.url
 * @param {() => void | Promise<void>} main
 */
export const runIfMain = async (importMetaUrl, main) => {
  if (isMainModule(importMetaUrl)) await main();
};
