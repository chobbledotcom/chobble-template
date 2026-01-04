import { describe, expect, test } from "bun:test";
import { ALLOWED_ARRAY_PUSH } from "#test/code-quality/code-quality-exceptions.js";
import {
  analyzeWithAllowlist,
  assertNoViolations,
  createCodeChecker,
  validateExceptions,
} from "#test/code-scanner.js";
import { SRC_JS_FILES } from "#test/test-utils.js";

// Pattern to detect .push() calls - array mutation
const ARRAY_PUSH_PATTERN = /\.push\s*\(/;

// Create checker for finding .push() usage
const { find: findArrayPush } = createCodeChecker({
  patterns: ARRAY_PUSH_PATTERN,
  extractData: () => ({ reason: "Array mutation via .push()" }),
  files: [],
});

/** Analyze all JS files for .push() usage. */
const analyzeArrayPushUsage = () =>
  analyzeWithAllowlist({
    findFn: findArrayPush,
    allowlist: ALLOWED_ARRAY_PUSH,
    files: SRC_JS_FILES,
  });

describe("array-push", () => {
  test("Detects .push() calls in source code", () => {
    const source = `
const arr = [];
arr.push(1);
items.push(newItem);
result.push(...more);
    `;
    const results = findArrayPush(source);
    expect(results.length).toBe(3);
  });

  test("Does not detect similar but non-push patterns", () => {
    const source = `
const pushButton = document.getElementById("push");
const unpushed = arr.filter(x => x.pushed);
// arr.push(1) - commented out
    `;
    const results = findArrayPush(source);
    expect(results.length).toBe(0);
  });

  test("Detects .push() with various spacing", () => {
    const source = `
arr.push(1);
arr.push (2);
arr. push(3);
    `;
    const results = findArrayPush(source);
    // .push( and .push ( match, but . push( doesn't match the pattern
    expect(results.length).toBe(2);
  });

  test("No .push() usage outside allowlist", () => {
    const { violations } = analyzeArrayPushUsage();
    assertNoViolations(violations, {
      message: ".push() usage(s)",
      fixHint:
        "use functional patterns (map, filter, reduce, spread, concat), or add to ALLOWED_ARRAY_PUSH in code-quality-exceptions.js",
    });
  });

  test("Reports allowlisted .push() usage for tracking", () => {
    const { allowed } = analyzeArrayPushUsage();
    console.log(`\n  Allowlisted .push() usages: ${allowed.length}`);
    if (allowed.length > 0) {
      console.log("  Locations:");
      for (const loc of allowed) {
        console.log(`    - ${loc.location}`);
      }
    }
    expect(true).toBe(true);
  });

  // Exception validation tests
  test("ALLOWED_ARRAY_PUSH entries still exist and match pattern", () => {
    const stale = validateExceptions(ALLOWED_ARRAY_PUSH, ARRAY_PUSH_PATTERN);
    if (stale.length > 0) {
      console.log("\n  Stale ALLOWED_ARRAY_PUSH entries:");
      for (const s of stale) {
        console.log(`    - ${s.entry}: ${s.reason}`);
      }
    }
    expect(stale.length).toBe(0);
  });
});
