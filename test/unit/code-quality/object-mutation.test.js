import { describe, expect, test } from "bun:test";
import { ALLOWED_OBJECT_MUTATION } from "#test/code-quality/code-quality-exceptions.js";
import {
  analyzeWithAllowlist,
  assertNoViolations,
  COMMENT_LINE_PATTERNS,
  createCodeChecker,
  expectNoStaleExceptions,
} from "#test/code-scanner.js";
import { SRC_JS_FILES, logAllowedItems } from "#test/test-utils.js";

// Pattern to detect obj[key] = value - object mutation via bracket notation
// Matches: result[slug] = value, acc[key] = data, obj["prop"] = x
// The [^=] at end prevents matching == or === comparisons
const OBJECT_MUTATION_PATTERN = /\w\s*\[[^\]]+\]\s*=\s*[^=]/;

// Skip patterns for false positives (combined with default comment patterns)
const SKIP_PATTERNS = [
  ...COMMENT_LINE_PATTERNS,
  // Array destructuring: const [a, b] = arr, let [x] = y
  /^\s*(const|let|var)\s*\[/,
];

// Create checker for finding object mutation via bracket notation
const { find: findObjectMutation } = createCodeChecker({
  patterns: OBJECT_MUTATION_PATTERN,
  skipPatterns: SKIP_PATTERNS,
  extractData: () => ({ reason: "Object mutation via bracket assignment" }),
  files: [],
});

/** Analyze all JS files for object mutation. */
const analyzeObjectMutation = () =>
  analyzeWithAllowlist({
    findFn: findObjectMutation,
    allowlist: new Set([ALLOWED_OBJECT_MUTATION]),
    files: SRC_JS_FILES,
  });

describe("object-mutation", () => {
  test("Detects obj[key] = value patterns", () => {
    const source = `
result[slug] = value;
acc[key] = data;
obj["prop"] = x;
map[id] = item;
    `;
    const results = findObjectMutation(source);
    expect(results.length).toBe(4);
  });

  test("Does not detect comparisons, declarations, or destructuring", () => {
    const source = `
if (obj[key] === value) {}
if (obj[key] == value) {}
const { [key]: value } = obj;
const [a, b] = arr;
let [x] = y;
var [first] = items;
const [sku, data] = duplicate;
// result[key] = value - commented out
    `;
    const results = findObjectMutation(source);
    expect(results.length).toBe(0);
  });

  test("Detects mutation with various spacing", () => {
    const source = `
obj[key]=value;
obj[key] = value;
obj[ key ] = value;
    `;
    const results = findObjectMutation(source);
    expect(results.length).toBe(3);
  });

  test("No object mutation outside allowlist", () => {
    const { violations } = analyzeObjectMutation();
    assertNoViolations(violations, {
      singular: "object mutation via bracket assignment",
      plural: "object mutations via bracket assignment",
      fixHint:
        "use functional patterns (reduce with spread, Object.fromEntries, toObject), or add to ALLOWED_OBJECT_MUTATION in code-quality-exceptions.js",
    });
  });

  test("Reports allowlisted object mutation for tracking", () => {
    const { allowed } = analyzeObjectMutation();
    logAllowedItems(allowed, "Allowlisted object mutations", false);
    expect(true).toBe(true);
  });

  // Exception validation tests
  test("ALLOWED_OBJECT_MUTATION entries still exist and match pattern", () => {
    expectNoStaleExceptions(
      new Set([ALLOWED_OBJECT_MUTATION]),
      OBJECT_MUTATION_PATTERN,
      "ALLOWED_OBJECT_MUTATION",
    );
  });
});
