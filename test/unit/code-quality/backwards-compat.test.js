import { describe, expect, test } from "bun:test";
import { assertNoViolations, createCodeChecker } from "#test/code-scanner.js";
import { ALL_JS_FILES } from "#test/test-utils.js";

const EXCLUDE_FILES = ["test/unit/code-quality/backwards-compat.test.js"];

describe("backwards-compat", () => {
  const { find: findBackwardsCompat, analyze: analyzeBackwardsCompat } =
    createCodeChecker({
      patterns: /backwards?\s+compat/gi,
      skipPatterns: [],
      extractData: (_line, _lineNum, match) => ({ match: match[0] }),
      files: ALL_JS_FILES(),
      excludeFiles: EXCLUDE_FILES,
    });

  test("correctly identifies backwards compatibility references", () => {
    const source = `
const a = 1;
// Re-export for backwards compatibility
const b = 2;
// This is backward compatible with the old API
const c = 3;
    `;
    const results = findBackwardsCompat(source);
    expect(results.length).toBe(2);
    expect(results[0].lineNumber).toBe(3);
    expect(results[1].lineNumber).toBe(5);
  });

  test("does not flag unrelated uses of 'backward' or 'compatible'", () => {
    const source = `
const a = "moving backward";
const b = "compatible systems";
    `;
    const results = findBackwardsCompat(source);
    expect(results.length).toBe(0);
  });

  test("no backwards compatibility references in the codebase", () => {
    const { violations } = analyzeBackwardsCompat();
    assertNoViolations(violations, {
      singular: "backwards compatibility reference",
      fixHint:
        "we are the only consumers of this code - remove backwards compatibility shims and just change the code directly",
    });
  });
});
