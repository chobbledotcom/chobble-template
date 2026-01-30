/**
 * Detects || fallback patterns with common default values.
 *
 * The philosophy: throw errors instead of masking problems with fallbacks.
 * Defaults should be set early in the data chain (collections, computed data),
 * not scattered throughout filters and utilities.
 *
 * BAD:
 *   const items = getItems() || [];
 *   const title = data.title || "Untitled";
 *   const config = loadConfig() || {};
 *
 * GOOD:
 *   const items = getItems();  // Throw if undefined
 *   const { title } = data;    // Trust the type system
 *   const config = loadConfig();  // Fail fast if missing
 */
import { describe, expect, test } from "bun:test";
import { assertNoViolations, createCodeChecker } from "#test/code-scanner.js";
import { SRC_JS_FILES } from "#test/test-utils.js";

const THIS_FILE = "test/unit/code-quality/or-fallbacks.test.js";

// Directories where defaults are appropriate (early in data chain)
const ALLOWED_DIRS = [
  "src/_lib/collections/", // Collection definitions - where defaults belong
  "src/_lib/public/", // Browser code - can't validate server data
  "src/_lib/build/", // Build utilities
  "src/_data/", // Computed data layer
  "packages/", // Shared utilities
];

// File patterns where defaults are appropriate
const ALLOWED_FILE_PATTERNS = [
  /\.11tydata\.js$/, // Eleventy computed data files
];

// Patterns matching fallback defaults
// Matches: || [], || {}, || "", || null, || 0
const OR_FALLBACK_PATTERNS = [
  /\|\|\s*\[\]/, // || []
  /\|\|\s*\{\}/, // || {}
  /\|\|\s*""/, // || ""
  /\|\|\s*null\b/, // || null (word boundary to avoid || nullable)
  /\|\|\s*0\b/, // || 0 (word boundary to avoid || 0.5)
];

const DETAILS_EXTRACTOR = /\|\|\s*(\[\]|\{\}|""|null\b|0\b)/;

const { find, analyze } = createCodeChecker({
  patterns: OR_FALLBACK_PATTERNS,
  files: () =>
    SRC_JS_FILES().filter((file) => {
      // Skip allowed directories
      if (ALLOWED_DIRS.some((dir) => file.startsWith(dir))) return false;
      // Skip allowed file patterns
      if (ALLOWED_FILE_PATTERNS.some((pattern) => pattern.test(file)))
        return false;
      return true;
    }),
  excludeFiles: [THIS_FILE],
  extractData: (line) => {
    const match = line.match(DETAILS_EXTRACTOR);
    return match ? { fallback: match[1] } : { fallback: "unknown" };
  },
});

describe("or-fallbacks", () => {
  describe("find", () => {
    test("detects || [] fallback", () => {
      const source = "const items = getItems() || [];";
      const results = find(source);
      expect(results.length).toBe(1);
      expect(results[0].fallback).toBe("[]");
    });

    test("detects || {} fallback", () => {
      const source = "const config = options || {};";
      const results = find(source);
      expect(results.length).toBe(1);
      expect(results[0].fallback).toBe("{}");
    });

    test('detects || "" fallback', () => {
      const source = `const name = data.name || "";`;
      const results = find(source);
      expect(results.length).toBe(1);
      expect(results[0].fallback).toBe('""');
    });

    test("detects || null fallback", () => {
      const source = "const value = getValue() || null;";
      const results = find(source);
      expect(results.length).toBe(1);
      expect(results[0].fallback).toBe("null");
    });

    test("detects || 0 fallback", () => {
      const source = "const count = getCount() || 0;";
      const results = find(source);
      expect(results.length).toBe(1);
      expect(results[0].fallback).toBe("0");
    });

    test("ignores comments", () => {
      const source = "// const items = getItems() || [];";
      const results = find(source);
      expect(results.length).toBe(0);
    });

    test("ignores || with other values (legitimate boolean coercion)", () => {
      const source = "const enabled = config.enabled || false;";
      const results = find(source);
      expect(results.length).toBe(0);
    });

    test("ignores || with variable fallbacks", () => {
      const source = "const value = primary || fallbackValue;";
      const results = find(source);
      expect(results.length).toBe(0);
    });
  });

  test("No || fallbacks in filters/utils/config - set defaults early in data chain", () => {
    const { violations } = analyze();
    assertNoViolations(violations, {
      singular: "OR fallback pattern",
      fixHint:
        "set defaults in collections/computed data, or throw an error instead of masking the problem",
    });
  });
});
