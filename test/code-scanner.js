/**
 * Code scanner utilities for code quality tests.
 * Written in a functional, immutable style.
 */
import { expect } from "bun:test";
import { fs, path, rootDir } from "#test/test-utils.js";
import { notMemberOf, pluralize } from "#utils/array-utils.js";
import { omit } from "#utils/object-entries.js";

// Standard fields returned by find functions (everything else is extra data)
const STANDARD_HIT_FIELDS = ["lineNumber", "line"];
const omitStandardFields = omit(STANDARD_HIT_FIELDS);

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
 * Supports singular/plural forms via pluralize for proper grammar.
 *
 * @param {Array} violations - Array of violation objects
 * @param {Object} options
 * @param {string} [options.singular] - Singular form (e.g., "null check")
 * @param {string} [options.plural] - Plural form (e.g., "null checks")
 * @param {string} [options.message] - Legacy: message with (s) suffix (deprecated)
 * @param {string} [options.fixHint] - Hint for fixing violations
 * @param {number} [options.limit] - Max violations to show (default: 10)
 */
const formatViolationReport = (violations, options = {}) => {
  const { singular, plural, message, fixHint = "", limit = 10 } = options;

  if (violations.length === 0) return { count: 0, report: "" };

  // Use pluralize if singular provided (plural is optional, auto-derived if omitted)
  // Fall back to legacy message format if neither provided
  const formatCount = singular
    ? pluralize(singular, plural)
    : (n) => `${n} ${message || "violation(s)"}`;

  const header = `\n  Found ${formatCount(violations.length)}:`;
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
 * @param {string[]|function} [config.files] - File list or function returning file list
 * @param {string[]} [config.excludeFiles] - Files to exclude from analysis
 * @param {Set<string>} [config.allowlist] - Optional allowlist for filtering results
 * @returns {{ find: (source: string) => Array, analyze: () => Object }}
 */
const createCodeChecker = (config) => {
  const {
    patterns,
    skipPatterns = COMMENT_LINE_PATTERNS,
    extractData = () => ({}),
    files = [],
    excludeFiles: excluded = [],
    allowlist = null,
  } = config;

  const matcher = matchesAny([patterns].flat());
  const shouldSkip = matchesAny(skipPatterns);

  // Pure function: find matches in source code
  const find = (source) =>
    scanLines(source, (line, lineNum) => {
      const trimmed = line.trim();

      // Skip lines matching skip patterns
      if (shouldSkip(trimmed)) return null;

      // Check for pattern match (matcher returns { match, pattern } or null)
      const result = matcher(line);
      if (result === null) return null;

      // Extract additional data from match
      const extra = extractData(line, lineNum, result.match);
      return extra === null
        ? null
        : { lineNumber: lineNum, line: trimmed, ...extra };
    });

  // Pure function: analyze files and collect results
  // Delegates to analyzeWithAllowlist for consistent behavior
  const analyze = () =>
    analyzeWithAllowlist({
      findFn: find,
      allowlist: allowlist ?? new Set(),
      files,
      excludeFiles: excluded,
    });

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
 * @param {string[]} [config.excludeFiles] - Files to exclude from analysis
 * @returns {{ violations: Array, allowed: Array }}
 */
const analyzeWithAllowlist = (config) => {
  const {
    findFn,
    allowlist = new Set(),
    files = [],
    excludeFiles = [],
  } = config;
  const fileList = typeof files === "function" ? files() : files;

  const results = analyzeFiles(
    fileList,
    (source, relativePath) =>
      findFn(source).map((hit) => ({
        file: relativePath,
        line: hit.lineNumber,
        code: hit.line,
        location: `${relativePath}:${hit.lineNumber}`,
        ...omitStandardFields(hit),
      })),
    { excludeFiles },
  );

  const isAllowlisted = (decl) =>
    allowlist.has(decl.location) || allowlist.has(decl.file);

  return {
    violations: results.filter((decl) => !isAllowlisted(decl)),
    allowed: results.filter(isAllowlisted),
  };
};

/**
 * Create a zero-argument analyzer from a custom find function with allowlist.
 * For tests that need custom find logic (not pattern-based).
 *
 * @param {object} config
 * @param {function} config.find - Function (source) => Array of hits with lineNumber, line
 * @param {Set<string>} [config.allowlist] - Set of "file:line" or "file" entries to allow
 * @param {string[]|function} config.files - File list or function returning file list
 * @returns {function} Zero-argument function returning { violations, allowed }
 *
 * @example
 * const tryCatchAnalysis = withAllowlist({
 *   find: findTryCatches,
 *   allowlist: ALLOWED_TRY_CATCHES,
 *   files: () => combineFileLists([SRC_JS_FILES(), TEST_FILES()], [THIS_FILE]),
 * });
 * const { violations, allowed } = tryCatchAnalysis();
 */
const withAllowlist = (config) => () =>
  analyzeWithAllowlist({
    findFn: config.find,
    allowlist: config.allowlist ?? new Set(),
    files: config.files,
  });

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

/**
 * Curried violation factory for creating standardized violation objects.
 * Takes a reason function and returns a transformer for any context object.
 *
 * @param {function} reasonFn - (context) => string reason message
 * @returns {function} (context) => violation object
 *
 * @example
 * const vagueNameViolation = createViolation(
 *   (tc) => `Vague test name "${tc.name}" - use descriptive name`
 * );
 * const violation = vagueNameViolation({ file: 'test.js', line: 10, name: 'test1' });
 */
const createViolation = (reasonFn) => (context) => ({
  file: context.file,
  line: context.line,
  code: context.code ?? context.name,
  reason: reasonFn(context),
});

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
  withAllowlist,
  // Violation reporting
  formatViolationReport,
  assertNoViolations,
  // Violation factory
  createViolation,
  // Exception validation
  validateExceptions,
};
