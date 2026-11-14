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
import { describe, expect, test, vi } from "vitest";
import { ALLOWED_SINGLE_USE_FUNCTIONS } from "#test/code-quality/code-quality-exceptions.js";
import {
  assertNoViolations,
  combineFileLists,
  extractExports,
  readSource,
} from "#test/code-scanner.js";
import { SRC_JS_FILES, TEST_FILES } from "#test/test-utils.js";
import { filterMap, pipe } from "#utils/fp/array.js";
import { frozenSet } from "#utils/fp/set.js";

// Scans every src and test file; under the full suite's parallel lanes that
// exceeds the default timeout.
vi.setConfig({ testTimeout: 5000 });

// Scans every src and test file; under the full suite's parallel lanes that
// exceeds the default timeout.
vi.setConfig({ testTimeout: 5000 });

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

  return {
    ...processedState,
    definition: funcMatch
      ? {
          name: funcMatch[1],
          line: lineNum,
          isNested: state.braceDepth > 0,
        }
      : null,
  };
};

/**
 * Extract function definitions from source code.
 * Returns array of { name, line, isNested }
 */
const extractFunctionDefinitions = (source) => {
  const definitions = function* () {
    const state = {
      current: {
        braceDepth: 0,
        inString: false,
        stringChar: null,
        inMultilineComment: false,
        skipNext: false,
      },
    };
    for (const [index, line] of source.split("\n").entries()) {
      state.current = processLineForFuncDef(state.current, line, index);
      if (state.current.definition) yield state.current.definition;
    }
  };
  return [...definitions()];
};

/**
 * Build a global reference count map for all function names across all files.
 *
 * Rather than running one regular expression per function name per file, tokenize
 * each source file once and increment counts for identifiers that are known
 * function names, avoiding thousands of full-source rescans.
 */
const IDENTIFIER_PATTERN = /\b[a-zA-Z_$][a-zA-Z0-9_$]*\b/g;

const buildReferenceCountMap = (fileData) => {
  const functionNames = frozenSet(
    Object.values(fileData).flatMap((data) =>
      data.functions.map((func) => func.name),
    ),
  );

  const counts = Object.fromEntries(
    [...functionNames].map((name) => [name, 0]),
  );
  for (const { source } of Object.values(fileData)) {
    for (const [identifier] of source.matchAll(IDENTIFIER_PATTERN)) {
      if (functionNames.has(identifier)) counts[identifier] += 1;
    }
  }
  return counts;
};

/**
 * Analyze all files for single-use unexported functions.
 * Optimized using pipe() and reference count map to avoid O(n³) complexity.
 */
