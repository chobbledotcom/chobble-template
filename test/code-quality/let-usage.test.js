import { describe, expect, test } from "bun:test";
import {
  ALLOWED_MUTABLE_CONST,
  ALLOWED_LET,
} from "#test/code-quality/code-quality-exceptions.js";
import {
  assertNoViolations,
  createCodeChecker,
  matchesAny,
  validateExceptions,
} from "#test/code-scanner.js";
import { ALL_JS_FILES } from "#test/test-utils.js";

// Patterns that indicate allowed let usage (lazy loading, state management)
const ALLOWED_LET_PATTERNS = [
  // Lazy module loading / state: let moduleName = null; (with optional comment)
  /^let\s+\w+\s*=\s*null\s*;?\s*(\/\/.*)?$/,
];

// Patterns that detect mutable const declarations (empty array/object, Set, Map)
// These bypass const's protection by using mutable containers
const MUTABLE_CONST_PATTERNS = [
  /^\s*const\s+\w+\s*=\s*\[\s*\]/, // const x = []
  /^\s*const\s+\w+\s*=\s*\{\s*\}/, // const x = {}
  /^\s*const\s+\w+\s*=\s*new\s+Set\s*\(/, // const x = new Set()
  /^\s*const\s+\w+\s*=\s*new\s+Map\s*\(/, // const x = new Map()
];

// Complete checker for let declarations - find + analyze in one definition
const { find: findMutableVarDeclarations, analyze: mutableVarAnalysis } =
  createCodeChecker({
    patterns: /^\s*let\s+\w+/,
    extractData: (line) => {
      // Skip if matches allowed pattern (lazy loading)
      if (matchesAny(ALLOWED_LET_PATTERNS)(line.trim())) return null;
      return { reason: "Mutable variable declaration" };
    },
    files: ALL_JS_FILES,
    allowlist: ALLOWED_LET,
  });

// Complete checker for mutable const declarations
const { find: findMutableConstDeclarations, analyze: mutableConstAnalysis } =
  createCodeChecker({
    patterns: MUTABLE_CONST_PATTERNS,
    extractData: (line) => {
      if (/\[\s*\]/.test(line)) return { reason: "Empty array const" };
      if (/\{\s*\}/.test(line)) return { reason: "Empty object const" };
      if (/new\s+Set/.test(line)) return { reason: "Set const" };
      if (/new\s+Map/.test(line)) return { reason: "Map const" };
      return { reason: "Mutable const" };
    },
    files: ALL_JS_FILES,
    allowlist: ALLOWED_MUTABLE_CONST,
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
    const isAllowedLet = matchesAny(ALLOWED_LET_PATTERNS);
    expect(isAllowedLet("let sass = null;")).toBeTruthy();
    expect(isAllowedLet("let sharpModule = null")).toBeTruthy();
    expect(isAllowedLet("let state = null; // comment")).toBeTruthy();
  });

  test("Disallows other let patterns", () => {
    const isAllowedLet = matchesAny(ALLOWED_LET_PATTERNS);
    expect(isAllowedLet("let total = 0;")).toBeNull();
    expect(isAllowedLet('let separator = "";')).toBeNull();
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

  test("No mutable variables outside allowed patterns", () => {
    const { violations } = mutableVarAnalysis();
    assertNoViolations(violations, {
      message: "mutable variable declaration(s)",
      fixHint:
        "use const with immutable patterns (only let moduleName = null; is allowed for lazy loading)",
    });
  });

  // Mutable const detection tests
  test("Detects mutable const patterns", () => {
    const isMutableConst = matchesAny(MUTABLE_CONST_PATTERNS);
    expect(isMutableConst("const items = [];")).toBeTruthy();
    expect(isMutableConst("const data = {};")).toBeTruthy();
    expect(isMutableConst("const seen = new Set();")).toBeTruthy();
    expect(isMutableConst("const cache = new Map();")).toBeTruthy();
    expect(isMutableConst("  const items = [];")).toBeTruthy();
    expect(isMutableConst("  const obj = {};")).toBeTruthy();
    expect(isMutableConst("const set = new Set([1, 2]);")).toBeTruthy();
  });

  test("Does not detect immutable const patterns", () => {
    const isMutableConst = matchesAny(MUTABLE_CONST_PATTERNS);
    expect(isMutableConst("const x = 1;")).toBeNull();
    expect(isMutableConst("const items = [1, 2, 3];")).toBeNull();
    expect(isMutableConst('const name = "test";')).toBeNull();
    expect(isMutableConst("const fn = () => {};")).toBeNull();
    expect(isMutableConst("const obj = { key: 'value' };")).toBeNull();
    expect(isMutableConst("const config = { a: 1, b: 2 };")).toBeNull();
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
    const { violations } = mutableConstAnalysis();
    assertNoViolations(violations, {
      message: "mutable const declaration(s)",
      fixHint:
        "use functional patterns (map/filter/reduce/spread), or add to ALLOWED_MUTABLE_CONST in code-quality-exceptions.js",
    });
  });

  test("Reports allowlisted mutable const usage for tracking", () => {
    const { allowed } = mutableConstAnalysis();
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

  test("Reports allowlisted let usage for tracking", () => {
    const { allowed } = mutableVarAnalysis();
    console.log(`\n  Allowlisted let usages: ${allowed.length}`);
    if (allowed.length > 0) {
      console.log("  Files with let:");
      const byFile = {};
      for (const loc of allowed) {
        const file = loc.file || loc.location.split(":")[0];
        if (!byFile[file]) byFile[file] = 0;
        byFile[file]++;
      }
      for (const [file, count] of Object.entries(byFile)) {
        console.log(`    - ${file}: ${count} usage(s)`);
      }
    }
    expect(true).toBe(true);
  });

  test("ALLOWED_LET entries still exist and match pattern", () => {
    const stale = validateExceptions(ALLOWED_LET, /^\s*let\s+\w+/);
    if (stale.length > 0) {
      console.log("\n  Stale ALLOWED_LET entries:");
      for (const s of stale) {
        console.log(`    - ${s.entry}: ${s.reason}`);
      }
    }
    expect(stale.length).toBe(0);
  });
});
