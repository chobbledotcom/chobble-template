import { describe, expect, test } from "vitest";
import {
  assertNoViolations,
  combineFileLists,
  createCodeChecker,
  matchesAny,
} from "#test/code-scanner.js";
import { SRC_JS_FILES, TEST_FILES } from "#test/test-utils.js";

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

// Organisation-style rule: kept to runtime src/ and test/ code — the
// generic fp utilities and the shared test infrastructure are exempt.
const EXEMPT_DIRS = ["src/_lib/utils/fp/", "test/test-utils/"];
const LET_GATE_FILES = () =>
  combineFileLists([SRC_JS_FILES(), TEST_FILES()]).filter(
    (file) => !EXEMPT_DIRS.some((dir) => file.startsWith(dir)),
  );

// Complete checker for let declarations - find + analyze in one definition
const { find: findMutableVarDeclarations, analyze: mutableVarAnalysis } =
  createCodeChecker({
    patterns: /^\s*let\s+\w+/,
    extractData: (line) => {
      // Skip if matches allowed pattern (lazy loading)
      if (matchesAny(ALLOWED_LET_PATTERNS)(line.trim())) return null;
      return { reason: "Mutable variable declaration" };
    },
    files: LET_GATE_FILES(),
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
    files: LET_GATE_FILES(),
  });

describe("let-usage", () => {
  test("Detects let declarations in source code", () => {
    const source = [
      "",
      "const immutable = 1;",
      "let mutable = 2;",
      "let counter = 0;",
      "for (let i = 0; i < 10; i++) {}",
      "    ",
    ].join("\n");
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
    const source = [
      "",
      "let lazyModule = null;",
      "let mutableVar = 0;",
      "    ",
    ].join("\n");
    const results = findMutableVarDeclarations(source);
    expect(results.length).toBe(1);
    expect(results[0].line).toBe("let mutableVar = 0;");
  });

  test("No mutable variables outside allowed patterns", () => {
    const { violations } = mutableVarAnalysis();
    assertNoViolations(violations, {
      singular: "mutable variable declaration",
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
    const source = [
      "const immutable = 1;",
      "const items = [];",
      "const data = {};",
      "const seen = new Set();",
      "const cache = new Map();",
      "const filled = [1, 2, 3];",
      "const config = { key: 'value' };",
    ].join("\n");
    const results = findMutableConstDeclarations(source);
    expect(results.length).toBe(4);
    expect(results[0].reason).toBe("Empty array const");
    expect(results[1].reason).toBe("Empty object const");
    expect(results[2].reason).toBe("Set const");
    expect(results[3].reason).toBe("Map const");
  });

  test("No mutable const declarations in source files", () => {
    const { violations } = mutableConstAnalysis();
    assertNoViolations(violations, {
      singular: "mutable const declaration",
      fixHint:
        "use functional patterns (map/filter/reduce/spread, frozenSet, Object.fromEntries)",
    });
  });
});
