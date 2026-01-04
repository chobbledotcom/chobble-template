import { describe, expect, test } from "bun:test";
import {
  analyzeFiles,
  assertNoViolations,
  isCommentLine,
  scanLines,
} from "#test/code-scanner.js";
import { SRC_JS_FILES } from "#test/test-utils.js";

/**
 * Detect method/function aliasing like:
 *   const newName = existingName;
 *
 * And method wrappers like:
 *   const fromPairs = (pairs) => Object.fromEntries(pairs);
 *   const double = (x) => multiply(x);
 *
 * These patterns add noise without value. Instead:
 * - Use the original name directly
 * - Or give the function a more generic name that fits all contexts
 */

// Pattern: const identifier = identifier;
// Must be a simple identifier on the right, ending with semicolon
// This avoids matching multi-line chains like: const x = y\n  .map(...)
const ALIAS_PATTERN = /^\s*const\s+(\w+)\s*=\s*([a-z_]\w*)\s*;\s*$/i;

// Pattern: const name = (params) => something(params);
// Captures: name, params, method/function call, args
const WRAPPER_PATTERN =
  /^\s*const\s+(\w+)\s*=\s*\(([^)]*)\)\s*=>\s*([a-zA-Z_][\w.]*)\(([^)]*)\)\s*;?\s*$/;

// Pattern to match local definitions (const/let/var/function)
const DEF_PATTERN = /^\s*(?:const|let|var|function)\s+(\w+)(?:\s*=|\s*\()/;

// Identifiers that are commonly assigned (not aliases)
const isBuiltinIdentifier = (name) =>
  ["null", "undefined", "true", "false", "NaN", "Infinity"].includes(name);

// Extract definition name from a line, or null if not a definition
const extractDefName = (line) => DEF_PATTERN.exec(line)?.[1] ?? null;

// Collect all local definitions from source lines (functional style)
const collectLocalDefs = (lines) =>
  new Set(lines.map(extractDefName).filter(Boolean));

/**
 * Check if a line is a method alias.
 * Returns the alias info or null if not an alias.
 */
const parseAlias = (line) => {
  if (isCommentLine(line)) return null;

  const match = line.match(ALIAS_PATTERN);
  if (!match) return null;

  const [, newName, originalName] = match;

  // Skip if names are the same
  if (newName === originalName) return null;

  // Skip known primitives/builtins
  if (isBuiltinIdentifier(originalName)) return null;

  // Skip single-letter variables (loop indices, etc.)
  if (originalName.length === 1) return null;

  return { newName, originalName, type: "alias" };
};

// Normalize params: remove whitespace, split by comma, filter empty
const normalizeParams = (params) =>
  params
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean);

/**
 * Check if a line is a method wrapper.
 * A wrapper is: const name = (params) => something(params)
 * where the arguments match the parameters exactly.
 */
const parseWrapper = (line) => {
  if (isCommentLine(line)) return null;

  const match = line.match(WRAPPER_PATTERN);
  if (!match) return null;

  const [, newName, params, calledMethod, args] = match;

  // Normalize and compare params vs args
  const paramList = normalizeParams(params);
  const argList = normalizeParams(args);

  // Must have at least one parameter
  if (paramList.length === 0) return null;

  // Args must exactly match params (same order, same names)
  if (paramList.length !== argList.length) return null;
  if (!paramList.every((p, i) => p === argList[i])) return null;

  return { newName, originalName: calledMethod, type: "wrapper" };
};

/**
 * Find aliases and wrappers in source.
 * For simple aliases, checks that the original is defined locally.
 * For wrappers, always flags (they're wrapping external or internal calls).
 */
const findAliases = (source) => {
  const lines = source.split("\n");
  const localDefs = collectLocalDefs(lines);

  return scanLines(source, (line, lineNum) => {
    // Check for wrapper first (more specific pattern)
    const wrapper = parseWrapper(line);
    if (wrapper) {
      return {
        lineNumber: lineNum,
        line: line.trim(),
        ...wrapper,
      };
    }

    // Check for simple alias
    const alias = parseAlias(line);
    if (!alias) return null;

    // Only flag if the original is defined locally (not an import)
    if (!localDefs.has(alias.originalName)) return null;

    return {
      lineNumber: lineNum,
      line: line.trim(),
      ...alias,
    };
  });
};

