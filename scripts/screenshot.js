#!/usr/bin/env node

/* jscpd:ignore-start -- import block; deliberately mirrors lighthouse.js */
import {
  getViewports,
  screenshot,
  screenshotAllViewports,
  screenshotMultiple,
} from "#media/screenshot.js";
import {
  COMMON_OPTIONS_HELP,
  logErrors,
  optionsBuilder,
  runCliWhenMain,
  usageError,
} from "#scripts/cli-utils.js";

/* jscpd:ignore-end */

const USAGE = `
Screenshot Tool - Capture screenshots of rendered pages

Usage:
  node scripts/screenshot.js [options] <page-path>
  node scripts/screenshot.js [options] --pages <path1> <path2> ...
  node scripts/screenshot.js --all-viewports <page-path>
  node scripts/screenshot.js --serve <site-dir> [options] <page-path>

Options:
${COMMON_OPTIONS_HELP}
  -v, --viewport <name>   Viewport: mobile, tablet, desktop, full-page (default: desktop)
  -d, --output-dir <dir>  Output directory (default: screenshots/)
  -p, --pages             Take screenshots of multiple pages
  -a, --all-viewports     Take screenshots in all viewports
  --list-viewports        List available viewports

Examples:
  # Screenshot homepage (server must be running)
  node scripts/screenshot.js /

  # Screenshot a specific page with mobile viewport
  node scripts/screenshot.js -v mobile /news/

  # Screenshot multiple pages
  node scripts/screenshot.js -p / /news/ /guide/

  # Screenshot in all viewports
  node scripts/screenshot.js -a /

  # Start server and take screenshot
  node scripts/screenshot.js -s _site /

  # Custom output path
  node scripts/screenshot.js -o my-screenshot.png /
`;

/** @type {import("node:util").ParseArgsConfig["options"]} */
const PARSE_OPTIONS = {
  viewport: { type: "string", short: "v", default: "desktop" },
  "output-dir": { type: "string", short: "d", default: "screenshots" },
  "all-viewports": { type: "boolean", short: "a" },
  "list-viewports": { type: "boolean" },
};

const showViewports = () => {
  console.log("\nAvailable viewports:");
  for (const [name, vp] of Object.entries(getViewports())) {
    console.log(`  ${name}: ${vp.width}x${vp.height}`);
  }
  process.exit(0);
};

/**
 * @param {any[]} results
 * @param {(result: any) => string} getKey
 */
const logCaptureResults = (results, getKey) => {
  for (const result of results) {
    console.log(`  ${getKey(result)}: ${result.path}`);
  }
};

/**
 * @param {(input: any, options: object) => Promise<{ results: any[], errors: any[] }>} screenshotFn
 * @param {(input: any) => string} getDescription
 * @param {(result: any) => string} resultKey
 * @param {(err: any) => string} errorKey
 * @returns {(input: any, options: object) => Promise<boolean>}
 */
const createBatchHandler =
  (screenshotFn, getDescription, resultKey, errorKey) =>
  async (input, options) => {
    console.log(`\nTaking screenshots of ${getDescription(input)}...`);
    const { results, errors } = await screenshotFn(input, options);
    console.log(`\nCompleted: ${results.length} screenshots`);
    logCaptureResults(results, resultKey);
    return logErrors(errors, errorKey);
  };

const handleAllViewports = createBatchHandler(
  screenshotAllViewports,
  (p) => `${p} in all viewports`,
  (r) => r.viewport,
  (e) => e.viewport,
);

const handleMultiplePages = createBatchHandler(
  screenshotMultiple,
  (ps) => `${ps.length} pages`,
  (r) => r.url,
  (e) => e.pagePath,
);

/**
 * @param {string} pagePath
 * @param {object} options
 */
const captureSinglePage = async (pagePath, options) => {
  const result = await screenshot(pagePath, options);
  console.log(`\nScreenshot saved: ${result.path}`);
  return false;
};

/** @param {{ isMultiple: boolean, values: Record<string, unknown> }} parsed */
export const selectHandler = ({ isMultiple, values }) => {
  if (values["all-viewports"]) return handleAllViewports;
  if (isMultiple) return handleMultiplePages;
  return captureSinglePage;
};

export const buildOptions = optionsBuilder((values) => ({
  viewport: values.viewport,
}));

/** @param {{ positionals: string[], isMultiple: boolean, values: Record<string, unknown> }} parsed */
export const getInput = ({ positionals, isMultiple, values }) => {
  if (values["all-viewports"]) {
    // -a captures one page across every viewport; extra paths would be
    // silently dropped, so reject them instead.
    if (positionals.length > 1) {
      usageError("--all-viewports takes exactly one page path", USAGE);
    }
    return positionals[0];
  }
  return isMultiple ? positionals : positionals[0];
};

await runCliWhenMain(import.meta.url, PARSE_OPTIONS, USAGE, {
  getInput,
  buildOptions,
  extraExitChecks: (values) => {
    if (values["list-viewports"]) showViewports();
  },
  selectHandler,
});
