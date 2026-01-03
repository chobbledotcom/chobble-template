import { describe, expect, test } from "bun:test";
import {
  analyzeFiles,
  assertNoViolations,
  combineFileLists,
  scanLines,
} from "#test/code-scanner.js";
import {
  ECOMMERCE_JS_FILES,
  SRC_JS_FILES,
  TEST_FILES,
} from "#test/test-utils.js";

const THEN_REGEX = /\.then\s*\(/;
const isComment = (line) => line.startsWith("//") || line.startsWith("*");

/**
 * Find all .then() calls in a file
 */
const findThenCalls = (source) =>
  scanLines(source, (line, lineNum) => {
    const trimmed = line.trim();
    if (!THEN_REGEX.test(line) || isComment(trimmed)) return null;
    return { lineNumber: lineNum, line: trimmed };
  });

const THIS_FILE = "test/code-quality/then-usage.test.js";

/**
 * Analyze all JS files and find .then() usage
 */
const analyzeThenUsage = () =>
  analyzeFiles(
    combineFileLists(
      [SRC_JS_FILES, ECOMMERCE_JS_FILES, TEST_FILES],
      [THIS_FILE],
    ),
    (source, relativePath) =>
      findThenCalls(source).map((tc) => ({
        file: relativePath,
        line: tc.lineNumber,
        code: tc.line,
      })),
  );

describe("then-usage", () => {
  test("Correctly identifies .then() calls in source code", () => {
    const source = `
const a = 1;
fetch(url).then((res) => res.json());
promise.then(handleSuccess);
// promise.then(comment);
await asyncFunction();
    `;
    const results = findThenCalls(source);
    expect(results.length).toBe(2);
  });

  test("No .then() chains - use async/await instead", () => {
    const violations = analyzeThenUsage();
    assertNoViolations(violations, {
      message: ".then() call(s)",
      fixHint: "use async/await instead of .then() chains",
    });
  });
});
