#!/usr/bin/env bun

import { existsSync } from "node:fs";
import { join } from "node:path";
import { parseArgs } from "node:util";
import {
  getCategories,
  lighthouse,
  lighthouseMultiple,
  startServer,
} from "#media/lighthouse.js";

const USAGE = `
Lighthouse Tool - Run Lighthouse audits on rendered pages

Usage:
  bun scripts/lighthouse.js [options] <page-path>
  bun scripts/lighthouse.js [options] --pages <path1> <path2> ...
  bun scripts/lighthouse.js --serve <site-dir> [options] <page-path>

Options:
  -h, --help              Show this help message
  -c, --category <name>   Category: performance, accessibility, best-practices, seo
                          Can be specified multiple times (default: all)
  -o, --output <path>     Output file path (auto-generated if not specified)
  -d, --output-dir <dir>  Output directory (default: lighthouse-reports/)
  -u, --base-url <url>    Base URL (default: http://localhost:8080)
  -t, --timeout <ms>      Timeout in milliseconds (default: 10000)
  -f, --format <type>     Output format: html, json, csv (default: html)
  -p, --pages             Run audits on multiple pages
  -s, --serve <dir>       Start a server for the given directory
  --port <port>           Port for the server (default: 8080)
  --threshold <cat=score> Minimum score threshold (e.g., performance=90)
                          Can be specified multiple times. Exit 1 if not met.
  --list-categories       List available categories

Examples:
  # Audit homepage (server must be running)
  bun scripts/lighthouse.js /

  # Audit with specific category
  bun scripts/lighthouse.js -c performance /

  # Audit multiple pages
  bun scripts/lighthouse.js -p / /about/ /products/

  # Start server and audit
  bun scripts/lighthouse.js -s _site /

  # JSON output with thresholds
  bun scripts/lighthouse.js -f json --threshold performance=90 --threshold accessibility=95 /

  # Custom output path
  bun scripts/lighthouse.js -o my-report.html /
`;

const { values, positionals } = parseArgs({
  args: process.argv.slice(2),
  options: {
    help: { type: "boolean", short: "h" },
    category: { type: "string", short: "c", multiple: true },
    output: { type: "string", short: "o" },
    "output-dir": { type: "string", short: "d", default: "lighthouse-reports" },
    "base-url": {
      type: "string",
      short: "u",
      default: "http://localhost:8080",
    },
    timeout: { type: "string", short: "t", default: "10000" },
    format: { type: "string", short: "f", default: "html" },
    pages: { type: "boolean", short: "p" },
    serve: { type: "string", short: "s" },
    port: { type: "string", default: "8080" },
    threshold: { type: "string", multiple: true },
    "list-categories": { type: "boolean" },
  },
  allowPositionals: true,
});

const showHelp = () => {
  console.log(USAGE);
  process.exit(0);
};

const showCategories = () => {
  console.log("\nAvailable categories:");
  for (const name of Object.keys(getCategories())) {
    console.log(`  ${name}`);
  }
  process.exit(0);
};

const formatScore = (score) =>
  score === null ? "N/A" : `${Math.round(score * 100)}`;

const logResults = (results) => {
  for (const result of results) {
    console.log(`\n  ${result.url}:`);
    for (const [cat, score] of Object.entries(result.scores)) {
      console.log(`    ${cat}: ${formatScore(score)}`);
    }
    console.log(`    Report: ${result.path}`);
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

const logThresholdFailures = (results) => {
  let hasFailures = false;
  for (const result of results) {
    if (!result.thresholds.passed) {
      hasFailures = true;
      console.error(`\nThreshold failures for ${result.url}:`);
      for (const f of result.thresholds.failures) {
        console.error(`  ${f.category}: ${f.actual} < ${f.expected}`);
      }
    }
  }
  return hasFailures;
};

const handleMultiplePages = async (pagePaths, options) => {
  console.log(`\nRunning Lighthouse on ${pagePaths.length} pages...`);
  const { results, errors } = await lighthouseMultiple(pagePaths, options);
  console.log(`\nCompleted: ${results.length} audits`);
  logResults(results);
  const hasErrors = logErrors(errors, (e) => e.pagePath);
  const hasThresholdFailures = logThresholdFailures(results);
  return hasErrors || hasThresholdFailures;
};

const handleSinglePage = async (pagePath, options) => {
  const result = await lighthouse(pagePath, options);
  console.log(`\nLighthouse audit complete for ${result.url}:`);
  for (const [cat, score] of Object.entries(result.scores)) {
    console.log(`  ${cat}: ${formatScore(score)}`);
  }
  console.log(`\nReport saved: ${result.path}`);

  if (!result.thresholds.passed) {
    console.error("\nThreshold failures:");
    for (const f of result.thresholds.failures) {
      console.error(`  ${f.category}: ${f.actual} < ${f.expected}`);
    }
    return true;
  }
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

const selectHandler = (isMultiplePages) =>
  isMultiplePages ? handleMultiplePages : handleSinglePage;

const parseThresholds = (thresholdArgs) => {
  if (!thresholdArgs || thresholdArgs.length === 0) return null;

  const thresholds = {};
  for (const t of thresholdArgs) {
    const [category, scoreStr] = t.split("=");
    const score = Number.parseInt(scoreStr, 10);
    if (Number.isNaN(score) || score < 0 || score > 100) {
      console.error(`Invalid threshold: ${t}. Score must be 0-100.`);
      process.exit(1);
    }
    thresholds[category] = score / 100;
  }
  return thresholds;
};

const buildOptions = () => ({
  onlyCategories: values.category?.length > 0 ? values.category : null,
  outputDir: join(process.cwd(), values["output-dir"]),
  baseUrl: values["base-url"],
  timeout: Number.parseInt(values.timeout, 10),
  format: values.format,
  outputPath: values.output,
  thresholds: parseThresholds(values.threshold),
});

const handleEarlyExit = () => {
  if (values.help) showHelp();
  if (values["list-categories"]) showCategories();
};

const validatePagePaths = (pagePaths) => {
  if (pagePaths.length === 0) {
    console.error("Error: No page path provided");
    showHelp();
  }
};

const getInputForHandler = (pagePaths, isMultiplePages) =>
  isMultiplePages ? pagePaths : pagePaths[0];

const stopServerIfRunning = (server) => {
  if (server) {
    server.stop();
    console.log("\nServer stopped.");
  }
};

const runLighthouse = async (handler, input, options, server) => {
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
  const handler = selectHandler(isMultiple);
  const input = getInputForHandler(positionals, isMultiple);

  await runLighthouse(handler, input, options, server);
};

main();
