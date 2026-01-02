import { ALLOWED_CONSOLE } from "#test/code-quality/code-quality-exceptions.js";
import {
  analyzeFiles,
  assertNoViolations,
  combineFileLists,
  isCommentLine,
  matchAny,
  scanLines,
} from "#test/code-scanner.js";
import {
  createTestRunner,
  ECOMMERCE_JS_FILES,
  expectTrue,
  SRC_JS_FILES,
} from "#test/test-utils.js";

// Patterns that match console.* calls
const CONSOLE_PATTERNS = [
  /\bconsole\.log\s*\(/,
  /\bconsole\.warn\s*\(/,
  /\bconsole\.error\s*\(/,
  /\bconsole\.info\s*\(/,
  /\bconsole\.debug\s*\(/,
  /\bconsole\.trace\s*\(/,
];

// Files that are allowed to have console statements (test infrastructure)
const TEST_ALLOWED_FILES = new Set([
  // Test runner outputs results
  "test/test-utils.js",
  // Code quality tests output violation reports
  "test/code-quality/console-log.test.js",
]);

/**
 * Find console.* calls in source code
 */
const findConsoleCalls = (source) =>
  scanLines(source, (line, lineNum) => {
    const trimmed = line.trim();

    // Skip comments (using shared helper from code-scanner)
    if (isCommentLine(trimmed)) return null;

    // Check for console.* patterns
    const result = matchAny(line, CONSOLE_PATTERNS);
    if (!result) return null;

    // Extract which console method was used
    const methodMatch = line.match(/console\.(\w+)/);
    const method = methodMatch ? methodMatch[1] : "log";

    return { lineNumber: lineNum, line: trimmed, method };
  });

/**
 * Analyze all source JS files for console.* calls
 */
const analyzeConsoleCalls = () => {
  const allExclusions = [...ALLOWED_CONSOLE, ...TEST_ALLOWED_FILES];

  return analyzeFiles(
    combineFileLists([SRC_JS_FILES, ECOMMERCE_JS_FILES]),
    (source, relativePath) =>
      findConsoleCalls(source).map((hit) => ({
        file: relativePath,
        line: hit.lineNumber,
        code: hit.line,
        method: hit.method,
      })),
    { excludeFiles: allExclusions },
  );
};

const testCases = [
  {
    name: "detect-console-log",
    description: "Detects console.log calls",
    test: () => {
      const source = 'console.log("hello");';
      const results = findConsoleCalls(source);
      expectTrue(results.length === 1, "Should detect console.log");
      expectTrue(results[0].method === "log", "Should identify method as log");
    },
  },
  {
    name: "detect-console-error",
    description: "Detects console.error calls",
    test: () => {
      const source = 'console.error("error message");';
      const results = findConsoleCalls(source);
      expectTrue(results.length === 1, "Should detect console.error");
      expectTrue(
        results[0].method === "error",
        "Should identify method as error",
      );
    },
  },
  {
    name: "detect-console-warn",
    description: "Detects console.warn calls",
    test: () => {
      const source = 'console.warn("warning");';
      const results = findConsoleCalls(source);
      expectTrue(results.length === 1, "Should detect console.warn");
      expectTrue(
        results[0].method === "warn",
        "Should identify method as warn",
      );
    },
  },
  {
    name: "detect-multiple-console-calls",
    description: "Detects multiple console calls in source",
    test: () => {
      const source = `
const x = 1;
console.log("debug");
doSomething();
console.error("oops");
      `;
      const results = findConsoleCalls(source);
      expectTrue(results.length === 2, "Should detect 2 console calls");
    },
  },
  {
    name: "ignore-single-line-comments",
    description: "Ignores console calls in single-line comments",
    test: () => {
      const source = `
// console.log("commented out");
const x = 1;
      `;
      const results = findConsoleCalls(source);
      expectTrue(results.length === 0, "Should ignore // comments");
    },
  },
  {
    name: "ignore-block-comment-lines",
    description: "Ignores console calls in block comment continuation lines",
    test: () => {
      const source = `
/*
 * console.log("in block comment");
 */
const x = 1;
      `;
      const results = findConsoleCalls(source);
      expectTrue(results.length === 0, "Should ignore block comment lines");
    },
  },
  {
    name: "ignore-non-console-code",
    description: "Does not flag code without console calls",
    test: () => {
      const source = `
const logger = { log: () => {} };
logger.log("this is fine");
myConsole.log("also fine");
      `;
      const results = findConsoleCalls(source);
      expectTrue(results.length === 0, "Should not flag non-console code");
    },
  },
  {
    name: "no-console-in-production-code",
    description: "No console.* calls in production source files",
    test: () => {
      const violations = analyzeConsoleCalls();
      assertNoViolations(expectTrue, violations, {
        message: "console.* calls in production code",
        fixHint:
          "Remove console.* calls or add to ALLOWED_CONSOLE in code-quality-exceptions.js",
      });
    },
  },
  {
    name: "report-allowed-console",
    description: "Reports allowlisted console usage for tracking",
    test: () => {
      console.log(`\n  Allowlisted console.* files: ${ALLOWED_CONSOLE.size}`);
      console.log("  These should be reviewed periodically:\n");

      for (const file of ALLOWED_CONSOLE) {
        console.log(`     ${file}`);
      }
      console.log("");

      // This test always passes - it's informational
      expectTrue(true, "Reported allowlisted console usage");
    },
  },
];

createTestRunner("console-log", testCases);
