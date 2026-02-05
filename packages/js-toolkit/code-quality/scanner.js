/**
 * Code scanner utilities for code quality tests.
 * Written in a functional, immutable style.
 */
import fs from "node:fs";
import path from "node:path";
import { notMemberOf, pluralize } from "../fp/array.js";
import { frozenObject, omit } from "../fp/object.js";

const STANDARD_HIT_FIELDS = ["lineNumber", "line"];
const omitStandardFields = omit(STANDARD_HIT_FIELDS);

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
 * @param {string} relativePath - Path relative to rootDir
 * @param {string} rootDir - Root directory
 * @returns {string} File contents
 */
const readSource = (relativePath, rootDir) =>
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
 * @param {object} options - { excludeFiles: string[], rootDir: string }
 */
const analyzeFiles = (files, analyzer, options = {}) =>
  excludeFiles(files, options.excludeFiles || []).flatMap(
    (relativePath) =>
      analyzer(readSource(relativePath, options.rootDir), relativePath) || [],
  );

/**
 * Scan files line-by-line, collecting violations.
 * @param {string[]} files - File paths relative to rootDir
 * @param {function} matcher - (line, lineNum, source, path) => violation | null
 * @param {object} options - { excludeFiles: string[], rootDir: string }
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
  if (violations.length === 0) return { count: 0, report: "" };

  const fixHint = options.fixHint ?? "";
  const limit = options.limit ?? 10;
  const formatCount = options.singular
    ? pluralize(options.singular, options.plural)
    : (n) => `${n} ${options.message || "violation(s)"}`;

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
 * @param {Array} violations - Violations to check
 * @param {Object} options - Report options
 */
