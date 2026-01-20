import { describe, expect, test } from "bun:test";
import {
  analyzeWithAllowlist,
  assertNoViolations,
  isCommentLine,
  scanLines,
} from "#test/code-scanner.js";
import { SRC_JS_FILES } from "#test/test-utils.js";
import { frozenSet } from "#toolkit/fp/set.js";

/**
 * Detect method/function aliasing like:
 *   const newName = existingName;
 *
 * This pattern adds noise without value. Instead:
 * - Use the original name directly
 * - Or give the function a more generic name that fits all contexts
 */

// Pattern: const identifier = identifier;
// Must be a simple identifier on the right, ending with semicolon
// This avoids matching multi-line chains like: const x = y\n  .map(...)
const ALIAS_PATTERN = /^\s*const\s+(\w+)\s*=\s*([a-z_]\w*)\s*;\s*$/i;

// Pattern to match local definitions (const/let/var/function)
const DEF_PATTERN = /^\s*(?:const|let|var|function)\s+(\w+)(?:\s*=|\s*\()/;

// Identifiers that are commonly assigned (not aliases)
const BUILTIN_IDENTIFIERS = frozenSet([
  "null",
  "undefined",
  "true",
  "false",
  "NaN",
  "Infinity",
]);

/**
 * Find aliases in source, checking that the original is defined locally.
 */
const findAliases = (source) => {
  const lines = source.split("\n");
  // Collect all local definitions from source lines
  const localDefs = new Set(
    lines.map((line) => DEF_PATTERN.exec(line)?.[1]).filter(Boolean),
  );

  return scanLines(source, (line, lineNum) => {
    if (isCommentLine(line)) return null;

    const match = line.match(ALIAS_PATTERN);
    if (!match) return null;

    const [, newName, originalName] = match;

    // Skip if names are the same, or if it's a builtin/primitive
    if (newName === originalName) return null;
    if (BUILTIN_IDENTIFIERS.has(originalName)) return null;
    if (originalName.length === 1) return null;

    // Only flag if the original is defined locally (not an import)
    if (!localDefs.has(originalName)) return null;

    return {
      lineNumber: lineNum,
      line: line.trim(),
      newName,
      originalName,
    };
  });
};

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

  test("No method aliasing in source files", () => {
    const { violations } = analyzeWithAllowlist({
      findFn: findAliases,
      files: SRC_JS_FILES,
    });
    assertNoViolations(violations, {
      singular: "method alias",
      fixHint:
        "use the original name directly, or give it a generic name that fits all contexts",
    });
  });
});
