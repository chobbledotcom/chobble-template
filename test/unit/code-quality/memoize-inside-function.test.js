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
  isCommentLine,
  readSource,
} from "#test/code-scanner.js";
import { SRC_JS_FILES } from "#test/test-utils.js";

// Pattern to match memoize() calls
const MEMOIZE_PATTERN = /\bmemoize\s*\(/;

/**
 * Remove string literals from a line to avoid false positives.
 * Handles double-quoted, single-quoted, and template strings.
 */
const removeStrings = (line) => {
  let result = "";
  let i = 0;
  while (i < line.length) {
    const char = line[i];
    // Check for string start
    if (char === '"' || char === "'" || char === "`") {
      const quote = char;
      i++; // Skip opening quote
      // Skip to closing quote, handling escapes
      while (i < line.length && line[i] !== quote) {
        if (line[i] === "\\" && i + 1 < line.length) i++; // Skip escape
        i++;
      }
      i++; // Skip closing quote
    } else {
      result += char;
      i++;
    }
  }
  return result;
};

/**
 * Track brace depth to detect if we're inside a function body.
 * Returns the brace depth change for a line (positive = more opens than closes).
 */
const getBraceDepthChange = (line) => {
  const withoutStrings = removeStrings(line);
  const opens = (withoutStrings.match(/\{/g) || []).length;
  const closes = (withoutStrings.match(/\}/g) || []).length;
  return opens - closes;
};

/**
 * Find memoize calls that are inside function bodies (brace depth > 0).
 */
const findMemoizeInsideFunction = (source) => {
  const lines = source.split("\n");
  const results = [];
  let braceDepth = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNum = i + 1;

    // Skip comments
    if (isCommentLine(line)) continue;

    // Check for memoize before updating brace depth
    // (so we catch the line at its current depth)
    // Use string-stripped line to avoid false positives in string literals
    const lineWithoutStrings = removeStrings(line);
    if (braceDepth > 0 && MEMOIZE_PATTERN.test(lineWithoutStrings)) {
      results.push({
        lineNumber: lineNum,
        line: line.trim(),
        braceDepth,
      });
    }

    // Update brace depth for next iteration
    braceDepth += getBraceDepthChange(line);

    // Clamp to 0 (handle edge cases)
    if (braceDepth < 0) braceDepth = 0;
  }

  return results;
};

/**
 * Analyze source files for memoize-inside-function violations.
 */
const analyzeMemoizeInsideFunction = () => {
  const violations = [];

  for (const file of SRC_JS_FILES()) {
    const source = readSource(file);
    const fileViolations = findMemoizeInsideFunction(source);

    for (const v of fileViolations) {
      violations.push({
        file,
        line: v.lineNumber,
        code: v.line,
        reason: `memoize() called at brace depth ${v.braceDepth} - cache won't persist between calls`,
      });
    }
  }

  return { violations };
};

describe("memoize-inside-function", () => {
  describe("findMemoizeInsideFunction", () => {
    test("detects memoize inside a function", () => {
      const source = `const outer = (x) => {
  const inner = memoize((y) => y * 2);
  return inner(x);
};`;
      const results = findMemoizeInsideFunction(source);
      expect(results.length).toBe(1);
      expect(results[0].lineNumber).toBe(2);
      expect(results[0].braceDepth).toBe(1);
    });

    test("allows memoize at module level", () => {
      const source = `const cached = memoize((x) => x * 2);

const useIt = (x) => cached(x);`;
      const results = findMemoizeInsideFunction(source);
      expect(results.length).toBe(0);
    });

    test("detects memoize in deeply nested function", () => {
      const source = `const a = () => {
  const b = () => {
    const c = memoize((x) => x);
  };
};`;
      const results = findMemoizeInsideFunction(source);
      expect(results.length).toBe(1);
      expect(results[0].braceDepth).toBe(2);
    });

    test("ignores memoize in comments", () => {
      const source = `const fn = () => {
  // Example: memoize((x) => x)
  return 42;
};`;
      const results = findMemoizeInsideFunction(source);
      expect(results.length).toBe(0);
    });

    test("handles braces in strings correctly", () => {
      const source = `const fn = () => {
  const str = "{ memoize( }";
  return str;
};
const good = memoize((x) => x);`;
      const results = findMemoizeInsideFunction(source);
      expect(results.length).toBe(0);
    });

    test("detects multiple violations", () => {
      const source = `const a = () => {
  const x = memoize((i) => i);
};
const b = () => {
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
