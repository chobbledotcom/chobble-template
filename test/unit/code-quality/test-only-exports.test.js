/**
 * Detects exports from src/ that are only imported in test/ files.
 *
 * When a function is exported but only ever imported in test/,
 * it suggests the tests are testing implementation details rather than
 * the public API. These exports should either:
 * - Be made private (unexported) if they're truly internal
 * - Be used in production code if they're valuable utilities
 * Existing ALLOWED_TEST_ONLY_EXPORTS entries are a deletion-only legacy baseline.
 */
import { describe, expect, test } from "vitest";
import { ALLOWED_TEST_ONLY_EXPORTS } from "#test/code-quality/code-quality-exceptions.js";
import {
  assertNoViolations,
  extractExports,
  readSource,
} from "#test/code-scanner.js";
import { SCRIPT_JS_FILES, SRC_JS_FILES, TEST_FILES } from "#test/test-utils.js";
import { unique } from "#utils/fp/array.js";

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
  "#eleventy/": "src/_lib/eleventy/",
  "#build/": "src/_lib/build/",
  "#media/": "src/_lib/media/",
  "#utils/": "src/_lib/utils/",
  "#public/": "src/_lib/public/",
  "#test/": "test/",
  "#scripts/": "scripts/",
  "#bin/": "bin/",
  // NOTE: #transforms/ is deliberately absent for
  // now: resolving them makes this gate see the transform test suites'
  // white-box imports, which need their own refactor before the gate can
  // cover them without an allowlist.
};

/**
 * Resolve an import path to a relative file path.
 * @param {string} importPath - The import path (e.g., "#utils/fp/memoize.js")
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
//
// Matched patterns:
//   eleventyConfig.addFilter("name", functionRef)
//   eleventyConfig.addCollection("name", functionRef)
//   addDataFilter(eleventyConfig, "name", functionRef)
//   … and addAsyncFilter, addShortcode, addAsyncShortcode, addTransform
const IDENTIFIER = "[a-zA-Z_$][a-zA-Z0-9_$]*";
const QUOTED_STRING = `["'][^"']+["']`;
const ELEVENTY_METHODS =
  "addFilter|addAsyncFilter|addShortcode|addAsyncShortcode|addCollection|addTransform";
const ELEVENTY_REGISTRATION_PATTERN = new RegExp(
  [
    // eleventyConfig.addFilter("name", fn)  OR  addDataFilter(config, "name", fn)
    `(?:eleventyConfig\\.(?:${ELEVENTY_METHODS})\\s*\\(\\s*${QUOTED_STRING}`,
    `|addDataFilter\\s*\\(\\s*\\w+\\s*,\\s*${QUOTED_STRING})`,
    // … then capture the function reference
    `\\s*,\\s*(${IDENTIFIER})`,
  ].join(""),
  "g",
);

// Matches the registerFilters map form used by configure* modules:
//   registerFilters(eleventyConfig)({ shorthand, key: implementation, ... })
// and captures the implementation references, which would otherwise be
// invisible to the addFilter("name", fn) pattern above.
const REGISTER_FILTERS_PATTERN =
  /registerFilters\s*\([^)]*\)\s*\(\s*\{([\s\S]*?)\}/g;

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
const extractImports = (source) =>
  [...source.matchAll(IMPORT_PATTERN)].flatMap((match) => {
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

    return names.length > 0 ? [{ names, path: importPath, resolvedPath }] : [];
  });

/**
 * Build a map tracking where each export is imported from.
 * @param {string[]} files - Files to scan for imports
 * @returns {Map<string, {key: string, file: string}[]>} - Map of "file:export" to importing entries
 */
const buildImportUsageMap = (files, loadSource = readSource) =>
  Map.groupBy(
    files.flatMap((file) =>
      extractImports(loadSource(file)).flatMap(({ names, resolvedPath }) =>
        (resolvedPath ? names : []).map((name) => ({
          key: `${resolvedPath}:${name}`,
          file,
        })),
      ),
    ),
    (entry) => entry.key,
  );

// ============================================
// Tests
// ============================================

