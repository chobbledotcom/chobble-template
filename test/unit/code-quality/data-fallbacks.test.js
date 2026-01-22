/**
 * Detects defensive fallback patterns on collection item data.
 *
 * Collection items have typed data - we shouldn't need defensive fallbacks
 * like `item.data.foo || default` or `item.data.bar ?? fallback`.
 *
 * BAD:
 *   const title = product.data.title ?? "";
 *   const name = item.data.name || "Unknown";
 *
 * GOOD:
 *   const { title } = product.data;
 *   const name = item.data.name;
 */
import { describe, expect, test } from "bun:test";
import { ALLOWED_DATA_FALLBACKS } from "#test/code-quality/code-quality-exceptions.js";
import {
  assertNoViolations,
  createCodeChecker,
  expectNoStaleExceptions,
} from "#test/code-scanner.js";
import { SRC_JS_FILES } from "#test/test-utils.js";

// Patterns matching defensive fallbacks on .data properties
const DATA_FALLBACK_PATTERNS = [
  /\.data\.\w+\s*\|\|/, // item.data.foo || fallback
  /\.data\.\w+\s*\?\?/, // item.data.foo ?? fallback
  /\.data\?\.\w+\s*\|\|/, // item.data?.foo || fallback
];

const DETAILS_EXTRACTOR = /\.data\??\.(\w+)\s*(?:\|\||\?\?)\s*(.+?)(?:;|,|$)/;

const { find, analyze } = createCodeChecker({
  patterns: DATA_FALLBACK_PATTERNS,
  files: SRC_JS_FILES,
  allowlist: ALLOWED_DATA_FALLBACKS,
  extractData: (line) => {
    const match = line.match(DETAILS_EXTRACTOR);
    return match
      ? { property: match[1], fallback: match[2].trim() }
      : { property: "unknown", fallback: "unknown" };
  },
});

describe("data-fallbacks", () => {
  describe("find", () => {
    test("detects || fallback on title", () => {
      const source = `const title = item.data.title || "Untitled";`;
      const results = find(source);
      expect(results.length).toBe(1);
      expect(results[0].property).toBe("title");
    });

    test("detects ?? fallback on any property", () => {
      const source = `const name = product.data.name ?? "";`;
      const results = find(source);
      expect(results.length).toBe(1);
      expect(results[0].property).toBe("name");
    });

    test("detects optional chaining with fallback", () => {
      const source = "const slug = item.data?.slug || defaultSlug;";
      const results = find(source);
      expect(results.length).toBe(1);
      expect(results[0].property).toBe("slug");
    });

    test("allows direct property access", () => {
      const source = "const { title, name } = product.data;";
      const results = find(source);
      expect(results.length).toBe(0);
    });

    test("allows property access without fallback", () => {
      const source = "return item.data.title;";
      const results = find(source);
      expect(results.length).toBe(0);
    });

    test("ignores comments", () => {
      const source = `// const title = item.data.title || "fallback";`;
      const results = find(source);
      expect(results.length).toBe(0);
    });
  });

  test("No unnecessary data fallbacks in source files", () => {
    const { violations } = analyze();

    assertNoViolations(violations, {
      singular: "data fallback pattern",
      fixHint: "Trust the types - access .data properties directly",
    });
  });

  test("ALLOWED_DATA_FALLBACKS entries still exist", () => {
    expectNoStaleExceptions(
      ALLOWED_DATA_FALLBACKS,
      DATA_FALLBACK_PATTERNS,
      "ALLOWED_DATA_FALLBACKS",
    );
  });
});
