/**
 * Code scanner utilities for code quality tests.
 * Uses one-pass scans with bounded local state.
 */
import { expect } from "vitest";
import { fs, path, rootDir } from "#test/test-utils.js";
import { notMemberOf, pluralize } from "#utils/fp/array.js";
import { filterObject, frozenObject } from "#utils/fp/object.js";
import { frozenSet } from "#utils/fp/set.js";

// Standard fields returned by find functions (everything else is extra data)
const STANDARD_HIT_FIELDS = ["lineNumber", "line"];
const omitStandardFields = filterObject(
  (key) => !STANDARD_HIT_FIELDS.includes(key),
);

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

// ============================================
// Brace depth tracking utilities
// ============================================

const STRING_QUOTES = frozenSet(['"', "'", "`"]);

/**
 * Remove string literals from a line to avoid false positives when tracking braces.
 * Handles double-quoted, single-quoted, and template strings.
 *
 * @param {string} line - Source code line
 * @returns {string} Line with string contents removed
 */
const removeStrings = (line) => {
  const unquotedChars = function* () {
    const state = { quote: null, escaped: false };
    for (const char of line) {
      if (state.escaped) {
        state.escaped = false;
      } else if (state.quote !== null) {
        if (char === "\\") state.escaped = true;
        else if (char === state.quote) state.quote = null;
      } else if (STRING_QUOTES.has(char)) {
        state.quote = char;
      } else {
        yield char;
      }
    }
  };
  return [...unquotedChars()].join("");
};

/**
 * Count occurrences of a character in a string.
 *
 * @param {string} char - Character to count
 * @returns {(str: string) => number} Curried counter function
 */
const countChar = (char) => (str) => [...str].filter((c) => c === char).length;

/**
 * Track brace depth to detect if we're inside a function body.
 * Returns the brace depth change for a line (positive = more opens than closes).
 *
 * @param {string} line - Source code line
 * @returns {number} Net change in brace depth
 */
const getBraceDepthChange = (line) => {
  const withoutStrings = removeStrings(line);
  return countChar("{")(withoutStrings) - countChar("}")(withoutStrings);
};

/**
 * Scan source code tracking brace depth, returning matches inside function bodies.
 * This is a higher-order function that accepts a matcher predicate.
 *
 * @param {object} config - Scanner configuration
 * @param {RegExp} config.pattern - Pattern to match in lines
 * @param {(line: string) => boolean} [config.skipLine] - Predicate to skip lines
 * @param {(line: string, lineNum: number, depth: number) => object | null} [config.extractData] - Extract additional data from matches
 * @returns {(source: string) => Array} Scanner function
 */
const createBraceDepthScanner = (config) => {
  const { pattern, skipLine = () => false, extractData = () => ({}) } = config;

  return (source) => {
    const scanMatches = function* () {
      const state = { depth: 0 };
      for (const { line, num } of toLines(source)) {
        const depth = state.depth;
        const withoutStrings = removeStrings(line);
        state.depth = Math.max(
          0,
          depth +
            countChar("{")(withoutStrings) -
            countChar("}")(withoutStrings),
        );
        if (skipLine(line) || depth === 0 || !pattern.test(withoutStrings)) {
          continue;
        }
        const extraData = extractData(line, num, depth);
        if (extraData !== null) {
          yield {
            lineNumber: num,
            line: line.trim(),
            braceDepth: depth,
            ...extraData,
          };
        }
      }
    };
    return [...scanMatches()];
  };
};

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
 * Uses vitest's expect internally.
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

  return [...allowlist].flatMap((entry) => {
    // Entries for deleted or renamed files are stale, not a crash
    if (!fs.existsSync(path.join(rootDir, entry.split(":")[0]))) {
      return [{ entry, reason: "File no longer exists" }];
    }

    // File-only entries (no line number) - verify file has at least one match
    if (!entry.includes(":")) {
      const source = readSource(entry);
      const hasMatch = source
        .split("\n")
        .some((line) => patternList.some((p) => p.test(line)));
      return hasMatch
        ? []
        : [{ entry, reason: "File contains no lines matching pattern" }];
    }

    const [filePath, lineNumStr] = entry.split(":");
    const lineNum = Number.parseInt(lineNumStr, 10);
    const source = readSource(filePath);
    const lines = source.split("\n");

    // Check if line exists
    if (lineNum > lines.length || lineNum < 1) {
      return [
        {
          entry,
          reason: `Line ${lineNum} doesn't exist (file has ${lines.length} lines)`,
        },
      ];
    }

    // Check if line matches pattern
    const line = lines[lineNum - 1];

    return patternList.some((p) => p.test(line))
      ? []
      : [
          {
            entry,
            reason: `Line no longer matches pattern: "${line.trim().slice(0, 50)}..."`,
          },
        ];
  });
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

