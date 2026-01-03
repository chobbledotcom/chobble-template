/**
 * Code scanner utilities for code quality tests.
 * Written in a functional, immutable style.
 */
import { expect } from "bun:test";
import { fs, path, rootDir } from "#test/test-utils.js";

// ============================================
// Common patterns for skipping non-code lines
// ============================================

/**
 * Common patterns to identify comment lines (to skip during code analysis).
 */
const COMMENT_LINE_PATTERNS = [
  /^\s*\/\//, // Single-line comments: // ...
  /^\s*\/\*/, // Block comment start: /* ...
  /^\s*\*/, // Block comment continuation: * ...
  /^\s*\*\//, // Block comment end: */
  /^\s*\/\*.*\*\/\s*$/, // Single-line block comment: /* ... */
];

/**
 * Check if a line is a comment (single-line, block start, continuation, or end).
 */
const isCommentLine = (line) =>
  COMMENT_LINE_PATTERNS.some((pattern) => pattern.test(line.trim()));

/**
 * Read a file's source code.
 */
const readSource = (relativePath) =>
  fs.readFileSync(path.join(rootDir, relativePath), "utf-8");

/**
 * Split source into lines with line numbers.
 * @returns {Array<{line: string, num: number}>}
 */
const toLines = (source) =>
  source.split("\n").map((line, i) => ({ line, num: i + 1 }));

/**
 * Filter file list excluding certain paths.
 */
const excludeFiles = (files, exclude = []) => {
  const excludeSet = new Set(exclude);
  return files.filter((f) => !excludeSet.has(f));
};

/**
 * Combine multiple file lists, optionally excluding some.
 */
const combineFileLists = (fileLists, exclude = []) =>
  excludeFiles(fileLists.flat(), exclude);

/**
 * Find first matching pattern in a line.
 * @returns {match: RegExpMatchArray, pattern: RegExp} | null
 */
const matchAny = (line, patterns) => {
  for (const pattern of patterns) {
    const match = line.match(pattern);
    if (match) return { match, pattern };
  }
  return null;
};

/**
 * Scan source line-by-line, returning results for matching lines.
 * @param {string} source - Source code
 * @param {function} matcher - (line, lineNum, lines) => result | null
 * @returns {Array} Non-null results
 */
const scanLines = (source, matcher) =>
  toLines(source)
    .flatMap(({ line, num }, _i, lines) => matcher(line, num, lines))
    .filter((r) => r !== null && r !== undefined);

/**
 * Find all pattern matches in source.
 * @param {string} source - Source code
 * @param {RegExp[]} patterns - Patterns to match
 * @param {function} transform - (match, lineNum, line) => result
 */
const findPatterns = (source, patterns, transform) =>
  scanLines(source, (line, num) => {
    const result = matchAny(line, patterns);
    return result ? transform(result.match, num, line) : null;
  });

/**
 * Analyze multiple files, collecting results.
 * @param {string[]} files - File paths relative to rootDir
 * @param {function} analyzer - (source, path) => results[]
 * @param {object} options - { excludeFiles: string[] }
 */
const analyzeFiles = (files, analyzer, options = {}) =>
  excludeFiles(files, options.excludeFiles || []).flatMap(
    (relativePath) => analyzer(readSource(relativePath), relativePath) || [],
  );

/**
 * Scan files line-by-line, collecting violations.
 * @param {string[]} files - File paths relative to rootDir
 * @param {function} matcher - (line, lineNum, source, path) => violation | null
 * @param {object} options - { excludeFiles: string[] }
 */
const scanFilesForViolations = (files, matcher, options = {}) =>
  analyzeFiles(
    files,
    (source, relativePath) =>
      scanLines(source, (line, num) =>
        matcher(line, num, source, relativePath),
      ),
    options,
  );

/**
 * Format violations into a report string.
 */
