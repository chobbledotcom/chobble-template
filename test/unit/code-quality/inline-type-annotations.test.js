/**
 * Detects inline JSDoc type annotations inside function bodies.
 *
 * Type annotations like `/** @type {SomeType} *​/` inside function bodies
 * are messy and hard to read. Instead, define types in a centralized types
 * file and reference them at module level, or use proper function signatures.
 *
 * BAD (inside function):
 *   const getData = (collectionApi) => {
 *     /** @type {ProductItem[]} *​/
 *     const items = collectionApi.getFilteredByTag("products");
 *     return items;
 *   };
 *
 * GOOD (module level type definition):
 *   /** @type {(api: CollectionApi) => ProductItem[]} *​/
 *   const getData = (collectionApi) => {
 *     const items = collectionApi.getFilteredByTag("products");
 *     return items;
 *   };
 *
 * BETTER (typed function signature):
 *   /**
 *    * @param {CollectionApi} collectionApi
 *    * @returns {ProductItem[]}
 *    *​/
 *   const getData = (collectionApi) => {
 *     const items = collectionApi.getFilteredByTag("products");
 *     return items;
 *   };
 */
import { describe, expect, test } from "bun:test";
import {
  assertNoViolations,
  createBraceDepthScanner,
  expectScanResult,
  isCommentLine,
  readSource,
} from "#test/code-scanner.js";
import { SRC_JS_FILES } from "#test/test-utils.js";

// Pattern to match /** @type {something} */ annotations
const INLINE_TYPE_PATTERN = /\/\*\*\s*@type\s*\{[^}]+\}\s*\*\//;

/** Check if a line is a single-line comment (// ...). */
const isSingleLineComment = (line) => line.trim().startsWith("//");

/** Skip single-line comments and JSDoc blocks that aren't @type annotations */
const shouldSkipLine = (line) =>
  isSingleLineComment(line) ||
  (isCommentLine(line) && !INLINE_TYPE_PATTERN.test(line));

/** Extract type name from the annotation for better error messages */
const extractTypeName = (line) => {
  const match = line.match(/@type\s*\{([^}]+)\}/);
  return match ? match[1] : "unknown";
};

/** Scanner configured to find inline @type annotations */
const findInlineTypeAnnotations = createBraceDepthScanner({
  pattern: INLINE_TYPE_PATTERN,
  skipLine: shouldSkipLine,
  extractData: (line) => ({ typeName: extractTypeName(line) }),
});

/** Build violation entry from a match */
const toTypeAnnotationViolation = (file) => (v) => ({
  file,
  line: v.lineNumber,
  code: v.line,
  reason: `Inline @type {${v.typeName}} at depth ${v.braceDepth} - move to types file or use function signature`,
});

/** Analyze source files for inline type annotation violations. */
const analyzeInlineTypeAnnotations = () =>
  SRC_JS_FILES().flatMap((file) =>
    findInlineTypeAnnotations(readSource(file)).map(
      toTypeAnnotationViolation(file),
    ),
  );

describe("inline-type-annotations", () => {
  describe("findInlineTypeAnnotations", () => {
    test("detects @type inside a function", () => {
      const source = `const outer = (x) => {
  /** @type {string[]} */
  const items = getItems();
  return items;
};`;
      const results = findInlineTypeAnnotations(source);
      expect(results.length).toBe(1);
      expectScanResult(results[0], {
        lineNumber: 2,
        braceDepth: 1,
        typeName: "string[]",
      });
    });

    test("allows @type at module level", () => {
      const source = `/** @type {string[]} */
const items = ["a", "b"];

const useIt = (x) => items.includes(x);`;
      const results = findInlineTypeAnnotations(source);
      expect(results.length).toBe(0);
    });

    test("allows @typedef at any level", () => {
      const source = `/** @typedef {import("types").Item} Item */

const outer = () => {
  // This is fine - just a reference, not inline annotation
  return null;
};`;
      const results = findInlineTypeAnnotations(source);
      expect(results.length).toBe(0);
    });

    test("detects @type in deeply nested function", () => {
      const source = `const outerNested = () => {
  const innerNested = () => {
    /** @type {number} */
    const deep = 42;
  };
};`;
      const results = findInlineTypeAnnotations(source);
      expect(results.length).toBe(1);
      expect(results[0].braceDepth).toBe(2);
    });

    test("detects inline cast syntax", () => {
      const source = `const fn = () => {
  const items = /** @type {Item[]} */ (api.getItems());
};`;
      const results = findInlineTypeAnnotations(source);
      expect(results.length).toBe(1);
    });

    test("detects @type in reduce accumulator", () => {
      const source = `const fn = () => {
  return items.reduce((acc, item) => ({
    parts: /** @type {Part[]} */ ([]),
  }), {});
};`;
      const results = findInlineTypeAnnotations(source);
      expect(results.length).toBe(1);
    });

    test("detects @type in callback parameters", () => {
      const source = `const fn = () => {
  items.map((/** @type {Item} */ item) => item.name);
};`;
      const results = findInlineTypeAnnotations(source);
      expect(results.length).toBe(1);
    });

    test("handles braces in strings correctly", () => {
      const source = `const fn = () => {
  const str = "/** @type {Fake} */";
  return str;
};`;
      const results = findInlineTypeAnnotations(source);
      expect(results.length).toBe(0);
    });

    test("detects multiple violations in one file", () => {
      const source = `const first = () => {
  /** @type {A} */
  const a = getA();
};
const second = () => {
  /** @type {B} */
  const b = getB();
};`;
      const results = findInlineTypeAnnotations(source);
      expect(results.length).toBe(2);
    });

    test("ignores @type in regular comment blocks", () => {
      const source = `const fn = () => {
  // Example: /** @type {Item} */
  return 42;
};`;
      const results = findInlineTypeAnnotations(source);
      expect(results.length).toBe(0);
    });
  });

  test("No inline @type annotations inside functions in source files", () => {
    const violations = analyzeInlineTypeAnnotations();

    assertNoViolations(violations, {
      singular: "inline type annotation",
      fixHint:
        "Move type to a .d.ts file, use @param/@returns in function JSDoc, or annotate at module level",
    });
  });
});
