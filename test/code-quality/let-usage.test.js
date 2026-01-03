import { describe, expect, test } from "bun:test";
import { ALLOWED_LET_USAGE } from "#test/code-quality/code-quality-exceptions.js";
import {
  analyzeFiles,
  assertNoViolations,
  createCodeChecker,
} from "#test/code-scanner.js";
import { SRC_JS_FILES } from "#test/test-utils.js";

// Patterns that indicate allowed let usage (lazy loading, state management)
const ALLOWED_LET_PATTERNS = [
  // Lazy module loading / state: let moduleName = null; (with optional comment)
  /^let\s+\w+\s*=\s*null\s*;?\s*(\/\/.*)?$/,
];

/**
 * Check if a let declaration matches an allowed pattern.
 */
const isAllowedLetPattern = (line) =>
  ALLOWED_LET_PATTERNS.some((pattern) => pattern.test(line.trim()));

// Create checker for finding let declarations
const { find: findMutableVarDeclarations } = createCodeChecker({
  patterns: /^\s*let\s+\w+/,
  extractData: (line) => {
    // Skip if matches allowed pattern (lazy loading)
    if (isAllowedLetPattern(line.trim())) return null;
    return { reason: "Mutable variable declaration" };
  },
  files: [],
});

/**
 * Analyze all JS files for mutable variable declarations.
 * Filters by allowed patterns and allowlist.
 */
const analyzeMutableVarUsage = () => {
  const results = analyzeFiles(SRC_JS_FILES(), (source, relativePath) =>
    findMutableVarDeclarations(source).map((hit) => ({
      file: relativePath,
      line: hit.lineNumber,
      code: hit.line,
      location: `${relativePath}:${hit.lineNumber}`,
    })),
  );

  const violations = [];
  const allowed = [];

  for (const decl of results) {
    const isAllowed =
      ALLOWED_LET_USAGE.has(decl.location) || ALLOWED_LET_USAGE.has(decl.file);

    if (isAllowed) {
      allowed.push(decl);
    } else {
      violations.push(decl);
    }
  }

  return { violations, allowed };
};

describe("let-usage", () => {
  test("Detects let declarations in source code", () => {
    const source = `
const immutable = 1;
let mutable = 2;
let counter = 0;
for (let i = 0; i < 10; i++) {}
    `;
    const results = findMutableVarDeclarations(source);
    // Only 2: for loop let is not at line start, so not detected
    expect(results.length).toBe(2);
  });

  test("Allows let = null pattern for lazy loading", () => {
    expect(isAllowedLetPattern("let sass = null;")).toBe(true);
    expect(isAllowedLetPattern("let sharpModule = null")).toBe(true);
    expect(isAllowedLetPattern("let state = null; // comment")).toBe(true);
  });

  test("Disallows other let patterns", () => {
    expect(isAllowedLetPattern("let total = 0;")).toBe(false);
    expect(isAllowedLetPattern('let separator = "";')).toBe(false);
  });

  test("Skips allowed patterns in source analysis", () => {
    const source = `
let lazyModule = null;
let mutableVar = 0;
    `;
    const results = findMutableVarDeclarations(source);
    expect(results.length).toBe(1);
    expect(results[0].line).toBe("let mutableVar = 0;");
  });

  test("No mutable variables outside allowed patterns and allowlist", () => {
    const { violations } = analyzeMutableVarUsage();
    assertNoViolations(violations, {
      message: "mutable variable declaration(s)",
      fixHint:
        "use const with immutable patterns, or add to ALLOWED_LET_USAGE in code-quality-exceptions.js",
    });
  });

  test("Reports allowlisted let usage for tracking", () => {
    const { allowed } = analyzeMutableVarUsage();
    console.log(`\n  Allowlisted let usages: ${allowed.length}`);
    if (allowed.length > 0) {
      console.log("  Locations:");
      for (const loc of allowed) {
        console.log(`    - ${loc.location}`);
      }
    }
    expect(true).toBe(true);
  });
});
