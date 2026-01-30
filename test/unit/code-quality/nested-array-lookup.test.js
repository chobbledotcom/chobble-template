/**
 * Detects nested array lookups that indicate O(n*m) performance patterns.
 *
 * When .find() or .filter() is called inside the callback of another array
 * iteration method (.map, .flatMap, .reduce, etc.), the inner traversal runs
 * for every iteration of the outer loop — O(n*m) total work. Use indexBy()
 * or groupByWithCache() to build an O(1) lookup map first, reducing total
 * work to O(n+m).
 *
 * BAD:
 *   products.map((p) => {
 *     const category = categories.find((c) => c.id === p.categoryId);
 *     return { ...p, category };
 *   });
 *
 * GOOD:
 *   const categoryById = indexBy((c) => c.id)(categories);
 *   products.map((p) => ({ ...p, category: categoryById[p.categoryId] }));
 */
import { describe, expect, test } from "bun:test";
import {
  assertNoViolations,
  isCommentLine,
  readSource,
  removeStrings,
} from "#test/code-scanner.js";
import { SRC_JS_FILES } from "#test/test-utils.js";

// Match .find( or .filter( — the array lookup methods that suggest linear scans
const LOOKUP_PATTERN = /\.(?:find|filter)\s*\(/;

// Patterns that establish an iteration context (the line that opens a brace).
// Only array iteration methods are tracked — not for/for...of loops, which
// commonly use .filter() on small objects/arrays without O(n*m) risk.
const ITERATION_CONTEXT_PATTERNS = [
  /\.map\s*\(/, // .map() callback
  /\.flatMap\s*\(/, // .flatMap() callback
  /\.some\s*\(/, // .some() callback
  /\.every\s*\(/, // .every() callback
  /\.reduce\s*\(/, // .reduce() callback
];

/**
 * Scan source code for .find()/.filter() calls nested inside iteration
 * method callbacks. Uses a brace-depth stack to track whether any ancestor
 * scope was opened by a line containing .map(), .flatMap(), etc.
 *
 * @param {string} source - Source code to scan
 * @returns {Array<{lineNumber: number, line: string, method: string}>}
 */
const findNestedLookups = (source) =>
  source.split("\n").reduce(
    (state, line, i) => {
      const trimmed = line.trim();
      if (isCommentLine(trimmed)) return state;

      const cleaned = removeStrings(line);
      const opens = cleaned.split("{").length - 1;
      const closes = cleaned.split("}").length - 1;
      const isIter = ITERATION_CONTEXT_PATTERNS.some((p) => p.test(cleaned));

      // Check BEFORE updating depth: is any ancestor brace an iteration context?
      if (state.iterStack.some((v) => v) && LOOKUP_PATTERN.test(cleaned)) {
        const methodMatch = cleaned.match(/\.(find|filter)\s*\(/);
        if (methodMatch) {
          state.results.push({
            lineNumber: i + 1,
            line: trimmed,
            method: methodMatch[1],
          });
        }
      }

      // Update brace depth: push for opens, pop for closes
      for (const _ of Array(opens)) state.iterStack.push(isIter);
      for (const _ of Array(closes)) state.iterStack.pop();

      return state;
    },
    { iterStack: [], results: [] },
  ).results;

/** Build violation entry from a match */
const toViolation = (file) => (v) => ({
  file,
  line: v.lineNumber,
  code: v.line,
  reason: `nested .${v.method}() inside iteration — likely O(n*m)`,
});

describe("nested-array-lookup", () => {
  describe("findNestedLookups", () => {
    test("detects .find() inside .map() callback", () => {
      const source = `items.map((item) => {
  const match = others.find((o) => o.id === item.id);
  return { item, match };
});`;
      const results = findNestedLookups(source);
      expect(results.length).toBe(1);
      expect(results[0].method).toBe("find");
    });

    test("detects .filter() inside flatMap() callback", () => {
      const source = `categories.flatMap((cat) => {
  return items.filter((item) => item.cat === cat.id);
});`;
      const results = findNestedLookups(source);
      expect(results.length).toBe(1);
      expect(results[0].method).toBe("filter");
    });

    test("allows .find() inside for...of loop (small iteration)", () => {
      const source = `for (const item of items) {
  const match = others.find((o) => o.id === item.id);
}`;
      const results = findNestedLookups(source);
      expect(results.length).toBe(0);
    });

    test("allows .find() inside non-iteration function body", () => {
      const source = `const getItem = (items, id) => {
  return items.find((i) => i.id === id);
};`;
      const results = findNestedLookups(source);
      expect(results.length).toBe(0);
    });

    test("allows .filter() inside non-iteration function body", () => {
      const source = `const getActive = (items) => {
  return items.filter((i) => i.active);
};`;
      const results = findNestedLookups(source);
      expect(results.length).toBe(0);
    });

    test("allows .find() at module level", () => {
      const source = "const item = items.find((i) => i.active);";
      const results = findNestedLookups(source);
      expect(results.length).toBe(0);
    });

    test("detects .find() in deeply nested iteration", () => {
      const source = `const outer = () => {
  return items.map((item) => {
    return others.find((o) => o.id === item.id);
  });
};`;
      const results = findNestedLookups(source);
      expect(results.length).toBe(1);
    });

    test("ignores .find() in comments", () => {
      const source = `items.map((item) => {
  // others.find((o) => o.id === item.id);
  return 42;
});`;
      const results = findNestedLookups(source);
      expect(results.length).toBe(0);
    });

    test("detects multiple violations", () => {
      const source = `items.map((x) => {
  const found = others.find((y) => y.id === x.id);
  const filtered = others.filter((y) => y.tag === x.tag);
  return { found, filtered };
});`;
      const results = findNestedLookups(source);
      expect(results.length).toBe(2);
    });

    test("handles braces in strings correctly", () => {
      const source = `items.map((item) => {
  const str = "others.find({})";
  return str;
});`;
      const results = findNestedLookups(source);
      expect(results.length).toBe(0);
    });

    test("allows .filter() not inside iteration context", () => {
      const source = `const fn = (data) => {
  const imageFiles = fs.readdirSync(dir)
    .filter((file) => IMAGE_PATTERN.test(file));
  return imageFiles;
};`;
      const results = findNestedLookups(source);
      expect(results.length).toBe(0);
    });

    test("detects .filter() inside .reduce() callback", () => {
      const source = `items.reduce((acc, item) => {
  const related = others.filter((o) => o.tag === item.tag);
  return [...acc, ...related];
}, []);`;
      const results = findNestedLookups(source);
      expect(results.length).toBe(1);
      expect(results[0].method).toBe("filter");
    });
  });

  test("No nested array lookups in source files", () => {
    const violations = SRC_JS_FILES().flatMap((file) =>
      findNestedLookups(readSource(file)).map(toViolation(file)),
    );

    assertNoViolations(violations, {
      singular: "nested array lookup",
      fixHint:
        "Use indexBy() or groupByWithCache() for O(1) lookups instead of nested .find()/.filter()",
    });
  });
});
