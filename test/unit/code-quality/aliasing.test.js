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
 * Detect variable aliasing patterns that add noise without value:
 *
 * 1. Local aliases:    const alias = localFn;
 * 2. Import aliases:   const alias = importedFn;
 * 3. Property aliases: const alias = obj.prop;
 *
 * Instead:
 * - Use the original name directly
 * - Rename at import site: import { x as alias } from '...'
 * - For properties, use directly: obj.prop
 */

// Pattern: const identifier = identifier; (simple alias)
const SIMPLE_ALIAS_PATTERN = /^\s*const\s+(\w+)\s*=\s*([a-z_]\w*)\s*;\s*$/i;

// Pattern: const identifier = identifier.property; (property alias)
const PROPERTY_ALIAS_PATTERN =
  /^\s*const\s+(\w+)\s*=\s*([a-z_]\w*(?:\.[a-z_]\w*)+)\s*;\s*$/i;

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
 * Find all aliasing patterns in source.
 */
const findAliases = (source) => {
  const lines = source.split("\n");
  const localDefs = new Set(
    lines.map((line) => DEF_PATTERN.exec(line)?.[1]).filter(Boolean),
  );

  // Extract imported identifiers
  const imports = new Set();
  for (const line of lines) {
    // Named imports: import { a, b, c as d } from '...'
    const namedMatch = line.match(/import\s*\{([^}]+)\}\s*from/);
    if (namedMatch) {
      for (const name of namedMatch[1].split(",")) {
        const parts = name.trim().split(/\s+as\s+/);
        const importedName = parts[parts.length - 1].trim();
        if (importedName && /^[a-zA-Z_$]\w*$/.test(importedName)) {
          imports.add(importedName);
        }
      }
    }
    // Default imports: import name from '...'
    const defaultMatch = line.match(/import\s+([a-zA-Z_$]\w*)\s+from/);
    if (defaultMatch) imports.add(defaultMatch[1]);
    // Namespace imports: import * as name from '...'
    const namespaceMatch = line.match(/import\s+\*\s+as\s+(\w+)\s+from/);
    if (namespaceMatch) imports.add(namespaceMatch[1]);
  }

  return scanLines(source, (line, lineNum) => {
    if (isCommentLine(line)) return null;

    // Check for property alias first (more specific pattern)
    const propMatch = line.match(PROPERTY_ALIAS_PATTERN);
    if (propMatch) {
      const [, newName, originalExpr] = propMatch;
      return {
        lineNumber: lineNum,
        line: line.trim(),
        newName,
        originalName: originalExpr,
        type: "property",
      };
    }

    // Check for simple alias
    const match = line.match(SIMPLE_ALIAS_PATTERN);
    if (!match) return null;

    const [, newName, originalName] = match;

    // Skip if names are the same, or if it's a builtin/primitive
    if (newName === originalName) return null;
    if (BUILTIN_IDENTIFIERS.has(originalName)) return null;
    if (originalName.length === 1) return null;

    // Flag if original is locally defined OR imported
    const isLocal = localDefs.has(originalName);
    const isImport = imports.has(originalName);

    if (!isLocal && !isImport) return null;

    return {
      lineNumber: lineNum,
      line: line.trim(),
      newName,
      originalName,
      type: isImport ? "import" : "local",
    };
  });
};

describe("aliasing", () => {
  describe("local aliases", () => {
    test("detects aliasing of locally defined functions", () => {
      const source = `const originalFn = (x) => x * 2;
const aliasedFn = originalFn;`;
      const results = findAliases(source);
      expect(results.length).toBe(1);
      expect(results[0].type).toBe("local");
      expect(results[0].newName).toBe("aliasedFn");
    });
  });

  describe("import aliases", () => {
    test("detects aliasing of named imports", () => {
      const source = `import { originalFn } from some-module;
const aliasedFn = originalFn;`;
      const results = findAliases(source);
      expect(results.length).toBe(1);
      expect(results[0].type).toBe("import");
      expect(results[0].newName).toBe("aliasedFn");
    });

    test("detects aliasing of default imports", () => {
      const source = `import originalFn from some-module;
const aliasedFn = originalFn;`;
      const results = findAliases(source);
      expect(results.length).toBe(1);
      expect(results[0].type).toBe("import");
    });
  });

  describe("property aliases", () => {
    test("detects property access aliases", () => {
      const source = "const log = console.log;";
      const results = findAliases(source);
      expect(results.length).toBe(1);
      expect(results[0].type).toBe("property");
      expect(results[0].originalName).toBe("console.log");
    });

    test("detects nested property access", () => {
      const source = "const options = product.data.options;";
      const results = findAliases(source);
      expect(results.length).toBe(1);
      expect(results[0].originalName).toBe("product.data.options");
    });
  });

  describe("allowed patterns", () => {
    test("ignores function calls", () => {
      const source = `import { getData } from some-module;
const result = getData();`;
      expect(findAliases(source).length).toBe(0);
    });

    test("ignores multi-line chains", () => {
      const source = `const files = fs.readdirSync(dir);
const themes = files
  .filter(f => f.startsWith('theme-'));`;
      expect(findAliases(source).length).toBe(0);
    });

    test("ignores array and object literals", () => {
      const source = `const items = [];
const obj = {};
const nums = [1, 2, 3];`;
      expect(findAliases(source).length).toBe(0);
    });

    test("ignores primitive assignments", () => {
      const source = `const count = 0;
const name = "test";
const flag = true;
const empty = null;`;
      expect(findAliases(source).length).toBe(0);
    });

    test("ignores unknown identifiers (not local or imported)", () => {
      const source = "const alias = unknownGlobal;";
      expect(findAliases(source).length).toBe(0);
    });
  });

  test("no aliasing in source files", () => {
    const { violations } = analyzeWithAllowlist({
      findFn: findAliases,
      files: SRC_JS_FILES,
    });
    assertNoViolations(violations, {
      singular: "alias",
      plural: "aliases",
      fixHint:
        "use the original directly, or rename at import: import { x as y } from '...'",
      limit: 50,
    });
  });
});