describe("test-only-exports", () => {
  test("groups import usages by source export without losing locations", () => {
    const sources = {
      "test/first.js":
        'import { shared } from "#utils/shared.js";\nimport { other } from "#utils/shared.js";',
      "test/second.js": 'import { shared } from "#utils/shared.js";',
    };
    const usage = buildImportUsageMap(
      Object.keys(sources),
      (file) => sources[file],
    );
    expect([...usage]).toEqual([
      [
        "src/_lib/utils/shared.js:shared",
        [
          { key: "src/_lib/utils/shared.js:shared", file: "test/first.js" },
          { key: "src/_lib/utils/shared.js:shared", file: "test/second.js" },
        ],
      ],
      [
        "src/_lib/utils/shared.js:other",
        [{ key: "src/_lib/utils/shared.js:other", file: "test/first.js" }],
      ],
    ]);
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

    test("finds export default", () => {
      const source = `
function main() {}
export default main;
`;
      const exports = extractExports(source);
      expect(exports.has("main")).toBe(true);
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
    test("resolves #utils/fp/ alias", () => {
      expect(resolveImportPath("#utils/fp/memoize.js")).toBe(
        "src/_lib/utils/fp/memoize.js",
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
      expect(resolveImportPath("node:test")).toBe(null);
      expect(resolveImportPath("fs")).toBe(null);
    });
  });

  test("No test-only exports outside allowlist", () => {
    const testFiles = TEST_FILES().filter((f) => f !== THIS_FILE);
    const productionFiles = [
      ...SRC_JS_FILES(),
      ...SCRIPT_JS_FILES(),
      ".eleventy.js",
    ];

    const srcExports = SRC_JS_FILES().flatMap((file) => {
      const exports = extractExports(readSource(file));
      return exports.size > 0 ? [{ file, exports }] : [];
    });

    const srcImportUsage = buildImportUsageMap(productionFiles);
    const testImportUsage = buildImportUsageMap(testFiles);

    // File -> names registered via Eleventy (addFilter, addShortcode, ...)
    const eleventyRegistrations = Object.fromEntries(
      SRC_JS_FILES()
        .map((file) => [
          file,
          unique([
            ...[
              ...readSource(file).matchAll(ELEVENTY_REGISTRATION_PATTERN),
            ].map((match) => match[1]),
            // Map form: named entries (`key: implementation`) and shorthands
            ...readSource(file)
              .matchAll(REGISTER_FILTERS_PATTERN)
              .flatMap((match) =>
                unique([
                  ...[...match[1].matchAll(/:\s*([A-Za-z_$][\w$]*)/g)].map(
                    (ref) => ref[1],
                  ),
                  ...[
                    ...match[1].matchAll(
                      /(?:^|,)\s*([A-Za-z_$][\w$]*)\s*(?=,|$|\})/g,
                    ),
                  ].map((ref) => ref[1]),
                ]),
              ),
          ]),
        ])
        .filter(([, registered]) => registered.length > 0),
    );

    const violations = srcExports.flatMap(({ file, exports }) =>
      [...exports].flatMap((exportName) => {
        const key = `${file}:${exportName}`;
        const usedInSrc = srcImportUsage.has(key);
        const registeredWithEleventy = (
          eleventyRegistrations[file] ?? []
        ).includes(exportName);
        const usedInTest = testImportUsage.has(key);

        return !usedInSrc &&
          !registeredWithEleventy &&
          usedInTest &&
          !ALLOWED_TEST_ONLY_EXPORTS.has(key)
          ? [
              {
                file,
                line: 0,
                code: exportName,
                reason: `Export "${exportName}" is only imported in test files`,
                testFiles: unique(
                  (testImportUsage.get(key) ?? []).map((entry) => entry.file),
                ),
              },
            ]
          : [];
      }),
    );

    assertNoViolations(violations, {
      singular: "test-only export",
      fixHint:
        "Either unexport the function (make it private) or use it in production code - the ALLOWED_TEST_ONLY_EXPORTS baseline is deletion-only",
    });
  });

  test("ALLOWED_TEST_ONLY_EXPORTS entries are valid", () => {
    const allProductionFiles = SRC_JS_FILES();

    const invalid = [...ALLOWED_TEST_ONLY_EXPORTS].flatMap((entry) => {
      const [file, exportName] = entry.split(":");
      if (!file || !exportName) {
        return [{ entry, reason: "Invalid format (expected file:export)" }];
      }
      if (!allProductionFiles.includes(file)) {
        return [{ entry, reason: `File not found: ${file}` }];
      }

      // Verify the export exists in the file
      const exports = extractExports(readSource(file));
      return exports.has(exportName)
        ? []
        : [{ entry, reason: `Export "${exportName}" not found in ${file}` }];
    });

    if (invalid.length > 0) {
      console.log("\n  Invalid ALLOWED_TEST_ONLY_EXPORTS entries:");
      for (const { entry, reason } of invalid) {
        console.log(`    - ${entry}: ${reason}`);
      }
    }

    expect(invalid.length).toBe(0);
  });
});
