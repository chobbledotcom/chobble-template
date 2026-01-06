import { describe, expect, test } from "bun:test";
import { ALLOWED_NULL_CHECKS } from "#test/code-quality/code-quality-exceptions.js";
import {
  analyzeWithAllowlist,
  assertNoViolations,
  combineFileLists,
  createCodeChecker,
  validateExceptions,
} from "#test/code-scanner.js";
import { ALL_JS_FILES } from "#test/test-utils.js";

// Detects if (!identifier) - simple null checks on variables
// Does NOT match: if (!obj.prop), if (!fn()), if (!arr.length)
const NULL_CHECK_PATTERN = /\bif\s*\(\s*!([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\)/;

const { find: findNullChecks } = createCodeChecker({
  patterns: NULL_CHECK_PATTERN,
  files: [],
});

const THIS_FILE = "test/code-quality/null-checks.test.js";

const analyzeNullChecks = () =>
  analyzeWithAllowlist({
    findFn: findNullChecks,
    allowlist: ALLOWED_NULL_CHECKS,
    files: () => combineFileLists([ALL_JS_FILES()], [THIS_FILE]),
  });

describe("null-checks", () => {
  test("Detects if (!identifier) pattern", () => {
    const source = `
if (!obj) return;
if (!items) return [];
    `;
    expect(findNullChecks(source).length).toBe(2);
  });

  test("Does NOT detect property/method checks", () => {
    const source = `
if (!obj.prop) return;
if (!arr.length) return;
if (!getValue()) return;
    `;
    expect(findNullChecks(source).length).toBe(0);
  });

  test("No new null checks outside the allowlist", () => {
    const { violations } = analyzeNullChecks();
    assertNoViolations(violations, {
      message: "non-allowlisted null check(s)",
      fixHint:
        "Consider if null check is truly necessary, or add to ALLOWED_NULL_CHECKS in code-quality-exceptions.js",
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

    const fileCount = new Set(allowed.map((a) => a.file)).size;
    console.log(`  Distributed across ${fileCount} files\n`);
    expect(true).toBe(true);
  });

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
