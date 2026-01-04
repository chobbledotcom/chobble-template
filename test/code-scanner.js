/**
 * Code scanner utilities for code quality tests.
 * Written in a functional, immutable style.
 */
import { expect } from "bun:test";
import { fs, path, rootDir } from "#test/test-utils.js";
import { notMemberOf } from "#utils/array-utils.js";

// ============================================
// Common patterns for skipping non-code lines
// ============================================

/**
 * Curried pattern matcher - returns the first match result or null.
 * @param {RegExp[]} patterns - Array of patterns to test against
 * @returns {(str: string) => {match: RegExpMatchArray, pattern: RegExp} | null}
 */
const matchesAny = (patterns) => (str) => {
  for (const pattern of patterns) {
    const match = str.match(pattern);
    if (match) return { match, pattern };
  }
  return null;
};

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
  !!matchesAny(COMMENT_LINE_PATTERNS)(line.trim());

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
const excludeFiles = (files, exclude = []) =>
  files.filter(notMemberOf(exclude));

/**
 * Combine multiple file lists, optionally excluding some.
 */
const combineFileLists = (fileLists, exclude = []) =>
  excludeFiles(fileLists.flat(), exclude);

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
    const result = matchesAny(patterns)(line);
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
  const matcher = matchesAny([patterns].flat());
  return (line, lineNum, _source, relativePath) => {
    const result = matcher(line);
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

  const matcher = matchesAny([patterns].flat());
  const shouldSkip = matchesAny(skipPatterns);

  // Pure function: find matches in source code
  const find = (source) =>
    scanLines(source, (line, lineNum) => {
      const trimmed = line.trim();

      // Skip lines matching skip patterns
      if (shouldSkip(trimmed)) return null;

      // Check for pattern match
      const result = matcher(line);
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

/**
 * Analyze files with a find function and filter by allowlist.
 * Consolidates the common pattern of finding issues then filtering by exceptions.
 *
 * @param {object} config
 * @param {function} config.findFn - Function (source) => Array of hits with lineNumber, line, and optional extra fields
 * @param {Set<string>} [config.allowlist] - Set of "file:line" or "file" entries to allow (defaults to empty Set)
 * @param {string[]|function} [config.files] - File list or function returning file list (defaults to empty array)
 * @returns {{ violations: Array, allowed: Array }}
 */
const analyzeWithAllowlist = (config) => {
  const { findFn, allowlist = new Set(), files = [] } = config;
  const fileList = typeof files === "function" ? files() : files;

  const results = analyzeFiles(fileList, (source, relativePath) =>
    findFn(source).map((hit) => ({
      file: relativePath,
      line: hit.lineNumber,
      code: hit.line,
      location: `${relativePath}:${hit.lineNumber}`,
      // Spread any extra fields from the hit (like 'reason')
      ...Object.fromEntries(
        Object.entries(hit).filter(
          ([k]) => !["lineNumber", "line"].includes(k),
        ),
      ),
    })),
  );

  const isAllowlisted = (decl) =>
    allowlist.has(decl.location) || allowlist.has(decl.file);

  return {
    violations: results.filter((decl) => !isAllowlisted(decl)),
    allowed: results.filter(isAllowlisted),
  };
};

/**
 * Validate that exception entries still refer to lines containing the expected pattern.
 * Returns stale entries that no longer exist or no longer match.
 *
 * @param {Set<string>} allowlist - Set of "file:line" or "file" entries
 * @param {RegExp|RegExp[]} patterns - Pattern(s) the line should match
 * @returns {Array<{entry: string, reason: string}>} Stale entries
 */
const validateExceptions = (allowlist, patterns) => {
  const patternList = [patterns].flat();
  const stale = [];

  for (const entry of allowlist) {
    // Skip file-only entries (no line number)
    if (!entry.includes(":")) continue;

    const [filePath, lineNumStr] = entry.split(":");
    const lineNum = parseInt(lineNumStr, 10);

    try {
      const source = readSource(filePath);
      const lines = source.split("\n");

      // Check if line exists
      if (lineNum > lines.length || lineNum < 1) {
        stale.push({
          entry,
          reason: `Line ${lineNum} doesn't exist (file has ${lines.length} lines)`,
        });
        continue;
      }

      // Check if line matches pattern
      const line = lines[lineNum - 1];

      if (!patternList.some((p) => p.test(line))) {
        stale.push({
          entry,
          reason: `Line no longer matches pattern: "${line.trim().slice(0, 50)}..."`,
        });
      }
    } catch {
      stale.push({ entry, reason: `File not found: ${filePath}` });
    }
  }

  return stale;
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
  matchesAny,
  scanLines,
  findPatterns,
  createPatternMatcher,
  // File analysis
  analyzeFiles,
  scanFilesForViolations,
  // Code checker factory
  createCodeChecker,
  // Allowlist analysis
  analyzeWithAllowlist,
  // Violation reporting
  formatViolationReport,
  assertNoViolations,
  // Exception validation
  validateExceptions,
};
