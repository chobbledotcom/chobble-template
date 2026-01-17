/**
 * Detects unexported functions that are only called once.
 *
 * Single-use unexported functions are candidates for inlining into their caller,
 * as they add indirection without reuse benefit. This is a warning, not an error,
 * since some single-use functions are intentionally named for clarity.
 *
 * Exclusions:
 * - Exported functions (public API)
 * - Nested functions (intentionally scoped)
 * - Callback/handler functions passed as arguments
 * - Test files are included (no exclusion)
 */
import { describe, expect, test } from "bun:test";
import { ALLOWED_SINGLE_USE_FUNCTIONS } from "#test/code-quality/code-quality-exceptions.js";
import {
  assertNoViolations,
  combineFileLists,
  extractExports,
  readSource,
} from "#test/code-scanner.js";
import { ALL_JS_FILES } from "#test/test-utils.js";
import { filterMap, pipe } from "#utils/array-utils.js";

const THIS_FILE = "test/unit/code-quality/single-use-functions.test.js";

// ============================================
// Function Definition Patterns
// ============================================

// Matches: function name(...) or async function name(...)
const FUNCTION_DECL_PATTERN =
  /^\s*(?:async\s+)?function\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\(/;

// Matches: const/let/var name = (...) => or const/let/var name = async (...) =>
// Also matches: const/let/var name = function(...)
const ARROW_OR_EXPR_PATTERN =
  /^\s*(?:const|let|var)\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*=\s*(?:async\s+)?(?:\(|function\s*\(|[a-zA-Z_$][a-zA-Z0-9_$]*\s*=>)/;

// ============================================
// Analysis Functions
// ============================================

/**
 * Process a single character for function definition tracking.
 * Pure function: returns new state without mutation.
 */
const processCharForFuncDef = (state, char, index, line) => {
  if (state.skipNext) {
    return { ...state, skipNext: false };
  }

  const prevChar = index > 0 ? line[index - 1] : "";
  const nextChar = index < line.length - 1 ? line[index + 1] : "";

  // Handle comments
  if (!state.inString) {
    if (char === "/" && nextChar === "/" && !state.inMultilineComment) {
      return { ...state, stopProcessing: true };
    }
    if (char === "/" && nextChar === "*" && !state.inMultilineComment) {
      return { ...state, inMultilineComment: true, skipNext: true };
    }
    if (char === "*" && nextChar === "/" && state.inMultilineComment) {
      return { ...state, inMultilineComment: false, skipNext: true };
    }
  }

  if (state.inMultilineComment) return state;

  // Handle strings
  if ((char === '"' || char === "'" || char === "`") && prevChar !== "\\") {
    if (!state.inString) {
      return { ...state, inString: true, stringChar: char };
    } else if (char === state.stringChar) {
      return { ...state, inString: false, stringChar: null };
    }
  }

  if (state.inString) return state;

  // Count braces
  if (char === "{") {
    return { ...state, braceDepth: state.braceDepth + 1 };
  }
  if (char === "}") {
    return { ...state, braceDepth: state.braceDepth - 1 };
  }

  return state;
};

/**
 * Process a single line for function definition tracking.
 * Pure function: returns new state without mutation.
 */
const processLineForFuncDef = (state, line, index) => {
  const lineNum = index + 1;

  // Check for function definition
  const funcMatch =
    line.match(FUNCTION_DECL_PATTERN) || line.match(ARROW_OR_EXPR_PATTERN);

  // Process characters to update brace depth and string/comment state
  const chars = [...line];
  const charState = { ...state, stopProcessing: false };
  const processedState = chars.reduce(
    (s, char, i) =>
      s.stopProcessing ? s : processCharForFuncDef(s, char, i, line),
    charState,
  );

  // Add function if found
  if (funcMatch) {
    const newFunction = {
      name: funcMatch[1],
      line: lineNum,
      isNested: state.braceDepth > 0,
    };
    return {
      ...processedState,
      functions: [...processedState.functions, newFunction],
    };
  }

  return processedState;
};

/**
 * Extract function definitions from source code.
 * Returns array of { name, line, isNested }
 */
const extractFunctionDefinitions = (source) => {
  const initialState = {
    braceDepth: 0,
    inString: false,
    stringChar: null,
    inMultilineComment: false,
    skipNext: false,
    functions: [],
  };

  const lines = source.split("\n");
  const finalState = lines.reduce(processLineForFuncDef, initialState);
  return finalState.functions;
};

/**
 * Count occurrences of a function name in source code.
 * Looks for the name as a word boundary (not part of larger identifier).
 */
const countReferences = (source, functionName) => {
  // Match function name as standalone identifier (word boundaries)
  const pattern = new RegExp(`\\b${functionName}\\b`, "g");
  const matches = source.match(pattern);
  return matches ? matches.length : 0;
};

/**
 * Build a global reference count map for all function names across all files.
 * This replaces O(n³) nested loops with a single O(n*m) pass.
 */
const buildReferenceCountMap = (fileData) => {
  const refCounts = new Map();

  // Collect all unique function names first
  for (const [, data] of fileData) {
    for (const func of data.functions) {
      if (!refCounts.has(func.name)) {
        refCounts.set(func.name, 0);
      }
    }
  }

  // Count references to each function name across all files in one pass
  for (const [, data] of fileData) {
    for (const funcName of refCounts.keys()) {
      refCounts.set(
        funcName,
        refCounts.get(funcName) + countReferences(data.source, funcName),
      );
    }
  }

  return refCounts;
};

/**
 * Analyze all files for single-use unexported functions.
 * Optimized using pipe() and reference count map to avoid O(n³) complexity.
 */
const analyzeSingleUseFunctions = () => {
  const allFiles = combineFileLists([ALL_JS_FILES()], [THIS_FILE]);

  // First pass: collect all function definitions and exports per file
  const fileData = new Map();
  for (const file of allFiles) {
    const source = readSource(file);
    fileData.set(file, {
      source,
      functions: extractFunctionDefinitions(source),
      exports: extractExports(source),
    });
  }

  // Second pass: build reference count map (O(n*m) instead of O(n³))
  const refCounts = buildReferenceCountMap(fileData);

  // Third pass: identify violations using functional composition
  const allViolations = [];
  for (const [file, data] of fileData) {
    const fileViolations = pipe(
      filterMap(
        (func) => {
          // Skip exported functions
          if (data.exports.has(func.name)) return false;

          // Skip nested functions (intentionally scoped)
          if (func.isNested) return false;

          // 2 references = 1 definition + 1 call = single use
          return refCounts.get(func.name) === 2;
        },
        (func) => ({
          file,
          line: func.line,
          code: func.name,
          reason: `Function "${func.name}" is only called once - nest it inside its caller`,
        }),
      ),
    )(data.functions);

    allViolations.push(...fileViolations);
  }

  // Filter by allowlist (file-level only)
  const isSingleUseAllowed = (v) => ALLOWED_SINGLE_USE_FUNCTIONS.has(v.file);

  return {
    violations: allViolations.filter((v) => !isSingleUseAllowed(v)),
    allowed: allViolations.filter(isSingleUseAllowed),
  };
};

// ============================================
// Tests
// ============================================

describe("single-use-functions", () => {
  describe("extractFunctionDefinitions", () => {
    test("finds function declarations", () => {
      const source = `
function hello() {
  return "world";
}
`;
      const functions = extractFunctionDefinitions(source);
      expect(functions.length).toBe(1);
      expect(functions[0].name).toBe("hello");
      expect(functions[0].isNested).toBe(false);
    });

    test("finds arrow functions", () => {
      const source = `
const greet = (name) => {
  return "Hello " + name;
};
`;
      const functions = extractFunctionDefinitions(source);
      expect(functions.length).toBe(1);
      expect(functions[0].name).toBe("greet");
    });

    test("finds async functions", () => {
      const source = `
async function fetchData() {
  return await fetch(url);
}

const getData = async () => {
  return data;
};
`;
      const functions = extractFunctionDefinitions(source);
      expect(functions.length).toBe(2);
      expect(functions.map((f) => f.name).sort()).toEqual([
        "fetchData",
        "getData",
      ]);
    });

    test("detects nested functions", () => {
      const source = `
function outer() {
  const inner = () => {
    return "nested";
  };
  return inner();
}
`;
      const functions = extractFunctionDefinitions(source);
      expect(functions.length).toBe(2);

      const outer = functions.find((f) => f.name === "outer");
      const inner = functions.find((f) => f.name === "inner");

      expect(outer.isNested).toBe(false);
      expect(inner.isNested).toBe(true);
    });
  });

  describe("extractExports", () => {
    test("finds export function declarations", () => {
      const source = `
export function helper() {}
export async function asyncHelper() {}
`;
      const exports = extractExports(source);
      expect(exports.has("helper")).toBe(true);
      expect(exports.has("asyncHelper")).toBe(true);
    });

    test("finds export const/let/var", () => {
      const source = `
export const foo = () => {};
export let bar = function() {};
export var baz = 42;
`;
      const exports = extractExports(source);
      expect(exports.has("foo")).toBe(true);
      expect(exports.has("bar")).toBe(true);
      expect(exports.has("baz")).toBe(true);
    });

    test("finds export list", () => {
      const source = `
function funcAlpha() {}
function funcBeta() {}
const funcGamma = () => {};

export { funcAlpha, funcBeta, funcGamma };
`;
      const exports = extractExports(source);
      expect(exports.has("funcAlpha")).toBe(true);
      expect(exports.has("funcBeta")).toBe(true);
      expect(exports.has("funcGamma")).toBe(true);
    });

    test("handles export with aliases", () => {
      const source = `
function originalFunc() {}
export { originalFunc as renamed };
`;
      const exports = extractExports(source);
      expect(exports.has("originalFunc")).toBe(true);
    });

    test("finds export default", () => {
      const source = `
function main() {}
export default main;
`;
      const exports = extractExports(source);
      expect(exports.has("main")).toBe(true);
    });
  });

  describe("countReferences", () => {
    test("counts function references correctly", () => {
      const source = `
const helper = () => {};
const result = helper();
`;
      expect(countReferences(source, "helper")).toBe(2);
    });

    test("does not count partial matches", () => {
      const source = `
const helper = () => {};
const helperTwo = () => {};
const myhelper = () => {};
`;
      expect(countReferences(source, "helper")).toBe(1);
    });

    test("counts multiple calls", () => {
      const source = `
function add(a, b) { return a + b; }
const x = add(1, 2);
const y = add(3, 4);
const z = add(5, 6);
`;
      expect(countReferences(source, "add")).toBe(4);
    });
  });

  test("No single-use unexported functions outside allowlist", () => {
    const { violations } = analyzeSingleUseFunctions();

    assertNoViolations(violations, {
      singular: "single-use unexported function",
      fixHint:
        "Nest the function inside its caller if it's specific to it, or add to ALLOWED_SINGLE_USE_FUNCTIONS if it's intentionally kept separate",
    });
  });

  test("ALLOWED_SINGLE_USE_FUNCTIONS files exist", () => {
    const missing = [...ALLOWED_SINGLE_USE_FUNCTIONS].filter(
      (file) => !readSource(file),
    );

    if (missing.length > 0) {
      console.log("\n  Missing ALLOWED_SINGLE_USE_FUNCTIONS files:");
      for (const file of missing) {
        console.log(`    - ${file}`);
      }
    }

    expect(missing.length).toBe(0);
  });
});
