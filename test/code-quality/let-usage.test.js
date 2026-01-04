import { describe, expect, test } from "bun:test";
import { ALLOWED_MUTABLE_CONST } from "#test/code-quality/code-quality-exceptions.js";
import {
  analyzeWithAllowlist,
  assertNoViolations,
  createCodeChecker,
  validateExceptions,
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

// Patterns that detect mutable const declarations (empty array/object, Set, Map)
// These bypass const's protection by using mutable containers
const MUTABLE_CONST_PATTERNS = [
  /^\s*const\s+\w+\s*=\s*\[\s*\]/, // const x = []
  /^\s*const\s+\w+\s*=\s*\{\s*\}/, // const x = {}
  /^\s*const\s+\w+\s*=\s*new\s+Set\s*\(/, // const x = new Set()
  /^\s*const\s+\w+\s*=\s*new\s+Map\s*\(/, // const x = new Map()
];

/**
 * Check if a line contains a mutable const pattern.
 */
const isMutableConstPattern = (line) =>
  MUTABLE_CONST_PATTERNS.some((pattern) => pattern.test(line));

// Create checker for finding mutable const declarations
const { find: findMutableConstDeclarations } = createCodeChecker({
  patterns: MUTABLE_CONST_PATTERNS,
  extractData: (line) => {
    if (/\[\s*\]/.test(line)) return { reason: "Empty array const" };
    if (/\{\s*\}/.test(line)) return { reason: "Empty object const" };
    if (/new\s+Set/.test(line)) return { reason: "Set const" };
    if (/new\s+Map/.test(line)) return { reason: "Map const" };
    return { reason: "Mutable const" };
  },
  files: [],
});

/** Analyze all JS files for mutable variable declarations. */
const analyzeMutableVarUsage = () =>
  analyzeWithAllowlist({
    findFn: findMutableVarDeclarations,
    allowlist: new Set(),
    files: SRC_JS_FILES,
  });

/** Analyze all JS files for mutable const declarations. */
const analyzeMutableConstUsage = () =>
  analyzeWithAllowlist({
    findFn: findMutableConstDeclarations,
    allowlist: ALLOWED_MUTABLE_CONST,
    files: SRC_JS_FILES,
  });

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


  // Mutable const detection tests
  test("Detects mutable const patterns", () => {
    expect(isMutableConstPattern("const items = [];")).toBe(true);
    expect(isMutableConstPattern("const data = {};")).toBe(true);
    expect(isMutableConstPattern("const seen = new Set();")).toBe(true);
    expect(isMutableConstPattern("const cache = new Map();")).toBe(true);
    expect(isMutableConstPattern("  const items = [];")).toBe(true);
    expect(isMutableConstPattern("  const obj = {};")).toBe(true);
    expect(isMutableConstPattern("const set = new Set([1, 2]);")).toBe(true);
  });

  test("Does not detect immutable const patterns", () => {
    expect(isMutableConstPattern("const x = 1;")).toBe(false);
    expect(isMutableConstPattern("const items = [1, 2, 3];")).toBe(false);
    expect(isMutableConstPattern('const name = "test";')).toBe(false);
    expect(isMutableConstPattern("const fn = () => {};")).toBe(false);
    expect(isMutableConstPattern("const obj = { key: 'value' };")).toBe(false);
    expect(isMutableConstPattern("const config = { a: 1, b: 2 };")).toBe(false);
  });

  test("Detects mutable const declarations in source code", () => {
    const source = `
const immutable = 1;
const items = [];
const data = {};
const seen = new Set();
const cache = new Map();
const filled = [1, 2, 3];
const config = { key: 'value' };
    `;
    const results = findMutableConstDeclarations(source);
    expect(results.length).toBe(4);
    expect(results[0].reason).toBe("Empty array const");
    expect(results[1].reason).toBe("Empty object const");
    expect(results[2].reason).toBe("Set const");
    expect(results[3].reason).toBe("Map const");
  });

  test("No mutable const declarations outside allowlist", () => {
    const { violations } = analyzeMutableConstUsage();
    assertNoViolations(violations, {
      message: "mutable const declaration(s)",
      fixHint:
        "use functional patterns (map/filter/reduce/spread), or add to ALLOWED_MUTABLE_CONST in code-quality-exceptions.js",
    });
  });

  test("Reports allowlisted mutable const usage for tracking", () => {
    const { allowed } = analyzeMutableConstUsage();
    console.log(`\n  Allowlisted mutable const usages: ${allowed.length}`);
    if (allowed.length > 0) {
      console.log("  Locations:");
      for (const loc of allowed) {
        console.log(`    - ${loc.location} (${loc.reason})`);
      }
    }
    expect(true).toBe(true);
  });

  // Exception validation tests
  test("ALLOWED_MUTABLE_CONST entries still exist and match pattern", () => {
    const stale = validateExceptions(
      ALLOWED_MUTABLE_CONST,
      MUTABLE_CONST_PATTERNS,
    );
    if (stale.length > 0) {
      console.log("\n  Stale ALLOWED_MUTABLE_CONST entries:");
      for (const s of stale) {
        console.log(`    - ${s.entry}: ${s.reason}`);
      }
    }
    expect(stale.length).toBe(0);
  });
});