// ============================================
// Function Name Allowlist Validation
// ============================================

// Common patterns for detecting function definitions
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

// ============================================
// Export Detection Utilities
// ============================================

// Matches: export function name or export async function name
const EXPORT_FUNCTION_PATTERN =
  /^\s*export\s+(?:async\s+)?function\s+([a-zA-Z_$][a-zA-Z0-9_$]*)/;

// Matches: export const/let/var name
const EXPORT_VAR_PATTERN =
  /^\s*export\s+(?:const|let|var)\s+([a-zA-Z_$][a-zA-Z0-9_$]*)/;

// Matches names inside: export { name1, name2, name3 as alias } (single-line only)
const EXPORT_LIST_PATTERN = /^\s*export\s*\{([^}]+)\}/;

// Matches start of export list: export {
const EXPORT_BRACE_START = /^\s*export\s*\{/;

// Matches: export default name or export default function name
const EXPORT_DEFAULT_PATTERN =
  /^\s*export\s+default\s+(?:function\s+)?([a-zA-Z_$][a-zA-Z0-9_$]*)/;

/**
 * Parse export names from export list content, dropping aliases.
 * Handles: "name1, name2, name3 as alias"
 * @param {string} content - Content between { and }
 * @returns {string[]}
 */
const parseExportNames = (content) =>
  content
    .split(",")
    .map((n) =>
      n
        .trim()
        .split(/\s+as\s+/)[0]
        .trim(),
    )
    .filter((n) => n && /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(n));

/**
 * Extract all named exports from source code.
 * Returns a Set of exported identifiers.
 * Handles both single-line and multi-line export lists.
 *
 * @param {string} source - Source code to analyze
 * @returns {Set<string>} - Set of exported names
 */
const extractExports = (source) => {
  const lines = source.split("\n");
  const exportedNames = function* () {
    const state = { pendingStart: null };
    for (const [index, line] of lines.entries()) {
      if (isCommentLine(line)) continue;

      if (state.pendingStart !== null) {
        const closeIndex = line.indexOf("}");
        if (closeIndex === -1) continue;
        const opening = lines[state.pendingStart];
        const content = [
          opening.slice(opening.indexOf("{") + 1),
          ...lines
            .slice(state.pendingStart + 1, index)
            .filter((part) => !isCommentLine(part)),
          line.slice(0, closeIndex),
        ].join("");
        yield* parseExportNames(content);
        state.pendingStart = null;
        continue;
      }

      const declaration =
        line.match(EXPORT_FUNCTION_PATTERN) || line.match(EXPORT_VAR_PATTERN);
      if (declaration) {
        yield declaration[1];
      } else if (EXPORT_BRACE_START.test(line)) {
        const braceEnd = line.indexOf("}");
        if (braceEnd === -1) state.pendingStart = index;
        else
          yield* parseExportNames(line.slice(line.indexOf("{") + 1, braceEnd));
      } else {
        const defaultMatch = line.match(EXPORT_DEFAULT_PATTERN);
        if (defaultMatch) yield defaultMatch[1];
      }
    }
  };
  return frozenSet(exportedNames());
};

/**
 * Assert properties of a brace depth scan result.
 * Useful for testing createBraceDepthScanner outputs.
 *
 * @param {object} result - Scan result to validate
 * @param {object} expected - Expected values (lineNumber, braceDepth, etc.)
 */
const expectScanResult = (result, expected) => {
  for (const [key, value] of Object.entries(expected)) {
    expect(result[key]).toBe(value);
  }
};

export {
  // File analysis
  analyzeFiles,
  // Allowlist analysis
  analyzeWithAllowlist,
  assertNoViolations,
  // Common patterns
  COMMENT_LINE_PATTERNS,
  combineFileLists,
  countChar,
  createBraceDepthScanner,
  // Code checker factory
  createCodeChecker,
  createPatternMatcher,
  // Violation factory
  createViolation,
  // File list utilities
  excludeFiles,
  expectNoStaleExceptions,
  expectScanResult,
  // Export detection
  extractExports,
  findPatterns,
  // Violation reporting
  formatViolationReport,
  getBraceDepthChange,
  isCommentLine,
  // Function allowlist validation
  isFunctionDefined,
  // Pattern matching
  matchesAny,
  noStaleAllowlist,
  // File reading
  readSource,
  // Brace depth tracking
  removeStrings,
  scanFilesForViolations,
  scanLines,
  toLines,
  // Exception validation
  validateExceptions,
  validateFunctionAllowlist,
  withAllowlist,
};
