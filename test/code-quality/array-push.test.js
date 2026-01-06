import { describe, expect, test } from "bun:test";
import { ALLOWED_ARRAY_PUSH } from "#test/code-quality/code-quality-exceptions.js";
import {
  analyzeWithAllowlist,
  assertNoViolations,
  createCodeChecker,
} from "#test/code-scanner.js";
import { SRC_JS_FILES } from "#test/test-utils.js";

// Pattern to detect .push() calls - array mutation
const ARRAY_PUSH_PATTERN = /\.push\s*\(/;

// Create checker for finding .push() usage
const { find: findArrayPush } = createCodeChecker({
  patterns: ARRAY_PUSH_PATTERN,
  extractData: () => ({ reason: "Array mutation via .push()" }),
  files: [],
});

/** Analyze all JS files for .push() usage. */
const analyzeArrayPushUsage = () =>
  analyzeWithAllowlist({
    findFn: findArrayPush,
    allowlist: ALLOWED_ARRAY_PUSH,
    files: SRC_JS_FILES,
  });

describe("array-push", () => {
  test("Detects .push() calls in source code", () => {
    const source = `
const arr = [];
arr.push(1);
items.push(newItem);
result.push(...more);
    `;
    const results = findArrayPush(source);
    expect(results.length).toBe(3);
  });

  test("Does not detect similar but non-push patterns", () => {
    const source = `
const pushButton = document.getElementById("push");
const unpushed = arr.filter(x => x.pushed);
// arr.push(1) - commented out
    `;
    const results = findArrayPush(source);
    expect(results.length).toBe(0);
  });

  test("Detects .push() with various spacing", () => {
    const source = `
arr.push(1);
arr.push (2);
arr. push(3);
    `;
    const results = findArrayPush(source);
    // .push( and .push ( match, but . push( doesn't match the pattern
    expect(results.length).toBe(2);
  });

  test("No .push() usage in source code", () => {
    const { violations } = analyzeArrayPushUsage();
    assertNoViolations(violations, {
      message: ".push() usage(s)",
      fixHint: "use functional patterns (map, filter, reduce, spread, concat) unless using safe reduce accumulator pattern",
    });
  });
});
