import { ALLOWED_RELATIVE_PATHS } from "#test/code-quality/code-quality-exceptions.js";
import {
  assertNoViolations,
  combineFileLists,
  isCommentLine,
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

// Pattern for relative imports: from "./" or from "../"
const RELATIVE_IMPORT_REGEX = /from\s+["'](\.\.[/"']|\.\/)/;
const IMPORT_PATH_REGEX = /from\s+["']([^"']+)["']/;

// Patterns for path joining with ".." - catches path.join(), path.resolve(), join(), resolve()
// Matches: path.join(__dirname, ".."), join(foo, "..", "bar"), resolve(__dirname, "..")
// Also matches: path.join(__dirname, "../images/logo.png") with ".." at start of path segment
const PATH_JOIN_WITH_DOTDOT =
  /(?:path\.)?(join|resolve)\s*\([^)]*["']\.\.["'/]/;

const THIS_FILE = "test/code-quality/relative-paths.test.js";

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

/**
 * Find path operations that use ".." to navigate up directories
 */
const findRelativePathJoins = (source) =>
  scanLines(source, (line, lineNum) => {
    if (isCommentLine(line)) return null;
    if (!PATH_JOIN_WITH_DOTDOT.test(line)) return null;
    return {
      lineNumber: lineNum,
      line: line.trim(),
    };
  });

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
      if (!RELATIVE_IMPORT_REGEX.test(line)) return null;

      const pathMatch = line.match(IMPORT_PATH_REGEX);
      return {
        file: relativePath,
        line: lineNumber,
        code: line.trim(),
        importPath: pathMatch ? pathMatch[1] : "unknown",
      };
    },
  );
};

/**
 * Analyze all JS files for path.join/resolve with ".." patterns
 */
const analyzeRelativePathJoins = () => {
  const files = combineFileLists(
    [SRC_JS_FILES, ECOMMERCE_JS_FILES, TEST_FILES],
    [THIS_FILE, ...ALLOWED_RELATIVE_PATHS],
  );

  return scanFilesForViolations(
    files,
    (line, lineNumber, _source, relativePath) => {
      if (isCommentLine(line)) return null;
      if (!PATH_JOIN_WITH_DOTDOT.test(line)) return null;

      return {
        file: relativePath,
        line: lineNumber,
        code: line.trim(),
      };
    },
  );
};

const testCases = [
  // Unit tests for the detection functions
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
    name: "find-path-join-with-dotdot",
    description: "Correctly identifies path.join/resolve with '..' patterns",
    test: () => {
      const source = `
const root = path.resolve(__dirname, "..");
const logo = path.join(__dirname, "../images/logo.png");
const pages = join(__dirname, "..", "..", "pages");
const config = resolve(__dirname, "..");
const clean = path.join(__dirname, "subdir", "file.js");
const alsoClean = join(baseDir, "foo", "bar");
      `;
      const results = findRelativePathJoins(source);
      expectTrue(
        results.length === 4,
        `Expected 4 path violations, found ${results.length}: ${JSON.stringify(results)}`,
      );
    },
  },
  {
    name: "skip-comments",
    description: "Ignores '..' patterns in comments",
    test: () => {
      const source = `
// const root = path.resolve(__dirname, "..");
/* path.join(__dirname, "..") */
const clean = path.join(__dirname, "subdir");
      `;
      const results = findRelativePathJoins(source);
      expectTrue(
        results.length === 0,
        `Expected 0 violations (comments should be skipped), found ${results.length}`,
      );
    },
  },
  // Enforcement tests
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
  {
    name: "no-path-join-with-dotdot",
    description:
      "No path.join/resolve with '..' - use path utilities or absolute references",
    test: () => {
      const violations = analyzeRelativePathJoins();
      assertNoViolations(expectTrue, violations, {
        message: 'path operations with ".."',
        fixHint:
          "use path utilities from #lib/paths.js or restructure to avoid parent directory navigation",
      });
    },
  },
];

createTestRunner("relative-paths", testCases);
