/**
 * Detects exports from src/ that are only imported in test/ files.
 *
 * When a function is exported from src/ but only ever imported in test/,
 * it suggests the tests are testing implementation details rather than
 * the public API. These exports should either:
 * - Be made private (unexported) if they're truly internal
 * - Be used in production code if they're valuable utilities
 * - Be added to ALLOWED_TEST_ONLY_EXPORTS if intentionally test-only
 */
import { describe, expect, test } from "bun:test";
import { ALLOWED_TEST_ONLY_EXPORTS } from "#test/code-quality/code-quality-exceptions.js";
import {
  assertNoViolations,
  extractExports,
  readSource,
} from "#test/code-scanner.js";
import { SRC_JS_FILES, TEST_FILES } from "#test/test-utils.js";

const THIS_FILE = "test/unit/code-quality/test-only-exports.test.js";

// ============================================
// Import alias resolution
// ============================================

// Maps import aliases to actual file paths (from package.json imports)
const IMPORT_ALIASES = {
  "#data/": "src/_data/",
  "#lib/": "src/_lib/",
  "#collections/": "src/_lib/collections/",
  "#config/": "src/_lib/config/",
  "#filters/": "src/_lib/filters/",
  "#eleventy/": "src/_lib/eleventy/",
  "#build/": "src/_lib/build/",
  "#media/": "src/_lib/media/",
  "#utils/": "src/_lib/utils/",
  "#public/": "src/_lib/public/",
  "#test/": "test/",
};

/**
 * Resolve an import path to a relative file path.
 * @param {string} importPath - The import path (e.g., "#utils/memoize.js")
 * @returns {string|null} - The resolved path or null if not a src/ file
 */
const resolveImportPath = (importPath) => {
  // Handle alias imports
  for (const [alias, realPath] of Object.entries(IMPORT_ALIASES)) {
    if (importPath.startsWith(alias)) {
      return importPath.replace(alias, realPath);
    }
  }

  // Handle relative imports - would need the importing file's path
  // For now, skip relative imports as they're harder to resolve
  if (importPath.startsWith(".")) {
    return null;
  }

  return null;
};

// ============================================
// Import Detection Patterns
// ============================================

// Matches: import { a, b, c } from "path"
// Captures: group 1 = names, group 2 = path
const IMPORT_PATTERN = /import\s*\{([^}]+)\}\s*from\s*["']([^"']+)["']/g;

// Matches: import name from "path" (default imports)
const DEFAULT_IMPORT_PATTERN =
  /import\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s+from\s*["']([^"']+)["']/g;

// ============================================
// Analysis Functions
// ============================================

/**
 * Extract all imports from a source file.
 * @param {string} source - Source code
 * @returns {Array<{names: string[], path: string, resolvedPath: string|null}>}
 */
const extractImports = (source) => {
  const imports = [];

  // Named imports: import { a, b } from "path"
  const namedMatches = source.matchAll(IMPORT_PATTERN);
  for (const match of namedMatches) {
    const names = match[1]
      .split(",")
      .map((n) => {
        // Handle "name as alias" - we want the original name being imported
        const parts = n.trim().split(/\s+as\s+/);
        return parts[0].trim();
      })
      .filter((n) => n && /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(n));

    const importPath = match[2];
    const resolvedPath = resolveImportPath(importPath);

    if (names.length > 0) {
      imports.push({ names, path: importPath, resolvedPath });
    }
  }

  return imports;
};

/**
 * Build a map of exports for each src/ file.
 * @returns {Map<string, Set<string>>} - Map of file path to exported names
 */
const buildSrcExportsMap = () => {
  const exportsMap = new Map();
  const srcFiles = SRC_JS_FILES();

  for (const file of srcFiles) {
    const source = readSource(file);
    const exports = extractExports(source);
    if (exports.size > 0) {
      exportsMap.set(file, exports);
    }
  }

  return exportsMap;
};

/**
 * Build a map tracking where each export is imported from.
 * @param {string[]} files - Files to scan for imports
 * @returns {Map<string, Set<string>>} - Map of "file:export" to set of importing files
 */
const buildImportUsageMap = (files) => {
  const usageMap = new Map();

  for (const file of files) {
    const source = readSource(file);
    const imports = extractImports(source);

    for (const { names, resolvedPath } of imports) {
      if (!resolvedPath) continue;

      for (const name of names) {
        const key = `${resolvedPath}:${name}`;
        if (!usageMap.has(key)) {
          usageMap.set(key, new Set());
        }
        usageMap.get(key).add(file);
      }
    }
  }

  return usageMap;
};

/**
 * Analyze for test-only exports.
 * Returns exports from src/ that are only imported in test/ files.
 */