const analyzeSingleUseFunctions = (
  files = combineFileLists([SRC_JS_FILES(), TEST_FILES()], [THIS_FILE]),
  loadSource = readSource,
) => {
  // Organisation-style rule: kept to runtime src/ and test/ code - the
  // generic fp utilities and the shared test infrastructure are exempt.
  const exemptDirs = ["src/_lib/utils/fp/", "test/test-utils/"];
  const allFiles = files.filter(
    (file) => !exemptDirs.some((dir) => file.startsWith(dir)),
  );

  // First pass: collect all function definitions and exports per file
  const fileData = Object.fromEntries(
    allFiles.map((file) => {
      const source = loadSource(file);
      return [
        file,
        {
          source,
          functions: extractFunctionDefinitions(source),
          exports: extractExports(source),
        },
      ];
    }),
  );

  // Second pass: build reference count map with one identifier scan per file
  const refCounts = buildReferenceCountMap(fileData);

  // Third pass: identify violations using functional composition
  const allViolations = Object.entries(fileData).flatMap(([file, data]) =>
    pipe(
      filterMap(
        (func) => {
          // Skip exported functions
          if (data.exports.has(func.name)) return false;

          // Skip nested functions (intentionally scoped)
          if (func.isNested) return false;

          // 2 references = 1 definition + 1 call = single use
          return refCounts[func.name] === 2;
        },
        (func) => ({
          file,
          line: func.line,
          code: func.name,
          reason: `Function "${func.name}" is only called once - nest it inside its caller`,
        }),
      ),
    )(data.functions),
  );

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
  /** Parse a source snippet and assert the extracted definitions' names. */
  const expectFunctionsNamed = (source, names) => {
    const functions = extractFunctionDefinitions(source);
    expect(functions.map((f) => f.name)).toEqual(names);
    return functions;
  };

  /** Curry a name lookup over extracted function definitions. */
  const findFunctionNamed = (name) => (functions) =>
    functions.find((fn) => fn.name === name);

  describe("extractFunctionDefinitions", () => {
    test("finds function declarations", () => {
      const source = `
function hello() {
  return "world";
}
`;
      const [fn] = expectFunctionsNamed(source, ["hello"]);
      expect(fn.isNested).toBe(false);
    });

    test("finds arrow functions", () => {
      const source = `
const greet = (name) => {
  return "Hello " + name;
};
`;
      expectFunctionsNamed(source, ["greet"]);
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
      expectFunctionsNamed(source, ["fetchData", "getData"]);
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
      const functions = expectFunctionsNamed(source, ["outer", "inner"]);

      const outer = findFunctionNamed("outer")(functions);
      const inner = findFunctionNamed("inner")(functions);

      expect(outer.isNested).toBe(false);
      expect(inner.isNested).toBe(true);
    });
  });

  describe("analyzeSingleUseFunctions", () => {
    test("reports a definition with one call in another file", () => {
      const sources = {
        "src/definition.js": "const referencedOnce = () => 1;",
        "test/caller.js": "referencedOnce();",
      };
      expect(
        analyzeSingleUseFunctions(
          Object.keys(sources),
          (file) => sources[file],
        ),
      ).toEqual({
        violations: [
          {
            file: "src/definition.js",
            line: 1,
            code: "referencedOnce",
            reason:
              'Function "referencedOnce" is only called once - nest it inside its caller',
          },
        ],
        allowed: [],
      });
    });

    test("does not count longer identifiers as references", () => {
      const source =
        "const boundaryReference = () => 1;\nboundaryReference();\nboundaryReferenceExtra();\nmyboundaryReference();";
      const { violations } = analyzeSingleUseFunctions(
        ["src/boundary.js"],
        () => source,
      );
      expect(violations.map(({ code }) => code)).toEqual(["boundaryReference"]);
    });

    test.each([
      "constructor",
      "__proto__",
    ])("counts a function named %s without prototype collisions", (name) => {
      const source = `const ${name} = () => 1;\n${name}();`;
      const { violations } = analyzeSingleUseFunctions(
        ["src/prototype-name.js"],
        () => source,
      );
      expect(violations.map(({ code }) => code)).toEqual([name]);
    });

    test.each([
      0, 2, 10000,
    ])("does not flag a function with %i calls", (calls) => {
      const source = `const repeatedReference = () => 1;\n${"repeatedReference();\n".repeat(calls)}`;
      expect(
        analyzeSingleUseFunctions(["src/repeated.js"], () => source),
      ).toEqual({ violations: [], allowed: [] });
    });

    test.each([
      "const publicReference = () => 1;\nexport { publicReference };",
      "const containingReference = () => {\nconst nestedReference = () => 1;\nreturn nestedReference();\n};",
    ])("excludes exported or nested definitions: %s", (source) => {
      expect(
        analyzeSingleUseFunctions(["src/excluded.js"], () => source),
      ).toEqual({ violations: [], allowed: [] });
    });
  });

  test("No single-use unexported functions outside allowlist", () => {
    const { violations } = analyzeSingleUseFunctions();

    assertNoViolations(violations, {
      singular: "single-use unexported function",
      fixHint:
        "Nest the function inside its caller if it's specific to it - the ALLOWED_SINGLE_USE_FUNCTIONS baseline is deletion-only",
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
