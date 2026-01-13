#!/usr/bin/env bun

import { existsSync } from "node:fs";
import { join } from "node:path";
import { parseArgs } from "node:util";
import {
  getViewports,
  screenshot,
  screenshotAllViewports,
  screenshotMultiple,
  startServer,
} from "#media/screenshot.js";

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

const { values, positionals } = parseArgs({
  args: process.argv.slice(2),
  options: {
    help: { type: "boolean", short: "h" },
    viewport: { type: "string", short: "v", default: "desktop" },
    output: { type: "string", short: "o" },
    "output-dir": { type: "string", short: "d", default: "screenshots" },
    "base-url": {
      type: "string",
      short: "u",
      default: "http://localhost:8080",
    },
    timeout: { type: "string", short: "t", default: "10000" },
    pages: { type: "boolean", short: "p" },
    "all-viewports": { type: "boolean", short: "a" },
    serve: { type: "string", short: "s" },
    port: { type: "string", default: "8080" },
    "list-viewports": { type: "boolean" },
  },
  allowPositionals: true,
});

const showHelp = () => {
  console.log(USAGE);
  process.exit(0);
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

const logErrors = (errors, getKey) => {
  if (errors.length === 0) return false;
  console.error(`\nErrors: ${errors.length}`);
  for (const err of errors) {
    console.error(`  ${getKey(err)}: ${err.error}`);
  }
  return true;
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

const maybeStartServer = async (siteDir, port, options) => {
  if (!siteDir) return null;
  if (!existsSync(siteDir)) {
    console.error(`Error: Directory not found: ${siteDir}`);
    process.exit(1);
  }
  console.log(`Starting server for ${siteDir} on port ${port}...`);
  const server = await startServer(siteDir, port);
  options.baseUrl = server.baseUrl;
  console.log(`Server running at ${server.baseUrl}`);
  return server;
};

const selectHandler = (isAllViewports, isMultiplePages) => {
  if (isAllViewports) return handleAllViewports;
  if (isMultiplePages) return handleMultiplePages;
  return handleSinglePage;
};

const buildOptions = () => ({
  viewport: values.viewport,
  outputDir: join(process.cwd(), values["output-dir"]),
  baseUrl: values["base-url"],
  timeout: Number.parseInt(values.timeout, 10),
  outputPath: values.output,
});

const handleEarlyExit = () => {
  if (values.help) showHelp();
  if (values["list-viewports"]) showViewports();
};

const validatePagePaths = (pagePaths) => {
  if (pagePaths.length === 0) {
    console.error("Error: No page path provided");
    showHelp();
  }
};

const getInputForHandler = (pagePaths, isMultiplePages, isAllViewports) =>
  isMultiplePages && !isAllViewports ? pagePaths : pagePaths[0];

const stopServerIfRunning = (server) => {
  if (server) {
    server.stop();
    console.log("\nServer stopped.");
  }
};

const runScreenshots = async (handler, input, options, server) => {
  try {
    const hasErrors = await handler(input, options);
    if (hasErrors) process.exit(1);
  } catch (err) {
    console.error(`\nError: ${err.message}`);
    process.exit(1);
  } finally {
    stopServerIfRunning(server);
  }
};

const main = async () => {
  handleEarlyExit();
  validatePagePaths(positionals);

  const options = buildOptions();
  const server = await maybeStartServer(
    values.serve,
    Number.parseInt(values.port, 10),
    options,
  );
  const isMultiple = values.pages || positionals.length > 1;
  const handler = selectHandler(values["all-viewports"], isMultiple);
  const input = getInputForHandler(
    positionals,
    isMultiple,
    values["all-viewports"],
  );

  await runScreenshots(handler, input, options, server);
};

main();
