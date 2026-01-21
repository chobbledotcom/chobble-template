import { describe, expect, test } from "bun:test";
import {
  analyzeWithAllowlist,
  assertNoViolations,
  isCommentLine,
  scanLines,
} from "#test/code-scanner.js";
import { SRC_JS_FILES } from "#test/test-utils.js";

/**
 * Detect variable aliasing of imports like:
 *   import { something } from './module';
 *   const alias = something;
 *
 * This pattern adds noise without value. Instead:
 * - Use the original import name directly
 * - Or rename at import: import { something as alias } from './module'
 */

// Pattern: const identifier = identifier;
// Must be a simple identifier on the right, ending with semicolon
const ALIAS_PATTERN = /^\s*const\s+(\w+)\s*=\s*([a-z_]\w*)\s*;\s*$/i;

// Pattern to match imports: import { name } or import { name as alias }
const IMPORT_PATTERN =
  /import\s*\{([^}]+)\}\s*from|import\s+(\w+)\s+from|import\s+\*\s+as\s+(\w+)\s+from/g;

// Identifiers that are commonly assigned (not aliases)
const BUILTIN_IDENTIFIERS = new Set([
  "null",
  "undefined",
  "true",
  "false",
  "NaN",
  "Infinity",
]);

/**
 * Extract all imported identifiers from source.
 */
const extractImports = (source) => {
  const imports = new Set();
  const lines = source.split("\n");

  for (const line of lines) {
    // Handle named imports: import { a, b, c as d } from '...'
    const namedMatch = line.match(/import\s*\{([^}]+)\}\s*from/);
    if (namedMatch) {
      const names = namedMatch[1].split(",");
      for (const name of names) {
        // Handle "name as alias" - we want both names
        const parts = name.trim().split(/\s+as\s+/);
        const importedName = parts[parts.length - 1].trim();
        if (importedName && /^[a-zA-Z_$]\w*$/.test(importedName)) {
          imports.add(importedName);
        }
      }
    }

    // Handle default imports: import name from '...'
    const defaultMatch = line.match(/import\s+([a-zA-Z_$]\w*)\s+from/);
    if (defaultMatch) {
      imports.add(defaultMatch[1]);
    }

    // Handle namespace imports: import * as name from '...'
    const namespaceMatch = line.match(/import\s+\*\s+as\s+(\w+)\s+from/);
    if (namespaceMatch) {
      imports.add(namespaceMatch[1]);
    }
  }

  return imports;
};

/**
 * Find aliases of imports in source.
 */
const findVariableAliases = (source) => {
  const imports = extractImports(source);

  return scanLines(source, (line, lineNum) => {
    if (isCommentLine(line)) return null;

    const match = line.match(ALIAS_PATTERN);
    if (!match) return null;

    const [, newName, originalName] = match;

    // Skip if names are the same
    if (newName === originalName) return null;
    // Skip builtins
    if (BUILTIN_IDENTIFIERS.has(originalName)) return null;
    // Skip single-letter identifiers (likely loop vars or shorthand)
    if (originalName.length === 1) return null;

    // Only flag if the original is an import
    if (!imports.has(originalName)) return null;

    return {
      lineNumber: lineNum,
      line: line.trim(),
      newName,
      originalName,
    };
  });
};

describe("variable-aliasing", () => {
  test("Detects aliasing of named imports", () => {
    const source = `import { originalFn } from './module';
const aliasedFn = originalFn;`;
    const results = findVariableAliases(source);
    expect(results.length).toBe(1);
    expect(results[0].newName).toBe("aliasedFn");
    expect(results[0].originalName).toBe("originalFn");
  });

  test("Detects aliasing of default imports", () => {
    const source = `import originalFn from './module';
const aliasedFn = originalFn;`;
    const results = findVariableAliases(source);
    expect(results.length).toBe(1);
    expect(results[0].newName).toBe("aliasedFn");
    expect(results[0].originalName).toBe("originalFn");
  });

  test("Does not flag locally defined variables", () => {
    const source = `const originalFn = (x) => x * 2;
const aliasedFn = originalFn;`;
    const results = findVariableAliases(source);
    expect(results.length).toBe(0);
  });

  test("Does not flag function calls", () => {
    const source = `import { getData } from './module';
const result = getData();`;
    const results = findVariableAliases(source);
    expect(results.length).toBe(0);
  });

  test("Does not flag property access", () => {
    const source = `import { obj } from './module';
const value = obj.property;`;
    const results = findVariableAliases(source);
    expect(results.length).toBe(0);
  });

  test("Does not flag renamed imports used directly", () => {
    const source = `import { original as renamed } from './module';
doSomething(renamed);`;
    const results = findVariableAliases(source);
    expect(results.length).toBe(0);
  });

  test("Does not flag array/object literals", () => {
    const source = `import { data } from './module';
const items = [];
const obj = {};`;
    const results = findVariableAliases(source);
    expect(results.length).toBe(0);
  });

  test("Does not flag multi-line chains", () => {
    const source = `import { items } from './module';
const filtered = items
  .filter(x => x.active);`;
    const results = findVariableAliases(source);
    expect(results.length).toBe(0);
  });

  test("Does not flag primitive assignments", () => {
    const source = `const count = 0;
const name = "test";
const flag = true;
const empty = null;`;
    const results = findVariableAliases(source);
    expect(results.length).toBe(0);
  });

  test("No variable aliasing of imports in source files", () => {
    const { violations } = analyzeWithAllowlist({
      findFn: findVariableAliases,
      files: SRC_JS_FILES,
    });
    assertNoViolations(violations, {
      singular: "variable alias",
      fixHint:
        "use the import directly, or rename at import site: import { x as y } from '...'",
    });
  });
});