const formatViolationReport = (violations, options = {}) => {
  const { message = "violations", fixHint = "", limit = 10 } = options;

  if (violations.length === 0) return { count: 0, report: "" };

  const header = `\n  Found ${violations.length} ${message}:`;
  const items = violations
    .slice(0, limit)
    .flatMap((v) => [
      `     - ${v.file}:${v.line}`,
      ...(v.code ? [`       ${v.code}`] : []),
    ]);
  const overflow =
    violations.length > limit
      ? [`     ... and ${violations.length - limit} more`]
      : [];
  const fix = fixHint ? [`\n  To fix: ${fixHint}\n`] : [""];

  return {
    count: violations.length,
    report: [header, ...items, ...overflow, ...fix].join("\n"),
  };
};

/**
 * Assert no violations, logging report if any found.
 * Uses Bun's expect internally.
 */
const assertNoViolations = (violations, options = {}) => {
  const { count, report } = formatViolationReport(violations, options);
  if (report) console.log(report);
  expect(count).toBe(0);
};

/**
 * Create a line matcher from patterns.
 * @param {RegExp|RegExp[]} patterns - Pattern(s) to match
 * @param {function} toViolation - (line, lineNum, match, path) => violation
 */
const createPatternMatcher = (patterns, toViolation) => {
  const patternList = [patterns].flat();
  return (line, lineNum, _source, relativePath) => {
    const result = matchAny(line, patternList);
    return result
      ? toViolation(line.trim(), lineNum, result.match, relativePath)
      : null;
  };
};

/**
 * Create a reusable code checker with find and analyze functions.
 * Consolidates the common find-X/analyze-X pattern into a single factory.
 *
 * @param {object} config
 * @param {RegExp|RegExp[]} config.patterns - Pattern(s) to match in source lines
 * @param {RegExp[]} [config.skipPatterns] - Patterns that indicate lines to skip
 * @param {function} [config.extractData] - (line, lineNum, match) => additional data | null
 * @param {string[]} config.files - File list to analyze
 * @param {string[]} [config.excludeFiles] - Files to exclude from analysis
 * @returns {{ find: (source: string) => Array, analyze: () => Array }}
 */
const createCodeChecker = (config) => {
  const {
    patterns,
    skipPatterns = COMMENT_LINE_PATTERNS,
    extractData = () => ({}),
    files,
    excludeFiles: excluded = [],
  } = config;

  const patternList = [patterns].flat();

  // Pure function: find matches in source code
  const find = (source) =>
    scanLines(source, (line, lineNum) => {
      const trimmed = line.trim();

      // Skip lines matching skip patterns
      if (skipPatterns.some((p) => p.test(trimmed))) return null;

      // Check for pattern match
      const result = matchAny(line, patternList);
      if (!result) return null;

      // Extract additional data from match
      const extra = extractData(line, lineNum, result.match);
      return extra === null
        ? null
        : { lineNumber: lineNum, line: trimmed, ...extra };
    });

  // Pure function: analyze files and collect violations
  const analyze = () =>
    analyzeFiles(
      files,
      (source, relativePath) =>
        find(source).map((hit) => ({
          file: relativePath,
          line: hit.lineNumber,
          code: hit.line,
          ...Object.fromEntries(
            Object.entries(hit).filter(
              ([k]) => !["lineNumber", "line"].includes(k),
            ),
          ),
        })),
      { excludeFiles: excluded },
    );

  return { find, analyze };
};

export {
  // Common patterns
  COMMENT_LINE_PATTERNS,
  isCommentLine,
  // File reading
  readSource,
  toLines,
  // File list utilities
  excludeFiles,
  combineFileLists,
  // Pattern matching
  matchAny,
  scanLines,
  findPatterns,
  createPatternMatcher,
  // File analysis
  analyzeFiles,
  scanFilesForViolations,
  // Code checker factory
  createCodeChecker,
  // Violation reporting
  formatViolationReport,
  assertNoViolations,
};
