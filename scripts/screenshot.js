#!/usr/bin/env bun

import {
  getViewports,
  screenshot,
  screenshotAllViewports,
  screenshotMultiple,
} from "#media/screenshot.js";
import { buildCommonOptions, logErrors, runCli } from "#scripts/cli-utils.js";

const USAGE = `
Screenshot Tool - Capture screenshots of rendered pages

Usage:
  bun scripts/screenshot.js [options] <page-path>
  bun scripts/screenshot.js [options] --pages <path1> <path2> ...
  bun scripts/screenshot.js --all-viewports <page-path>
  bun scripts/screenshot.js --serve <site-dir> [options] <page-path>

Options:
  -h, --help              Show this help message
  -v, --viewport <name>   Viewport: mobile, tablet, desktop, full-page (default: desktop)
  -o, --output <path>     Output file path (auto-generated if not specified)
  -d, --output-dir <dir>  Output directory (default: screenshots/)
  -u, --base-url <url>    Base URL (default: http://localhost:8080)
  -t, --timeout <ms>      Timeout in milliseconds (default: 10000)
  -p, --pages             Take screenshots of multiple pages
  -a, --all-viewports     Take screenshots in all viewports
  -s, --serve <dir>       Start a server for the given directory
  --port <port>           Port for the server (default: 8080)
  --list-viewports        List available viewports

Examples:
  # Screenshot homepage (server must be running)
  bun scripts/screenshot.js /

  # Screenshot a specific page with mobile viewport
  bun scripts/screenshot.js -v mobile /products/

  # Screenshot multiple pages
  bun scripts/screenshot.js -p / /about/ /products/

  # Screenshot in all viewports
  bun scripts/screenshot.js -a /

  # Start server and take screenshot
  bun scripts/screenshot.js -s _site /

  # Custom output path
  bun scripts/screenshot.js -o my-screenshot.png /
`;

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

const logResults = (results, getKey) => {
  for (const result of results) {
    console.log(`  ${getKey(result)}: ${result.path}`);
  }
};

const createBatchHandler =
  (screenshotFn, getDescription, resultKey, errorKey) =>
  async (input, options) => {
    console.log(`\nTaking screenshots of ${getDescription(input)}...`);
    const { results, errors } = await screenshotFn(input, options);
    console.log(`\nCompleted: ${results.length} screenshots`);
    logResults(results, resultKey);
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

const handleSinglePage = async (pagePath, options) => {
  const result = await screenshot(pagePath, options);
  console.log(`\nScreenshot saved: ${result.path}`);
  return false;
};

const selectHandler = (isAllViewports, isMultiplePages) => {
  if (isAllViewports) return handleAllViewports;
  if (isMultiplePages) return handleMultiplePages;
  return handleSinglePage;
};

const buildOptions = (values) => ({
  ...buildCommonOptions(values, "screenshots"),
  viewport: values.viewport,
});

const extraExitChecks = (v) => {
  if (v["list-viewports"]) showViewports();
};

const getInput = ({ positionals, isMultiple, values }) =>
  isMultiple && !values["all-viewports"] ? positionals : positionals[0];

runCli(PARSE_OPTIONS, USAGE, {
  getInput,
  buildOptions,
  extraExitChecks,
  selectHandler: ({ isMultiple, values }) =>
    selectHandler(values["all-viewports"], isMultiple),
});
