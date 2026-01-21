/**
 * Detects memoize() calls inside function bodies.
 *
 * When memoize() is called inside a function, a new memoized function is
 * created on every invocation, defeating the purpose of memoization.
 * The cache won't persist between calls to the outer function.
 *
 * BAD:
 *   const getData = (items, key) => {
 *     const buildIndex = memoize((items) => ...);  // New cache every call!
 *     return buildIndex(items).get(key);
 *   };
 *
 * GOOD:
 *   const buildIndex = memoize((items) => ...);  // Cache persists
 *   const getData = (items, key) => buildIndex(items).get(key);
 */
import { describe, expect, test } from "bun:test";
import {
  assertNoViolations,
  createBraceDepthScanner,
  isCommentLine,
  readSource,
} from "#test/code-scanner.js";
import { SRC_JS_FILES } from "#test/test-utils.js";

// Pattern to match memoize() calls
const MEMOIZE_PATTERN = /\bmemoize\s*\(/;

/** Scanner configured to find memoize() calls inside function bodies */
const findMemoizeInsideFunction = createBraceDepthScanner({
  pattern: MEMOIZE_PATTERN,
  skipLine: isCommentLine,
});

/** Build violation entry from a match */
const toMemoizeViolation = (file) => (v) => ({
  file,
  line: v.lineNumber,
  code: v.line,
  reason: `memoize() called at brace depth ${v.braceDepth} - cache won't persist between calls`,
});

/** Analyze source files for memoize-inside-function violations. */
const analyzeMemoizeInsideFunction = () => ({
  violations: SRC_JS_FILES().flatMap((file) =>
    findMemoizeInsideFunction(readSource(file)).map(toMemoizeViolation(file)),
  ),
});

describe("memoize-inside-function", () => {
  describe("findMemoizeInsideFunction", () => {
    test("detects memoize inside a function", () => {
      const source = `const outer = (x) => {
  const inner = memoize((y) => y * 2);
  return inner(x);
};`;
      const [match] = findMemoizeInsideFunction(source);
      expect(match).toBeDefined();
      expect(match.lineNumber).toBe(2);
      expect(match.braceDepth).toBe(1);
    });

    test("allows memoize at module level", () => {
      const source = `const cached = memoize((x) => x * 2);

const useIt = (x) => cached(x);`;
      const results = findMemoizeInsideFunction(source);
      expect(results.length).toBe(0);
    });

    test("detects memoize in deeply nested function", () => {
      const source = `const outerNested = () => {
  const innerNested = () => {
    const deepMemo = memoize((x) => x);
  };
};`;
      const results = findMemoizeInsideFunction(source);
      expect(results.length).toBe(1);
      expect(results[0].braceDepth).toBe(2);
    });

    test("ignores memoize in comments", () => {
      const source = `const commentFn = () => {
  // Example: memoize((x) => x)
  return 42;
};`;
      const results = findMemoizeInsideFunction(source);
      expect(results.length).toBe(0);
    });

    test("handles braces in strings correctly", () => {
      const source = `const stringFn = () => {
  const str = "{ memoize( }";
  return str;
};
const good = memoize((x) => x);`;
      const results = findMemoizeInsideFunction(source);
      expect(results.length).toBe(0);
    });

    test("detects multiple violations", () => {
      const source = `const firstViolation = () => {
  const x = memoize((i) => i);
};
const secondViolation = () => {
  const y = memoize((j) => j);
};`;
      const results = findMemoizeInsideFunction(source);
      expect(results.length).toBe(2);
    });
  });

  test("No memoize() calls inside functions in source files", () => {
    const { violations } = analyzeMemoizeInsideFunction();

    assertNoViolations(violations, {
      singular: "memoize() call inside function",
      fixHint:
        "Move memoized functions to module level so the cache persists across calls",
    });
  });
});
