/**
 * Tidy utilities for code quality tests.
 * Provides common patterns for file scanning, line matching, and violation reporting.
 */
import { fs, path, rootDir } from "#test/test-utils.js";

/**
 * Scan files for patterns line-by-line and collect violations.
 * Replaces the common pattern of: iterate files, read source, loop lines, match pattern
 *
 * @param {string[]} files - Array of file paths relative to rootDir
 * @param {function} lineMatcher - Function(line, lineNumber, source, relativePath) => violation or null
 * @param {object} options - Optional settings
 * @param {string[]} options.excludeFiles - Files to exclude from scanning
 * @returns {Array} Array of violations returned by lineMatcher
 */
const scanFilesForViolations = (files, lineMatcher, options = {}) => {
  const { excludeFiles = [] } = options;
  const violations = [];
  const excludeSet = new Set(excludeFiles);

  for (const relativePath of files) {
    if (excludeSet.has(relativePath)) continue;

    const fullPath = path.join(rootDir, relativePath);
    const source = fs.readFileSync(fullPath, "utf-8");
    const lines = source.split("\n");

    for (let i = 0; i < lines.length; i++) {
      const result = lineMatcher(lines[i], i + 1, source, relativePath);
      if (result) {
        if (Array.isArray(result)) {
          violations.push(...result);
        } else {
          violations.push(result);
        }
      }
    }
  }

  return violations;
};

/**
 * Scan files and collect all pattern matches with context.
 * For when you need to analyze patterns across the whole file, not just per-line.
 *
 * @param {string[]} files - Array of file paths relative to rootDir
 * @param {function} fileAnalyzer - Function(source, relativePath) => violations array
 * @param {object} options - Optional settings
 * @param {string[]} options.excludeFiles - Files to exclude from scanning
 * @returns {Array} Array of violations returned by fileAnalyzer
 */
const analyzeFiles = (files, fileAnalyzer, options = {}) => {
  const { excludeFiles = [] } = options;
  const violations = [];
  const excludeSet = new Set(excludeFiles);

  for (const relativePath of files) {
    if (excludeSet.has(relativePath)) continue;

    const fullPath = path.join(rootDir, relativePath);
    const source = fs.readFileSync(fullPath, "utf-8");
    const results = fileAnalyzer(source, relativePath);

    if (results && results.length > 0) {
      violations.push(...results);
    }
  }

  return violations;
};

/**
 * Report violations in a consistent format and return a check function.
 *
 * @param {Array} violations - Array of violation objects with file, line, code properties
 * @param {object} options - Reporting options
 * @param {string} options.message - Main message (e.g., "commented-out code")
 * @param {string} options.fixHint - How to fix hint
 * @param {number} options.limit - Max violations to show (default 10)
 * @returns {object} { count, report } - count of violations and formatted report string
 */
const formatViolationReport = (violations, options = {}) => {
  const { message = "violations", fixHint = "", limit = 10 } = options;

  if (violations.length === 0) {
    return { count: 0, report: "" };
  }

  const lines = [];
  lines.push(`\n  Found ${violations.length} ${message}:`);

  const shown = violations.slice(0, limit);
  for (const v of shown) {
    lines.push(`     - ${v.file}:${v.line}`);
    if (v.code) {
      lines.push(`       ${v.code}`);
    }
  }

  if (violations.length > limit) {
    lines.push(`     ... and ${violations.length - limit} more`);
  }

  if (fixHint) {
    lines.push(`\n  To fix: ${fixHint}\n`);
  } else {
    lines.push("");
  }

  return { count: violations.length, report: lines.join("\n") };
};

/**
 * Run a violation check, log report, and assert zero violations.
 * Consolidates the common test pattern of analyze -> report -> assert.
 *
 * @param {function} expectTrue - The expectTrue assertion function
 * @param {Array} violations - Violations array
 * @param {object} options - Report options (see formatViolationReport)
 */
const assertNoViolations = (expectTrue, violations, options = {}) => {
  const { count, report } = formatViolationReport(violations, options);

  if (report) {
    console.log(report);
  }

  expectTrue(
    count === 0,
    `Found ${count} ${options.message || "violations"}. See list above.`,
  );
};

/**
 * Create a line matcher for simple regex pattern detection.
 *
 * @param {RegExp|RegExp[]} patterns - Pattern(s) to match
 * @param {function} createViolation - Function(line, lineNumber, match, relativePath) => violation object
 * @returns {function} Line matcher suitable for scanFilesForViolations
 */
const createPatternMatcher = (patterns, createViolation) => {
  const patternList = Array.isArray(patterns) ? patterns : [patterns];

  return (line, lineNumber, _source, relativePath) => {
    for (const pattern of patternList) {
      const match = line.match(pattern);
      if (match) {
        return createViolation(line.trim(), lineNumber, match, relativePath);
      }
    }
    return null;
  };
};

/**
 * Combine multiple file lists and optionally exclude certain files.
 *
 * @param {Array<string[]>} fileLists - Arrays of file paths to combine
 * @param {string[]} excludeFiles - Files to exclude
 * @returns {string[]} Combined and filtered file list
 */
const combineFileLists = (fileLists, excludeFiles = []) => {
  const excludeSet = new Set(excludeFiles);
  const combined = [];

  for (const list of fileLists) {
    for (const file of list) {
      if (!excludeSet.has(file)) {
        combined.push(file);
      }
    }
  }

  return combined;
};

export {
  scanFilesForViolations,
  analyzeFiles,
  formatViolationReport,
  assertNoViolations,
  createPatternMatcher,
  combineFileLists,
};
