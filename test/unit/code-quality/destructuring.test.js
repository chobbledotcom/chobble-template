import { describe, expect, test } from "bun:test";
import {
  analyzeWithAllowlist,
  assertNoViolations,
  isCommentLine,
  scanLines,
} from "#test/code-scanner.js";
import { SRC_JS_FILES } from "#test/test-utils.js";

/**
 * Detect destructuring assignment patterns:
 *
 *   const { foo } = bar;
 *   const { foo, baz } = bar;
 *   const { foo: renamed } = bar;
 *   const { foo = "default" } = bar;
 *
 * Instead, prefer direct property access:
 *   bar.foo
 *   bar.baz
 *
 * This avoids creating unnecessary local variables and makes
 * the data source explicit at each usage site.
 */

// Pattern: const { ... } = identifier;
// Captures the destructured properties and the source object
const DESTRUCTURING_PATTERN =
  /^\s*const\s+\{([^}]+)\}\s*=\s*([a-zA-Z_$][a-zA-Z0-9_$]*)\s*;?\s*$/;

/**
 * Find all destructuring patterns in source.
 */
const findDestructuring = (source) =>
  scanLines(source, (line, lineNum) => {
    if (isCommentLine(line)) return null;

    const match = line.match(DESTRUCTURING_PATTERN);
    if (!match) return null;

    const [, properties, sourceObj] = match;

    // Parse the destructured properties
    const propList = properties
      .split(",")
      .map((p) => p.trim())
      .filter(Boolean)
      .map((p) => {
        // Handle renaming: { foo: renamed } -> foo
        const parts = p.split(":").map((s) => s.trim());
        return parts[0];
      });

    return {
      lineNumber: lineNum,
      line: line.trim(),
      properties: propList,
      sourceObject: sourceObj,
    };
  });

const expectSingleDestructuring = (source) => {
  const results = findDestructuring(source);
  expect(results.length).toBe(1);
  return results[0];
};

describe("destructuring", () => {
  describe("detection", () => {
    test("detects simple destructuring", () => {
      const result = expectSingleDestructuring("const { foo } = bar;");
      expect(result.properties).toEqual(["foo"]);
      expect(result.sourceObject).toBe("bar");
    });

    test("detects multiple property destructuring", () => {
      const result = expectSingleDestructuring("const { foo, baz, qux } = obj;");
      expect(result.properties).toEqual(["foo", "baz", "qux"]);
      expect(result.sourceObject).toBe("obj");
    });

    test("detects renamed destructuring", () => {
      expect(expectSingleDestructuring("const { foo: renamed } = bar;").properties).toEqual(["foo"]);
    });

    test("detects mixed renamed and regular", () => {
      expect(
        expectSingleDestructuring("const { foo, bar: aliased, baz } = obj;").properties,
      ).toEqual(["foo", "bar", "baz"]);
    });
  });

  describe("allowed patterns", () => {
    test("ignores import destructuring", () => {
      const source = 'import { foo, bar } from "module";';
      expect(findDestructuring(source).length).toBe(0);
    });

    test("ignores function parameter destructuring", () => {
      const source = "const fn = ({ foo, bar }) => foo + bar;";
      expect(findDestructuring(source).length).toBe(0);
    });

    test("ignores array destructuring", () => {
      const source = "const [first, second] = arr;";
      expect(findDestructuring(source).length).toBe(0);
    });

    test("ignores destructuring from function calls", () => {
      const source = "const { data } = await fetch(url);";
      expect(findDestructuring(source).length).toBe(0);
    });

    test("ignores destructuring from method calls", () => {
      const source = "const { result } = obj.getData();";
      expect(findDestructuring(source).length).toBe(0);
    });

    test("ignores destructuring from property access", () => {
      const source = "const { value } = obj.nested.prop;";
      expect(findDestructuring(source).length).toBe(0);
    });

    test("ignores comments", () => {
      const source = "// const { foo } = bar;";
      expect(findDestructuring(source).length).toBe(0);
    });

    test("ignores let destructuring", () => {
      // Only checking const since that's the common pattern
      const source = "let { foo } = bar;";
      expect(findDestructuring(source).length).toBe(0);
    });
  });

  describe("detected patterns", () => {
    test("detects destructuring with default values", () => {
      const source = 'const { foo = "default" } = options;';
      const results = findDestructuring(source);
      expect(results.length).toBe(1);
      expect(results[0].sourceObject).toBe("options");
    });

    test("detects destructuring with multiple defaults", () => {
      const source = 'const { foo = 1, bar = "test" } = options;';
      expect(findDestructuring(source).length).toBe(1);
    });
  });

  test("no destructuring in source files", () => {
    const { violations } = analyzeWithAllowlist({
      findFn: findDestructuring,
      files: SRC_JS_FILES,
    });
    assertNoViolations(violations, {
      singular: "destructuring assignment",
      plural: "destructuring assignments",
      fixHint: "use direct property access instead: obj.prop",
      limit: 50,
    });
  });
});
