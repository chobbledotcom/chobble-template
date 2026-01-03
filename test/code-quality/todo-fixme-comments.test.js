import { describe, test, expect } from "bun:test";
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
  "test/code-quality/todo-fixme-comments.test.js",
  "test/code-quality/commented-code.test.js",
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

describe("todo-fixme-comments", () => {
  test("Correctly identifies TODO/FIXME comments in source code", () => {
    const source = `
const a = 1;
// TODO: fix this later
const b = 2;
/* FIXME: this is broken */
const c = 3;
const todoList = []; // variable name, not a comment
    `;
    const results = findTodoFixme(source);
    expect(results.length).toBe(2);
    expect(results[0].lineNumber).toBe(3);
    expect(results[0].match).toBe("TODO");
    expect(results[1].lineNumber).toBe(5);
    expect(results[1].match).toBe("FIXME");
  });

  test("No TODO/FIXME comments in the codebase", () => {
    const violations = analyzeTodoFixme();
    assertNoViolations(violations, {
      message: "TODO/FIXME comment(s)",
      fixHint: "resolve the TODO/FIXME before committing",
    });
  });
});
