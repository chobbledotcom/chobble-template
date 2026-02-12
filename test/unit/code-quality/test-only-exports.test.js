/**
 * Detects exports from src/ and packages/ that are only imported in test/ files.
 *
 * When a function is exported but only ever imported in test/,
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
  "#toolkit/": "packages/js-toolkit/",
};

/**
 * Resolve an import path to a relative file path.
 * @param {string} importPath - The import path (e.g., "#toolkit/fp/memoize.js")
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

// ============================================
// Eleventy Registration Detection
// ============================================

// Matches calls that register functions with Eleventy config.
// These count as "production usage" even if the function isn't imported elsewhere.
// Patterns:
//   eleventyConfig.addFilter("name", functionRef)
//   eleventyConfig.addAsyncFilter("name", functionRef)
//   eleventyConfig.addShortcode("name", functionRef)
//   eleventyConfig.addAsyncShortcode("name", functionRef)
//   eleventyConfig.addCollection("name", functionRef)
//   eleventyConfig.addTransform("name", functionRef)
//   addDataFilter(eleventyConfig, "name", functionRef)
const ELEVENTY_REGISTRATION_PATTERN =
  /(?:eleventyConfig\.(?:addFilter|addAsyncFilter|addShortcode|addAsyncShortcode|addCollection|addTransform)\s*\(\s*["'][^"']+["']|addDataFilter\s*\(\s*\w+\s*,\s*["'][^"']+["'])\s*,\s*([a-zA-Z_$][a-zA-Z0-9_$]*)/g;

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
function exportAlpha() {}
function exportBeta() {}
const exportGamma = () => {};

export { exportAlpha, exportBeta, exportGamma };
`;
      const exports = extractExports(source);
      expect(exports.has("exportAlpha")).toBe(true);
      expect(exports.has("exportBeta")).toBe(true);
      expect(exports.has("exportGamma")).toBe(true);
    });

    test("handles export with aliases", () => {
      const source = `
function baseExport() {}
export { baseExport as renamed };
`;
      const exports = extractExports(source);
      expect(exports.has("baseExport")).toBe(true);
    });

    test.each([
      {
        name: "without aliases",
        source: `
function multiAlpha() {}
function multiBeta() {}
const multiGamma = () => {};

export {
  multiAlpha,
  multiBeta,
  multiGamma,
};
`,
        expectedExports: ["multiAlpha", "multiBeta", "multiGamma"],
      },
      {
        name: "with aliases",
        source: `
function aliasBase() {}
function aliasKeep() {}

export {
  aliasBase as renamed,
  aliasKeep,
};
`,
        expectedExports: ["aliasBase", "aliasKeep"],
      },
    ])("finds multi-line export list $name", ({ source, expectedExports }) => {
      const exports = extractExports(source);
      for (const name of expectedExports) {
        expect(exports.has(name)).toBe(true);
      }
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
    test("resolves #toolkit/ alias", () => {
      expect(resolveImportPath("#toolkit/fp/memoize.js")).toBe(
        "packages/js-toolkit/fp/memoize.js",
      );
    });

    test("resolves #utils/ alias", () => {
      expect(resolveImportPath("#utils/sorting.js")).toBe(
        "src/_lib/utils/sorting.js",
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
    const testFiles = TEST_FILES().filter((f) => f !== THIS_FILE);
    const productionFiles = [...SRC_JS_FILES(), ".eleventy.js"];

    const exportsMap = new Map();
    for (const file of SRC_JS_FILES()) {
      const source = readSource(file);
      const exports = extractExports(source);
      if (exports.size > 0) exportsMap.set(file, exports);
    }

    const srcImportUsage = buildImportUsageMap(productionFiles);
    const testImportUsage = buildImportUsageMap(testFiles);

    const eleventyRegistrations = new Map();
    for (const file of SRC_JS_FILES()) {
      const source = readSource(file);
      const registered = new Set();
      for (const match of source.matchAll(ELEVENTY_REGISTRATION_PATTERN)) {
        registered.add(match[1]);
      }
      if (registered.size > 0) eleventyRegistrations.set(file, registered);
    }

    const violations = [];
    for (const [file, exports] of exportsMap) {
      const registeredInFile = eleventyRegistrations.get(file) || new Set();
      for (const exportName of exports) {
        const key = `${file}:${exportName}`;
        const usedInSrc = srcImportUsage.has(key);
        const registeredWithEleventy = registeredInFile.has(exportName);
        const usedInTest = testImportUsage.has(key);

        if (!usedInSrc && !registeredWithEleventy && usedInTest) {
          if (!ALLOWED_TEST_ONLY_EXPORTS.has(key)) {
            violations.push({
              file,
              line: 0,
              code: exportName,
              reason: `Export "${exportName}" is only imported in test files`,
              testFiles: [...testImportUsage.get(key)],
            });
          }
        }
      }
    }

    assertNoViolations(violations, {
      singular: "test-only export",
      fixHint:
        "Either unexport the function (make it private), use it in production code, or add to ALLOWED_TEST_ONLY_EXPORTS",
    });
  });

  test("ALLOWED_TEST_ONLY_EXPORTS entries are valid", () => {
    const allProductionFiles = new Set(SRC_JS_FILES());
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
      if (!allProductionFiles.has(file)) {
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
