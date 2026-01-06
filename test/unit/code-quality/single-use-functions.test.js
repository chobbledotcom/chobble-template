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
  readSource,
} from "#test/code-scanner.js";
import { ALL_JS_FILES } from "#test/test-utils.js";

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
// Export Detection Patterns
// ============================================

// Matches: export function name or export async function name
const EXPORT_FUNCTION_PATTERN =
  /^\s*export\s+(?:async\s+)?function\s+([a-zA-Z_$][a-zA-Z0-9_$]*)/;

// Matches: export const/let/var name
const EXPORT_VAR_PATTERN =
  /^\s*export\s+(?:const|let|var)\s+([a-zA-Z_$][a-zA-Z0-9_$]*)/;

// Matches names inside: export { name1, name2, name3 as alias }
const EXPORT_LIST_PATTERN = /^\s*export\s*\{([^}]+)\}/;

// Matches: export default name or export default function name
const EXPORT_DEFAULT_PATTERN =
  /^\s*export\s+default\s+(?:function\s+)?([a-zA-Z_$][a-zA-Z0-9_$]*)/;

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
 * Extract exported function names from source code.
 * Returns a Set of exported names.
 */
const extractExports = (source) => {
  const exported = new Set();
  const lines = source.split("\n");

  for (const line of lines) {
    // export function name
    const funcMatch = line.match(EXPORT_FUNCTION_PATTERN);
    if (funcMatch) {
      exported.add(funcMatch[1]);
      continue;
    }

    // export const/let/var name
    const varMatch = line.match(EXPORT_VAR_PATTERN);
    if (varMatch) {
      exported.add(varMatch[1]);
      continue;
    }

    // export { name1, name2 }
    const listMatch = line.match(EXPORT_LIST_PATTERN);
    if (listMatch) {
      const names = listMatch[1].split(",").map((n) => {
        // Handle "name as alias" - we want the original name
        const parts = n.trim().split(/\s+as\s+/);
        return parts[0].trim();
      });
      for (const name of names) {
        if (name && /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(name)) {
          exported.add(name);
        }
      }
      continue;
    }

    // export default name
    const defaultMatch = line.match(EXPORT_DEFAULT_PATTERN);
    if (defaultMatch) {
      exported.add(defaultMatch[1]);
    }
  }

  return exported;
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
 * Analyze all files for single-use unexported functions.
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

  // Second pass: count references across all files for each function
  const violations = [];

  for (const [file, data] of fileData) {
    const { functions, exports } = data;

    for (const func of functions) {
      // Skip exported functions
      if (exports.has(func.name)) continue;

      // Skip nested functions (intentionally scoped)
      if (func.isNested) continue;

      // Count total references across all files
      let totalRefs = 0;
      for (const [, otherData] of fileData) {
        totalRefs += countReferences(otherData.source, func.name);
      }

      // 2 references = 1 definition + 1 call = single use
      if (totalRefs === 2) {
        violations.push({
          file,
          line: func.line,
          code: func.name,
          reason: `Function "${func.name}" is only called once - nest it inside its caller`,
        });
      }
    }
  }

  // Filter by allowlist (file-level only)
  const isAllowlisted = (v) => ALLOWED_SINGLE_USE_FUNCTIONS.has(v.file);

  return {
    violations: violations.filter((v) => !isAllowlisted(v)),
    allowed: violations.filter(isAllowlisted),
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
function a() {}
function b() {}
const c = () => {};

export { a, b, c };
`;
      const exports = extractExports(source);
      expect(exports.has("a")).toBe(true);
      expect(exports.has("b")).toBe(true);
      expect(exports.has("c")).toBe(true);
    });

    test("handles export with aliases", () => {
      const source = `
function original() {}
export { original as renamed };
`;
      const exports = extractExports(source);
      expect(exports.has("original")).toBe(true);
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
      message: "single-use unexported function(s)",
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
