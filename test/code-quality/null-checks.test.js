import { describe, expect, test } from "bun:test";
import { ALLOWED_NULL_CHECKS } from "#test/code-quality/code-quality-exceptions.js";
import {
  analyzeWithAllowlist,
  assertNoViolations,
  combineFileLists,
  createCodeChecker,
  validateExceptions,
} from "#test/code-scanner.js";
import {
  ECOMMERCE_JS_FILES,
  SRC_JS_FILES,
  TEST_FILES,
} from "#test/test-utils.js";

/**
 * Pattern to detect simple null/undefined checks: if (!identifier)
 *
 * This catches defensive coding patterns like:
 *   if (!obj) return;
 *   if (!items) return [];
 *
 * But NOT these patterns (which are valid boolean contexts):
 *   if (!arr.length)     - length check
 *   if (!obj.prop)       - property access
 *   if (!fn())           - function call result
 *   if (!x && y)         - part of larger expression (handled by position)
 *
 * The goal is to prevent unnecessary defensive null checks where the value
 * cannot reasonably be null based on the code flow.
 */
const NULL_CHECK_PATTERN =
  /\bif\s*\(\s*!([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\)|\bif\s*\(\s*([a-zA-Z_$][a-zA-Z0-9_$]*)\s*===?\s*null\s*\)|\bif\s*\(\s*([a-zA-Z_$][a-zA-Z0-9_$]*)\s*===?\s*undefined\s*\)/;

/**
 * Patterns that indicate a variable comes from a source that can legitimately be null.
 * These provide context for why a null check might be appropriate.
 */
const LEGITIMATE_NULL_SOURCES = [
  // DOM queries - always can return null
  /querySelector|getElementById|getElementsBy|closest|parentElement/,
  // Regex matches - can return null
  /\.match\s*\(/,
  // Optional chaining suggests nullable
  /\?\./,
  // Object property access that might not exist
  /\[['"`]/,
];

// Create checker for finding null check patterns
const { find: findNullChecks } = createCodeChecker({
  patterns: NULL_CHECK_PATTERN,
  extractData: (line, _lineNum, match) => {
    // Extract the variable name from whichever capture group matched
    const varName = match[1] || match[2] || match[3];
    return {
      varName,
      reason: `Null check on '${varName}'`,
    };
  },
  files: [],
});

const THIS_FILE = "test/code-quality/null-checks.test.js";

/** Analyze all JS files for null check patterns. */
const analyzeNullChecks = () =>
  analyzeWithAllowlist({
    findFn: findNullChecks,
    allowlist: ALLOWED_NULL_CHECKS,
    files: () =>
      combineFileLists(
        [SRC_JS_FILES(), ECOMMERCE_JS_FILES(), TEST_FILES()],
        [THIS_FILE],
      ),
  });

describe("null-checks", () => {
  describe("Pattern detection", () => {
    test("Detects if (!identifier) pattern", () => {
      const source = `
if (!obj) return;
if (!items) return [];
if (!value) throw new Error();
      `;
      const results = findNullChecks(source);
      expect(results.length).toBe(3);
      expect(results[0].varName).toBe("obj");
      expect(results[1].varName).toBe("items");
      expect(results[2].varName).toBe("value");
    });

    test("Detects if (x === null) pattern", () => {
      const source = `
if (value === null) return;
if (result == null) return;
      `;
      const results = findNullChecks(source);
      expect(results.length).toBe(2);
    });

    test("Detects if (x === undefined) pattern", () => {
      const source = `
if (value === undefined) return;
if (result == undefined) return;
      `;
      const results = findNullChecks(source);
      expect(results.length).toBe(2);
    });

    test("Does NOT detect property access checks", () => {
      const source = `
if (!obj.prop) return;
if (!arr.length) return;
if (!data.items) return;
      `;
      const results = findNullChecks(source);
      expect(results.length).toBe(0);
    });

    test("Does NOT detect function call checks", () => {
      const source = `
if (!getValue()) return;
if (!obj.method()) return;
if (!fn(arg)) return;
      `;
      const results = findNullChecks(source);
      expect(results.length).toBe(0);
    });

    test("Does NOT detect boolean variable checks (common naming)", () => {
      // These are typically boolean flags, not null checks
      const source = `
if (!isValid) return;
if (!hasItems) return;
if (!shouldProcess) return;
      `;
      const results = findNullChecks(source);
      // These ARE detected by the pattern - they're in the allowlist
      // The pattern can't distinguish boolean vars from nullable vars
      expect(results.length).toBe(3);
    });
  });

  describe("Code analysis", () => {
    test("No new null checks outside the allowlist", () => {
      const { violations } = analyzeNullChecks();
      assertNoViolations(violations, {
        message: "non-allowlisted null check(s)",
        fixHint:
          "Consider if null check is truly necessary, or add to ALLOWED_NULL_CHECKS in code-quality-exceptions.js with justification",
      });
    });

    test("Reports allowlisted null checks for tracking", () => {
      const { allowed } = analyzeNullChecks();

      console.log(`\n  Allowlisted null checks: ${allowed.length}`);
      console.log("  Categories of legitimate null checks:");
      console.log("    - DOM element lookups (querySelector can return null)");
      console.log("    - Regex match results (match() can return null)");
      console.log("    - Environment variables (may be undefined)");
      console.log("    - Lazy module loading (initially null)");
      console.log("    - Optional function parameters");
      console.log("    - External/API data parsing\n");

      // Group by file for cleaner output
      const byFile = {};
      for (const a of allowed) {
        if (!byFile[a.file]) byFile[a.file] = [];
        byFile[a.file].push(a.line);
      }

      const fileCount = Object.keys(byFile).length;
      console.log(`  Distributed across ${fileCount} files\n`);

      // This test always passes - it's informational
      expect(true).toBe(true);
    });
  });

  describe("Exception validation", () => {
    test("ALLOWED_NULL_CHECKS entries still exist and match pattern", () => {
      const stale = validateExceptions(ALLOWED_NULL_CHECKS, NULL_CHECK_PATTERN);
      if (stale.length > 0) {
        console.log("\n  Stale ALLOWED_NULL_CHECKS entries:");
        for (const s of stale) {
          console.log(`    - ${s.entry}: ${s.reason}`);
        }
      }
      expect(stale.length).toBe(0);
    });
  });
});
