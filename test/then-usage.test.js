import {
  analyzeFiles,
  assertNoViolations,
  combineFileLists,
  scanLines,
} from "#test/code-scanner.js";
import {
  createTestRunner,
  ECOMMERCE_JS_FILES,
  expectTrue,
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

const THIS_FILE = "test/then-usage.test.js";

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

const testCases = [
  {
    name: "find-then-in-source",
    description: "Correctly identifies .then() calls in source code",
    test: () => {
      const source = `
const a = 1;
fetch(url).then((res) => res.json());
promise.then(handleSuccess);
// promise.then(comment);
await asyncFunction();
      `;
      const results = findThenCalls(source);
      expectTrue(
        results.length === 2,
        `Expected 2 .then() calls, found ${results.length}`,
      );
    },
  },
  {
    name: "no-then-chains",
    description: "No .then() chains - use async/await instead",
    test: () => {
      const violations = analyzeThenUsage();
      assertNoViolations(expectTrue, violations, {
        message: ".then() call(s)",
        fixHint: "use async/await instead of .then() chains",
      });
    },
  },
];

createTestRunner("then-usage", testCases);
