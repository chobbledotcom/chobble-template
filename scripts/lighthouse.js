#!/usr/bin/env node

import {
  getCategories,
  lighthouse,
  lighthouseMultiple,
} from "#media/lighthouse.js";
import {
  COMMON_OPTIONS_HELP,
  logErrors,
  optionsBuilder,
  runCliWhenMain,
  stringListValue,
  usageError,
} from "#scripts/cli-utils.js";

const USAGE = `
Lighthouse Tool - Run Lighthouse audits on rendered pages

Usage:
  node scripts/lighthouse.js [options] <page-path>
  node scripts/lighthouse.js [options] --pages <path1> <path2> ...
  node scripts/lighthouse.js --serve <site-dir> [options] <page-path>

Options:
${COMMON_OPTIONS_HELP}
  -c, --category <name>   Category: performance, accessibility, best-practices, seo
                          Can be specified multiple times (default: all)
  -d, --output-dir <dir>  Output directory (default: lighthouse-reports/)
  -f, --format <type>     Output format: html, json, csv (default: html)
  -p, --pages             Run audits on multiple pages
  --threshold <cat=score> Minimum score threshold (e.g., performance=90)
                          Can be specified multiple times. Exit 1 if not met.
  --list-categories       List available categories

Examples:
  # Audit homepage (server must be running)
  node scripts/lighthouse.js /

  # Audit with specific category
  node scripts/lighthouse.js -c performance /

  # Audit multiple pages
  node scripts/lighthouse.js -p / /news/ /guide/

  # Start server and audit
  node scripts/lighthouse.js -s _site /

  # JSON output with thresholds
  node scripts/lighthouse.js -f json --threshold performance=90 --threshold accessibility=95 /

  # Custom output path
  node scripts/lighthouse.js -o my-report.html /
`;

/** @type {import("node:util").ParseArgsConfig["options"]} */
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

/** @param {number | null} score */
const displayScore = (score) =>
  score === null ? "N/A" : `${Math.round(score * 100)}`;

/**
 * @param {Record<string, number | null>} scores
 * @param {string} [indent]
 */
const logScores = (scores, indent = "") => {
  for (const [cat, score] of Object.entries(scores)) {
    console.log(`${indent}${cat}: ${displayScore(score)}`);
  }
};

/** @param {any[]} results */
const logAuditResults = (results) => {
  for (const result of results) {
    console.log(`\n  ${result.url}:`);
    logScores(result.scores, "    ");
    console.log(`    Report: ${result.path}`);
  }
};

/**
 * @param {Array<{ category: string, actual: number, expected: number }>} failures
 * @param {string} [prefix]
 */
const logFailures = (failures, prefix = "") => {
  for (const f of failures) {
    console.error(`${prefix}${f.category}: ${f.actual} < ${f.expected}`);
  }
};

/** @param {any[]} results */
const logThresholdFailures = (results) => {
  const failed = results.filter((result) => !result.thresholds.passed);
  for (const result of failed) {
    console.error(`\nThreshold failures for ${result.url}:`);
    logFailures(result.thresholds.failures, "  ");
  }
  return failed.length > 0;
};

/**
 * @param {string[]} pagePaths
 * @param {object} options
 */
const auditMultiplePages = async (pagePaths, options) => {
  console.log(`\nRunning Lighthouse on ${pagePaths.length} pages...`);
  const { results, errors } = await lighthouseMultiple(pagePaths, options);
  console.log(`\nCompleted: ${results.length} audits`);
  logAuditResults(results);
  const hasErrors = logErrors(errors, (e) => e.pagePath);
  const hasThresholdFailures = logThresholdFailures(results);
  return hasErrors || hasThresholdFailures;
};

/**
 * @param {string} pagePath
 * @param {object} options
 */
const auditSinglePage = async (pagePath, options) => {
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

/**
 * Parse repeated cat=score threshold flags into a 0-1 score map,
 * or null when no thresholds were requested.
 * @param {string[]} thresholdArgs
 */
export const parseThresholds = (thresholdArgs) => {
  if (thresholdArgs.length === 0) return null;

  return Object.fromEntries(
    thresholdArgs.map((arg) => {
      const [category, scoreStr] = arg.split("=");
      const score = Number.parseInt(scoreStr, 10);
      if (Number.isNaN(score) || score < 0 || score > 100) {
        usageError(`Invalid threshold: ${arg}. Score must be 0-100.`, USAGE);
      }
      return [category, score / 100];
    }),
  );
};

export const buildOptions = optionsBuilder((values) => {
  const categories = stringListValue(values.category);
  return {
    onlyCategories: categories.length > 0 ? categories : null,
    format: values.format,
    thresholds: parseThresholds(stringListValue(values.threshold)),
  };
});

/** @param {{ positionals: string[], isMultiple: boolean }} parsed */
export const getInput = ({ positionals, isMultiple }) =>
  isMultiple ? positionals : positionals[0];

await runCliWhenMain(import.meta.url, PARSE_OPTIONS, USAGE, {
  selectHandler: ({ isMultiple }) =>
    isMultiple ? auditMultiplePages : auditSinglePage,
  getInput,
  buildOptions,
  extraExitChecks: (values) => {
    if (values["list-categories"]) showCategories();
  },
});
