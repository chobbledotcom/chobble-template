import {
  analyzeFiles,
  assertNoViolations,
  combineFileLists,
  scanLines,
} from "#test/code-scanner.js";
import {
  createTestRunner,
  ECOMMERCE_JS_FILES,
  expectStrictEqual,
  expectTrue,
  SRC_JS_FILES,
  TEST_FILES,
} from "#test/test-utils.js";

const TODO_FIXME_REGEX = /\b(TODO|FIXME)\b/gi;

/**
 * Find all TODO/FIXME occurrences in a file
 */
const findTodoFixme = (source) =>
  scanLines(source, (line, lineNum) => {
    const match = line.match(TODO_FIXME_REGEX);
    return match
      ? { lineNumber: lineNum, line: line.trim(), match: match[0] }
      : null;
  });

const EXCLUDE_FILES = [
  "test/todo-fixme-comments.test.js",
  "test/commented-code.test.js",
];

/**
 * Analyze all JS files and find TODO/FIXME comments
 */
const analyzeTodoFixme = () =>
  analyzeFiles(
    combineFileLists(
      [SRC_JS_FILES, ECOMMERCE_JS_FILES, TEST_FILES],
      EXCLUDE_FILES,
    ),
    (source, relativePath) =>
      findTodoFixme(source).map((tf) => ({
        file: relativePath,
        line: tf.lineNumber,
        code: tf.line,
        match: tf.match,
      })),
  );

const testCases = [
  {
    name: "find-todo-fixme-in-source",
    description: "Correctly identifies TODO/FIXME comments in source code",
    test: () => {
      const source = `
const a = 1;
// TODO: fix this later
const b = 2;
/* FIXME: this is broken */
const c = 3;
const todoList = []; // variable name, not a comment
      `;
      const results = findTodoFixme(source);
      expectStrictEqual(results.length, 2, "Should find 2 TODO/FIXME comments");
      expectStrictEqual(
        results[0].lineNumber,
        3,
        "First comment should be on line 3",
      );
      expectStrictEqual(results[0].match, "TODO", "First match should be TODO");
      expectStrictEqual(
        results[1].lineNumber,
        5,
        "Second comment should be on line 5",
      );
      expectStrictEqual(
        results[1].match,
        "FIXME",
        "Second match should be FIXME",
      );
    },
  },
  {
    name: "no-todo-fixme-comments",
    description: "No TODO/FIXME comments in the codebase",
    test: () => {
      const violations = analyzeTodoFixme();
      assertNoViolations(expectTrue, violations, {
        message: "TODO/FIXME comment(s)",
        fixHint: "resolve the TODO/FIXME before committing",
      });
    },
  },
];

createTestRunner("todo-fixme-comments", testCases);
