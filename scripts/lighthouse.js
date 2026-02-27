#!/usr/bin/env bun

import {
  getCategories,
  lighthouse,
  lighthouseMultiple,
} from "#media/lighthouse.js";
import { buildCommonOptions, logErrors, runCli } from "#scripts/cli-utils.js";

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

const PARSE_OPTIONS = {
  category: { type: "string", short: "c", multiple: true },
  "output-dir": { type: "string", short: "d", default: "lighthouse-reports" },
  format: { type: "string", short: "f", default: "html" },
  threshold: { type: "string", multiple: true },
  "list-categories": { type: "boolean" },
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

const logScores = (scores, indent = "") => {
  for (const [cat, score] of Object.entries(scores)) {
    console.log(`${indent}${cat}: ${formatScore(score)}`);
  }
};

const logResults = (results) => {
  for (const result of results) {
    console.log(`\n  ${result.url}:`);
    logScores(result.scores, "    ");
    console.log(`    Report: ${result.path}`);
  }
};

const logFailures = (failures, prefix = "") => {
  for (const f of failures) {
    console.error(`${prefix}${f.category}: ${f.actual} < ${f.expected}`);
  }
};

const logThresholdFailures = (results) => {
  let hasFailures = false;
  for (const result of results) {
    if (!result.thresholds.passed) {
      hasFailures = true;
      console.error(`\nThreshold failures for ${result.url}:`);
      logFailures(result.thresholds.failures, "  ");
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
  logScores(result.scores, "  ");
  console.log(`\nReport saved: ${result.path}`);

  if (!result.thresholds.passed) {
    console.error("\nThreshold failures:");
    logFailures(result.thresholds.failures, "  ");
    return true;
  }
  return false;
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

const buildOptions = (values) => ({
  ...buildCommonOptions(values, "lighthouse-reports"),
  onlyCategories: values.category?.length > 0 ? values.category : null,
  format: values.format,
  thresholds: parseThresholds(values.threshold),
});

const extraExitChecks = (v) => {
  if (v["list-categories"]) showCategories();
};

const getInput = ({ positionals, isMultiple }) =>
  isMultiple ? positionals : positionals[0];

runCli(PARSE_OPTIONS, USAGE, {
  selectHandler: ({ isMultiple }) => selectHandler(isMultiple),
  getInput,
  buildOptions,
  extraExitChecks,
});
