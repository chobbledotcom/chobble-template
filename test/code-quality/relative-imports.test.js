import {
  assertNoViolations,
  combineFileLists,
  scanFilesForViolations,
  scanLines,
} from "#test/code-scanner.js";
import {
  createTestRunner,
  ECOMMERCE_JS_FILES,
  expectTrue,
  SRC_JS_FILES,
  TEST_FILES,
} from "#test/test-utils.js";

const RELATIVE_IMPORT_REGEX = /from\s+["'](\.\.[/"']|\.\/)/;
const IMPORT_PATH_REGEX = /from\s+["']([^"']+)["']/;

/**
 * Find all relative imports in a file
 */
const findRelativeImports = (source) =>
  scanLines(source, (line, lineNum) => {
    if (!RELATIVE_IMPORT_REGEX.test(line)) return null;
    const pathMatch = line.match(IMPORT_PATH_REGEX);
    return {
      lineNumber: lineNum,
      line: line.trim(),
      importPath: pathMatch ? pathMatch[1] : "unknown",
    };
  });

const THIS_FILE = "test/code-quality/relative-imports.test.js";

/**
 * Analyze all JS files for relative imports
 */
const analyzeRelativeImports = () => {
  const files = combineFileLists(
    [SRC_JS_FILES, ECOMMERCE_JS_FILES, TEST_FILES],
    [THIS_FILE],
  );

  return scanFilesForViolations(
    files,
    (line, lineNumber, _source, relativePath) => {
      const regex = /from\s+["'](\.\.[/"']|\.\/)/;
      if (!regex.test(line)) return null;

      const pathMatch = line.match(/from\s+["']([^"']+)["']/);
      return {
        file: relativePath,
        line: lineNumber,
        code: line.trim(),
        importPath: pathMatch ? pathMatch[1] : "unknown",
      };
    },
  );
};

const testCases = [
  {
    name: "find-relative-imports-in-source",
    description: "Correctly identifies relative imports in source code",
    test: () => {
      const source = `
import { foo } from "./utils.js";
import bar from "../lib/bar.js";
import { baz } from "#lib/baz.js";
import qux from "some-package";
      `;
      const results = findRelativeImports(source);
      expectTrue(
        results.length === 2,
        `Expected 2 relative imports, found ${results.length}`,
      );
      expectTrue(
        results[0].importPath === "./utils.js",
        `Expected ./utils.js, got ${results[0].importPath}`,
      );
      expectTrue(
        results[1].importPath === "../lib/bar.js",
        `Expected ../lib/bar.js, got ${results[1].importPath}`,
      );
    },
  },
  {
    name: "no-relative-imports",
    description:
      "No relative imports - use path aliases (#lib/*, #test/*, etc.)",
    test: () => {
      const violations = analyzeRelativeImports();
      assertNoViolations(expectTrue, violations, {
        message: "relative imports",
        fixHint: 'use path aliases instead (e.g., "./foo.js" → "#lib/foo.js")',
      });
    },
  },
];

createTestRunner("relative-imports", testCases);