const assertNoViolations = (violations, options = {}) => {
  const { expect } = require("bun:test");
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
 * Analyze files with a find function and filter by allowlist.
 * Consolidates the common pattern of finding issues then filtering by exceptions.
 *
 * @param {object} config
 * @param {function} config.findFn - Function (source) => Array of hits with lineNumber, line, and optional extra fields
 * @param {Set<string>} [config.allowlist] - Set of "file:line" or "file" entries to allow (defaults to empty Set)
 * @param {string[]|function} [config.files] - File list or function returning file list (defaults to empty array)
 * @param {string[]} [config.excludeFiles] - Files to exclude from analysis
 * @param {string} config.rootDir - Root directory for file reading
 * @returns {{ violations: Array, allowed: Array }}
 */
const hitToResult = (hit, relativePath) => ({
  file: relativePath,
  line: hit.lineNumber,
  code: hit.line,
  location: `${relativePath}:${hit.lineNumber}`,
  ...omitStandardFields(hit),
});

const analyzeWithAllowlist = (config) => {
  const {
    findFn,
    allowlist = new Set(),
    files = [],
    excludeFiles = [],
    rootDir,
  } = config;
  const fileList = typeof files === "function" ? files() : files;

  const results = analyzeFiles(
    fileList,
    (source, relativePath) =>
      findFn(source).map((hit) => hitToResult(hit, relativePath)),
    { excludeFiles, rootDir },
  );

  const isAllowlisted = (decl) =>
    allowlist.has(decl.location) || allowlist.has(decl.file);
  return {
    violations: results.filter((d) => !isAllowlisted(d)),
    allowed: results.filter(isAllowlisted),
  };
};

/**
 * Create a line scanner function for pattern matching.
 * @param {function} shouldSkip - Predicate to skip lines
 * @param {function} matcher - Pattern matcher function
 * @param {function} extractData - Data extractor function
 */
const createLineMatcher =
  (shouldSkip, matcher, extractData) => (line, lineNum) => {
    const trimmed = line.trim();
    if (shouldSkip(trimmed)) return null;

    const result = matcher(line);
    if (result === null) return null;

    const extra = extractData(line, lineNum, result.match);
    return extra === null
      ? null
      : { lineNumber: lineNum, line: trimmed, ...extra };
  };

/**
 * Create a reusable code checker with find and analyze functions.
 * @param {object} config - Configuration object
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
    rootDir,
  } = config;

  const matcher = matchesAny([patterns].flat());
  const lineMatcher = createLineMatcher(
    matchesAny(skipPatterns),
    matcher,
    extractData,
  );
  const find = (source) => scanLines(source, lineMatcher);

  const analyze = () =>
    analyzeWithAllowlist({
      findFn: find,
      allowlist: allowlist ?? new Set(),
      files,
      excludeFiles: excluded,
      rootDir,
    });

  return { find, analyze };
};

/**
 * Create a zero-argument analyzer from a custom find function with allowlist.
 * For tests that need custom find logic (not pattern-based).
 *
 * @param {object} config
 * @param {function} config.find - Function (source) => Array of hits with lineNumber, line
 * @param {Set<string>} [config.allowlist] - Set of "file:line" or "file" entries to allow
 * @param {string[]|function} config.files - File list or function returning file list
 * @param {string} config.rootDir - Root directory for file reading
 * @returns {function} Zero-argument function returning { violations, allowed }
 *
 * @example
 * const tryCatchAnalysis = withAllowlist({
 *   find: findTryCatches,
 *   allowlist: ALLOWED_TRY_CATCHES,
 *   files: () => combineFileLists([SRC_JS_FILES(), TEST_FILES()], [THIS_FILE]),
 *   rootDir,
 * });
 * const { violations, allowed } = tryCatchAnalysis();
 */
const withAllowlist = (config) => () =>
  analyzeWithAllowlist({
    findFn: config.find,
    allowlist: config.allowlist ?? new Set(),
    files: config.files,
    rootDir: config.rootDir,
  });

const validateFileEntry = (entry, patternList, rootDir) => {
  const source = readSource(entry, rootDir);
  const hasMatch = source
    .split("\n")
    .some((line) => patternList.some((p) => p.test(line)));
  return hasMatch
    ? []
    : [{ entry, reason: "File contains no lines matching pattern" }];
};

const validateLineEntry = (entry, patternList, rootDir) => {
  const [filePath, lineNumStr] = entry.split(":");
  const lineNum = Number.parseInt(lineNumStr, 10);
  const lines = readSource(filePath, rootDir).split("\n");

  if (lineNum > lines.length || lineNum < 1) {
    return [
      {
        entry,
        reason: `Line ${lineNum} doesn't exist (file has ${lines.length} lines)`,
      },
    ];
  }

  const line = lines[lineNum - 1];
  if (!patternList.some((p) => p.test(line))) {
    return [
      {
        entry,
        reason: `Line no longer matches pattern: "${line.trim().slice(0, 50)}..."`,
      },
    ];
  }
  return [];
};

/**
 * Validate that exception entries still refer to lines containing the expected pattern.
 * @param {Set<string>} allowlist - Set of "file:line" or "file" entries
 * @param {RegExp|RegExp[]} patterns - Pattern(s) the line should match
 * @param {string} rootDir - Root directory for file reading
 * @returns {Array<{entry: string, reason: string}>} Stale entries
 */
const validateExceptions = (allowlist, patterns, rootDir) => {
  const patternList = [patterns].flat();
  return [...allowlist].flatMap((entry) =>
    entry.includes(":")
      ? validateLineEntry(entry, patternList, rootDir)
      : validateFileEntry(entry, patternList, rootDir),
  );
};

/**
 * Log stale entries and assert none exist.
 * Common helper for stale allowlist validation functions.
 *
 * @param {Array<{entry: string, reason?: string}>} stale - Stale entries to report
 * @param {string} label - Name of the allowlist for logging
 * @param {function} [formatEntry] - Optional entry formatter (default: entry with reason if present)
 */
const assertNoStaleEntries = (
  stale,
  label,
  formatEntry = (s) => (s.reason ? `${s.entry}: ${s.reason}` : s.entry),
) => {
  const { expect } = require("bun:test");
  if (stale.length > 0) {
    console.log(`\n  Stale ${label} entries:`);
    for (const s of stale) {
      console.log(`    - ${formatEntry(s)}`);
    }
  }
  expect(stale.length).toBe(0);
};

/**
 * Create a stale entry assertion function from a validation function.
 * Composes validation with assertNoStaleEntries for consistent behavior.
 *
 * @param {function} validateFn - Validation function returning stale entries array
 * @param {function} [formatEntry] - Optional entry formatter for logging
 * @returns {function} Assertion function that validates and asserts no stale entries
 */
const withStaleAssertion =
  (validateFn, formatEntry) =>
  (...args) => {
    const label = args.pop();
    return assertNoStaleEntries(validateFn(...args), label, formatEntry);
  };

/**
 * Assert no stale exception entries exist.
 * Logs stale entries and fails test if any found.
 *
 * @param {Set<string>} allowlist - Set of "file:line" or "file" entries
 * @param {RegExp|RegExp[]} patterns - Pattern(s) the line should match
 * @param {string} rootDir - Root directory for file reading
 * @param {string} label - Name of the allowlist for logging (e.g., "ALLOWED_NULL_CHECKS")
 */
const expectNoStaleExceptions = withStaleAssertion(validateExceptions);

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

const FUNCTION_DEFINITION_PATTERNS = frozenObject({
  const: (name) => new RegExp(`\\bconst\\s+${name}\\s*=`),
  let: (name) => new RegExp(`\\blet\\s+${name}\\s*=`),
  var: (name) => new RegExp(`\\bvar\\s+${name}\\s*=`),
  function: (name) => new RegExp(`\\bfunction\\s+${name}\\s*\\(`),
  destructuring: (name) => new RegExp(`:\\s*${name}\\s*[,})]`),
});

/**
 * Check if a function name is defined in the given source code.
 * Looks for common definition patterns: const/let/var/function declarations and destructuring.
 *
 * @param {string} name - Function name to search for
 * @param {string} source - Source code to search in
 * @returns {boolean} True if the function is defined
 */
const isFunctionDefined = (name, source) =>
  Object.values(FUNCTION_DEFINITION_PATTERNS).some((createPattern) =>
    createPattern(name).test(source),
  );

/**
 * Validate that function names in an allowlist are actually defined in source files.
 * Returns entries that are no longer defined anywhere.
 *
 * @param {Set<string>} allowlist - Set of function names
 * @param {string} combinedSource - Combined source code from all files to search
 * @returns {Array<{entry: string, reason: string}>} Stale entries
 */
const validateFunctionAllowlist = (allowlist, combinedSource) =>
  [...allowlist]
    .filter((name) => !isFunctionDefined(name, combinedSource))
    .map((name) => ({
      entry: name,
      reason: "Function is not defined in any file",
    }));

/**
 * Assert no stale function allowlist entries exist.
 * Logs stale entries and fails test if any found.
 *
 * @param {Set<string>} allowlist - Set of function names
 * @param {string} combinedSource - Combined source code to search
 * @param {string} label - Name of the allowlist for logging
 */
const noStaleAllowlist = withStaleAssertion(
  validateFunctionAllowlist,
  (s) => s.entry,
);

const EXPORT_FUNCTION_PATTERN =
  /^\s*export\s+(?:async\s+)?function\s+([a-zA-Z_$][a-zA-Z0-9_$]*)/;

const EXPORT_VAR_PATTERN =
  /^\s*export\s+(?:const|let|var)\s+([a-zA-Z_$][a-zA-Z0-9_$]*)/;

const EXPORT_BRACE_START = /^\s*export\s*\{/;

const EXPORT_DEFAULT_PATTERN =
  /^\s*export\s+default\s+(?:function\s+)?([a-zA-Z_$][a-zA-Z0-9_$]*)/;

/**
 * Parse export names from export list content.
 * Handles: "name1, name2, name3 as alias"
 * @param {string} content - Content between { and }
 * @param {Set<string>} exported - Set to add exports to
 */
const parseExportListContent = (content, exported) => {
  const names = content
    .split(",")
    .map((n) =>
      n
        .trim()
        .split(/\s+as\s+/)[0]
        .trim(),
    )
    .filter((n) => n && /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(n));
  for (const name of names) {
    exported.add(name);
  }
};

/**
 * Extract all named exports from source code.
 * Returns a Set of exported identifiers.
 * Handles both single-line and multi-line export lists.
 *
 * @param {string} source - Source code to analyze
 * @returns {Set<string>} - Set of exported names
 */
const extractExports = (source) => {
  const exported = new Set();
  const lines = source.split("\n");
  let multiLineBuffer = null;

  for (const line of lines) {
    if (isCommentLine(line)) continue;

    if (multiLineBuffer !== null) {
      const closeIndex = line.indexOf("}");
      if (closeIndex !== -1) {
        multiLineBuffer += line.slice(0, closeIndex);
        parseExportListContent(multiLineBuffer, exported);
        multiLineBuffer = null;
      } else {
        multiLineBuffer += line;
      }
      continue;
    }

    const funcMatch = line.match(EXPORT_FUNCTION_PATTERN);
    if (funcMatch) {
      exported.add(funcMatch[1]);
      continue;
    }

    const varMatch = line.match(EXPORT_VAR_PATTERN);
    if (varMatch) {
      exported.add(varMatch[1]);
      continue;
    }

    if (EXPORT_BRACE_START.test(line)) {
      const braceStart = line.indexOf("{");
      const braceEnd = line.indexOf("}");

      if (braceEnd !== -1) {
        parseExportListContent(line.slice(braceStart + 1, braceEnd), exported);
      } else {
        multiLineBuffer = line.slice(braceStart + 1);
      }
      continue;
    }

    const defaultMatch = line.match(EXPORT_DEFAULT_PATTERN);
    if (defaultMatch) {
      exported.add(defaultMatch[1]);
    }
  }

  return exported;
};

export {
  analyzeFiles,
  analyzeWithAllowlist,
  assertNoViolations,
  COMMENT_LINE_PATTERNS,
  combineFileLists,
  createCodeChecker,
  createPatternMatcher,
  createViolation,
  excludeFiles,
  expectNoStaleExceptions,
  noStaleAllowlist,
  extractExports,
  findPatterns,
  formatViolationReport,
  isCommentLine,
  isFunctionDefined,
  matchesAny,
  readSource,
  scanFilesForViolations,
  scanLines,
  toLines,
  validateExceptions,
  validateFunctionAllowlist,
  withAllowlist,
};
