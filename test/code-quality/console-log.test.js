import { describe, test, expect } from "bun:test";
import { ALLOWED_CONSOLE } from "#test/code-quality/code-quality-exceptions.js";
import {
  analyzeFiles,
  assertNoViolations,
  combineFileLists,
  isCommentLine,
  matchAny,
  scanLines,
} from "#test/code-scanner.js";
import { ECOMMERCE_JS_FILES, SRC_JS_FILES } from "#test/test-utils.js";

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

describe("console-log", () => {
  test("Detects console.log calls", () => {
    const source = 'console.log("hello");';
    const results = findConsoleCalls(source);
    expect(results.length).toBe(1);
    expect(results[0].method).toBe("log");
  });

  test("Detects console.error calls", () => {
    const source = 'console.error("error message");';
    const results = findConsoleCalls(source);
    expect(results.length).toBe(1);
    expect(results[0].method).toBe("error");
  });

  test("Detects console.warn calls", () => {
    const source = 'console.warn("warning");';
    const results = findConsoleCalls(source);
    expect(results.length).toBe(1);
    expect(results[0].method).toBe("warn");
  });

  test("Detects multiple console calls in source", () => {
    const source = `
const x = 1;
console.log("debug");
doSomething();
console.error("oops");
    `;
    const results = findConsoleCalls(source);
    expect(results.length).toBe(2);
  });

  test("Ignores console calls in single-line comments", () => {
    const source = `
// console.log("commented out");
const x = 1;
    `;
    const results = findConsoleCalls(source);
    expect(results.length).toBe(0);
  });

  test("Ignores console calls in block comment continuation lines", () => {
    const source = `
/*
 * console.log("in block comment");
 */
const x = 1;
    `;
    const results = findConsoleCalls(source);
    expect(results.length).toBe(0);
  });

  test("Does not flag code without console calls", () => {
    const source = `
const logger = { log: () => {} };
logger.log("this is fine");
myConsole.log("also fine");
    `;
    const results = findConsoleCalls(source);
    expect(results.length).toBe(0);
  });

  test("No console.* calls in production source files", () => {
    const violations = analyzeConsoleCalls();
    assertNoViolations(violations, {
      message: "console.* calls in production code",
      fixHint:
        "Remove console.* calls or add to ALLOWED_CONSOLE in code-quality-exceptions.js",
    });
  });

  test("Reports allowlisted console usage for tracking", () => {
    console.log(`\n  Allowlisted console.* files: ${ALLOWED_CONSOLE.size}`);
    console.log("  These should be reviewed periodically:\n");

    for (const file of ALLOWED_CONSOLE) {
      console.log(`     ${file}`);
    }
    console.log("");

    // This test always passes - it's informational
    expect(true).toBe(true);
  });
});
