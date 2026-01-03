import { describe, expect, test } from "bun:test";
import {
  assertNoViolations,
  combineFileLists,
  createCodeChecker,
} from "#test/code-scanner.js";
import {
  ECOMMERCE_JS_FILES,
  SRC_JS_FILES,
  TEST_FILES,
} from "#test/test-utils.js";

const EXCLUDE_FILES = [
  "test/code-quality/todo-fixme-comments.test.js",
  "test/code-quality/commented-code.test.js",
];

describe("todo-fixme-comments", () => {
  // Create checker inside describe block to ensure imports are resolved
  const { find: findTodoFixme, analyze: analyzeTodoFixme } = createCodeChecker({
    patterns: /\b(TODO|FIXME)\b/gi,
    skipPatterns: [], // Check all lines including comments
    extractData: (_line, _lineNum, match) => ({ match: match[0] }),
    files: combineFileLists([SRC_JS_FILES, ECOMMERCE_JS_FILES, TEST_FILES]),
    excludeFiles: EXCLUDE_FILES,
  });

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