const analyzeTestOnlyExports = () => {
  const srcFiles = SRC_JS_FILES();
  const testFiles = TEST_FILES().filter((f) => f !== THIS_FILE);

  // Build exports map for all src files
  const srcExportsMap = buildSrcExportsMap();

  // Build import usage from src files (production usage)
  const srcImportUsage = buildImportUsageMap(srcFiles);

  // Build import usage from test files
  const testImportUsage = buildImportUsageMap(testFiles);

  const violations = [];
  const allowed = [];

  // Check each export from src/
  for (const [file, exports] of srcExportsMap) {
    for (const exportName of exports) {
      const key = `${file}:${exportName}`;

      // Check if used in src/ (production)
      const usedInSrc = srcImportUsage.has(key);

      // Check if used in test/
      const usedInTest = testImportUsage.has(key);

      // If only used in test, it's a potential violation
      if (!usedInSrc && usedInTest) {
        const testFilesUsing = [...testImportUsage.get(key)];

        const violation = {
          file,
          line: 0, // We don't track line numbers for exports
          code: exportName,
          reason: `Export "${exportName}" is only imported in test files`,
          testFiles: testFilesUsing,
        };

        if (ALLOWED_TEST_ONLY_EXPORTS.has(key)) {
          allowed.push(violation);
        } else {
          violations.push(violation);
        }
      }
    }
  }

  return { violations, allowed };
};

// ============================================
// Tests
// ============================================

describe("test-only-exports", () => {
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

    test("finds multi-line export list", () => {
      const source = `
function a() {}
function b() {}
const c = () => {};

export {
  a,
  b,
  c,
};
`;
      const exports = extractExports(source);
      expect(exports.has("a")).toBe(true);
      expect(exports.has("b")).toBe(true);
      expect(exports.has("c")).toBe(true);
    });

    test("handles multi-line export with aliases", () => {
      const source = `
function original() {}
function another() {}

export {
  original as renamed,
  another,
};
`;
      const exports = extractExports(source);
      expect(exports.has("original")).toBe(true);
      expect(exports.has("another")).toBe(true);
    });
  });

  describe("extractImports", () => {
    test("finds named imports", () => {
      const source = `
import { foo, bar } from "#utils/helpers.js";
import { baz } from "#lib/other.js";
`;
      const imports = extractImports(source);
      expect(imports.length).toBe(2);
      expect(imports[0].names).toContain("foo");
      expect(imports[0].names).toContain("bar");
      expect(imports[0].resolvedPath).toBe("src/_lib/utils/helpers.js");
      expect(imports[1].names).toContain("baz");
    });

    test("handles import aliases", () => {
      const source = `
import { orig as alias } from "#utils/test.js";
`;
      const imports = extractImports(source);
      expect(imports[0].names).toContain("orig");
    });
  });

  describe("resolveImportPath", () => {
    test("resolves #utils/ alias", () => {
      expect(resolveImportPath("#utils/memoize.js")).toBe(
        "src/_lib/utils/memoize.js",
      );
    });

    test("resolves #lib/ alias", () => {
      expect(resolveImportPath("#lib/paths.js")).toBe("src/_lib/paths.js");
    });

    test("resolves #collections/ alias", () => {
      expect(resolveImportPath("#collections/products.js")).toBe(
        "src/_lib/collections/products.js",
      );
    });

    test("returns null for relative imports", () => {
      expect(resolveImportPath("./local.js")).toBe(null);
      expect(resolveImportPath("../parent.js")).toBe(null);
    });

    test("returns null for node modules", () => {
      expect(resolveImportPath("bun:test")).toBe(null);
      expect(resolveImportPath("fs")).toBe(null);
    });
  });

  test("No test-only exports outside allowlist", () => {
    const { violations } = analyzeTestOnlyExports();

    assertNoViolations(violations, {
      singular: "test-only export",
      fixHint:
        "Either unexport the function (make it private), use it in production code, or add to ALLOWED_TEST_ONLY_EXPORTS",
    });
  });

  test("ALLOWED_TEST_ONLY_EXPORTS entries are valid", () => {
    const srcFiles = new Set(SRC_JS_FILES());
    const invalid = [];

    for (const entry of ALLOWED_TEST_ONLY_EXPORTS) {
      const [file, exportName] = entry.split(":");
      if (!file || !exportName) {
        invalid.push({
          entry,
          reason: "Invalid format (expected file:export)",
        });
        continue;
      }
      if (!srcFiles.has(file)) {
        invalid.push({ entry, reason: `File not found: ${file}` });
        continue;
      }

      // Verify the export exists in the file
      const source = readSource(file);
      const exports = extractExports(source);
      if (!exports.has(exportName)) {
        invalid.push({
          entry,
          reason: `Export "${exportName}" not found in ${file}`,
        });
      }
    }

    if (invalid.length > 0) {
      console.log("\n  Invalid ALLOWED_TEST_ONLY_EXPORTS entries:");
      for (const { entry, reason } of invalid) {
        console.log(`    - ${entry}: ${reason}`);
      }
    }

    expect(invalid.length).toBe(0);
  });
});