/**
 * Analyze all JS files for method aliasing.
 */
const analyzeMethodAliasing = () =>
  analyzeFiles(SRC_JS_FILES(), (source, relativePath) =>
    findAliases(source).map((hit) => ({
      file: relativePath,
      line: hit.lineNumber,
      code: hit.line,
      newName: hit.newName,
      originalName: hit.originalName,
      location: `${relativePath}:${hit.lineNumber}`,
    })),
  );

describe("method-aliasing", () => {
  test("Detects simple method aliasing", () => {
    const source = `const originalFn = (x) => x * 2;
const aliasedFn = originalFn;`;
    const results = findAliases(source);
    expect(results.length).toBe(1);
    expect(results[0].newName).toBe("aliasedFn");
    expect(results[0].originalName).toBe("originalFn");
  });

  test("Does not flag multi-line chains", () => {
    const source = `const files = fs.readdirSync(dir);
const themes = files
  .filter(f => f.startsWith('theme-'))
  .map(f => f.slice(6));`;
    const results = findAliases(source);
    expect(results.length).toBe(0);
  });

  test("Does not flag function calls", () => {
    const source = `
const result = someFunction();
const value = getData();
`;
    const results = findAliases(source);
    expect(results.length).toBe(0);
  });

  test("Does not flag object property access", () => {
    const source = `
const log = console.log;
const join = path.join;
`;
    const results = findAliases(source);
    expect(results.length).toBe(0);
  });

  test("Does not flag imports or externals", () => {
    const source = `
import { foo } from "bar";
const baz = foo;
`;
    // foo is imported, not defined locally
    const results = findAliases(source);
    expect(results.length).toBe(0);
  });

  test("Does not flag array/object literals", () => {
    const source = `
const items = [];
const obj = {};
const nums = [1, 2, 3];
`;
    const results = findAliases(source);
    expect(results.length).toBe(0);
  });

  test("Does not flag primitive assignments", () => {
    const source = `
const count = 0;
const name = "test";
const flag = true;
const empty = null;
`;
    const results = findAliases(source);
    expect(results.length).toBe(0);
  });

  // Wrapper detection tests
  test("Detects method wrapper with single param", () => {
    const source = `const fromPairs = (pairs) => Object.fromEntries(pairs);`;
    const results = findAliases(source);
    expect(results.length).toBe(1);
    expect(results[0].newName).toBe("fromPairs");
    expect(results[0].originalName).toBe("Object.fromEntries");
    expect(results[0].type).toBe("wrapper");
  });

  test("Detects wrapper calling plain function", () => {
    const source = `const double = (x) => multiply(x);`;
    const results = findAliases(source);
    expect(results.length).toBe(1);
    expect(results[0].newName).toBe("double");
    expect(results[0].originalName).toBe("multiply");
    expect(results[0].type).toBe("wrapper");
  });

  test("Detects wrapper with multiple params", () => {
    const source = `const add = (a, b) => sum(a, b);`;
    const results = findAliases(source);
    expect(results.length).toBe(1);
    expect(results[0].newName).toBe("add");
    expect(results[0].originalName).toBe("sum");
  });

  test("Does not flag wrapper when args differ from params", () => {
    const source = `const double = (x) => multiply(x, 2);`;
    const results = findAliases(source);
    expect(results.length).toBe(0);
  });

  test("Does not flag wrapper with different arg order", () => {
    const source = `const swap = (a, b) => doThing(b, a);`;
    const results = findAliases(source);
    expect(results.length).toBe(0);
  });

  test("Does not flag arrow function with logic", () => {
    const source = `const double = (x) => x * 2;`;
    const results = findAliases(source);
    expect(results.length).toBe(0);
  });

  test("Does not flag wrapper with additional constant args", () => {
    const source = `const getPagePath = (filename) => path.join(PAGES_DIR, filename);`;
    const results = findAliases(source);
    expect(results.length).toBe(0);
  });

  test("Does not flag empty param wrapper", () => {
    const source = `const getData = () => fetchData();`;
    const results = findAliases(source);
    expect(results.length).toBe(0);
  });

  test("No method aliasing or wrappers in source files", () => {
    const violations = analyzeMethodAliasing();
    assertNoViolations(violations, {
      message: "method alias(es) or wrapper(s)",
      fixHint:
        "use the original method/function directly instead of wrapping it",
    });
  });
});
