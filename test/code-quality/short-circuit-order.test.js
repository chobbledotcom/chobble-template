import { describe, expect, test } from "bun:test";
import {
  analyzeFiles,
  assertNoViolations,
  isCommentLine,
  scanLines,
} from "#test/code-scanner.js";
import { SRC_JS_FILES } from "#test/test-utils.js";

/**
 * Detect suboptimal short-circuit ordering in && expressions.
 *
 * Pattern: complexExpr && simpleEquality
 *
 * When both sides of && must be evaluated, put the cheaper check first.
 * Simple equality checks (===, !==) are O(1) while method calls like
 * .includes(), .some(), .has() are O(n) or involve function calls.
 *
 * Bad:  arr.includes(x) && id === targetId
 * Good: id === targetId && arr.includes(x)
 *
 * The simple equality short-circuits before the expensive call.
 */

// Method calls that are more expensive than simple equality
const EXPENSIVE_METHODS = [
  "includes",
  "some",
  "every",
  "find",
  "findIndex",
  "filter",
  "indexOf",
  "has",
  "get",
  "match",
  "test",
  "startsWith",
  "endsWith",
];

// Pattern: expr.method(...) && identifier === something
// or: expr.method(...) && identifier !== something
const buildPattern = () => {
  const methods = EXPENSIVE_METHODS.join("|");
  // Left: something.method(...)
  // Right: identifier === or !== simple value
  return new RegExp(
    `\\.[\\w?]*(${methods})\\s*\\([^)]*\\)\\s*&&\\s*\\w+(\\.\\w+)*\\s*[!=]==\\s*\\w+`,
    "i",
  );
};

const EXPENSIVE_THEN_EQUALITY = buildPattern();

// Also catch the reverse in || expressions (cheap first still wins)
// Pattern: identifier === something || expensive
// This is actually correct, so we don't flag it

/**
 * Check if a line has suboptimal short-circuit ordering.
 */
const hasSuboptimalOrder = (line) => {
  if (isCommentLine(line)) return false;

  // Check for expensive method before simple equality in &&
  return EXPENSIVE_THEN_EQUALITY.test(line);
};

/**
 * Find all lines with suboptimal short-circuit ordering.
 */
const findSuboptimalOrder = (source) =>
  scanLines(source, (line, lineNum) => {
    if (!hasSuboptimalOrder(line)) return null;
    return {
      lineNumber: lineNum,
      line: line.trim(),
    };
  });

/**
 * Analyze all JS files for suboptimal short-circuit ordering.
 */
const analyzeShortCircuitOrder = () =>
  analyzeFiles(SRC_JS_FILES(), (source, relativePath) =>
    findSuboptimalOrder(source).map((hit) => ({
      file: relativePath,
      line: hit.lineNumber,
      code: hit.line,
      location: `${relativePath}:${hit.lineNumber}`,
    })),
  );

describe("short-circuit-order", () => {
  test("Detects expensive method before simple equality", () => {
    const source = "const x = arr.includes(val) && id === targetId;";
    const results = findSuboptimalOrder(source);
    expect(results.length).toBe(1);
  });

  test("Detects with optional chaining", () => {
    const source = "item.data?.tags?.includes(tag) && item.fileSlug === slug";
    const results = findSuboptimalOrder(source);
    expect(results.length).toBe(1);
  });

  test("Detects .some() pattern", () => {
    const source = "categories.some(c => c.id === x) && name === targetName";
    const results = findSuboptimalOrder(source);
    expect(results.length).toBe(1);
  });

  test("Detects .has() pattern (Set/Map)", () => {
    const source = "mySet.has(item) && count === 0";
    const results = findSuboptimalOrder(source);
    expect(results.length).toBe(1);
  });

  test("Does not flag optimal order (equality first)", () => {
    const source = "id === targetId && arr.includes(val)";
    const results = findSuboptimalOrder(source);
    expect(results.length).toBe(0);
  });

  test("Does not flag two simple checks", () => {
    const source = "a === b && c === d";
    const results = findSuboptimalOrder(source);
    expect(results.length).toBe(0);
  });

  test("Does not flag two expensive checks", () => {
    const source = "arr.includes(a) && arr.includes(b)";
    const results = findSuboptimalOrder(source);
    expect(results.length).toBe(0);
  });

  test("Does not flag comments", () => {
    const source = "// arr.includes(val) && id === targetId";
    const results = findSuboptimalOrder(source);
    expect(results.length).toBe(0);
  });

  test("No suboptimal short-circuit ordering in source files", () => {
    const violations = analyzeShortCircuitOrder();
    assertNoViolations(violations, {
      message: "suboptimal short-circuit ordering",
      fixHint:
        "put the simple equality check first: 'a === b && expensive()' instead of 'expensive() && a === b'",
    });
  });
});
