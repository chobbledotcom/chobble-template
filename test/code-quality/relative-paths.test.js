import { describe, expect, test } from "bun:test";
import {
  ALLOWED_PROCESS_CWD,
  ALLOWED_RELATIVE_PATHS,
} from "#test/code-quality/code-quality-exceptions.js";
import {
  assertNoViolations,
  combineFileLists,
  isCommentLine,
  scanFilesForViolations,
  scanLines,
} from "#test/code-scanner.js";
import {
  ECOMMERCE_JS_FILES,
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

// Pattern for process.cwd() usage in test files
// Tests should use rootDir from test-utils.js instead for consistency
const PROCESS_CWD_PATTERN = /process\.cwd\(\)/;

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

/**
 * Analyze test files for process.cwd() usage
 * Tests should use rootDir from test-utils.js instead
 */
const analyzeProcessCwd = () => {
  const files = combineFileLists(
    [TEST_FILES],
    [THIS_FILE, ...ALLOWED_PROCESS_CWD],
  );

  return scanFilesForViolations(
    files,
    (line, lineNumber, _source, relativePath) => {
      if (isCommentLine(line)) return null;
      if (!PROCESS_CWD_PATTERN.test(line)) return null;

      return {
        file: relativePath,
        line: lineNumber,
        code: line.trim(),
      };
    },
  );
};

describe("relative-paths", () => {
  test("Correctly identifies relative imports in source code", () => {
    const source = `
import { foo } from "./utils.js";
import bar from "../lib/bar.js";
import { baz } from "#lib/baz.js";
import qux from "some-package";
    `;
    const results = findRelativeImports(source);
    expect(results.length).toBe(2);
    expect(results[0].importPath).toBe("./utils.js");
    expect(results[1].importPath).toBe("../lib/bar.js");
  });

  test("Correctly identifies path.join/resolve with '..' patterns", () => {
    const source = `
const root = path.resolve(__dirname, "..");
const logo = path.join(__dirname, "../images/logo.png");
const pages = join(__dirname, "..", "..", "pages");
const config = resolve(__dirname, "..");
const clean = path.join(__dirname, "subdir", "file.js");
const alsoClean = join(baseDir, "foo", "bar");
    `;
    const results = findRelativePathJoins(source);
    expect(results.length).toBe(4);
  });

  test("Ignores '..' patterns in comments", () => {
    const source = `
// const root = path.resolve(__dirname, "..");
/* path.join(__dirname, "..") */
const clean = path.join(__dirname, "subdir");
    `;
    const results = findRelativePathJoins(source);
    expect(results.length).toBe(0);
  });

  test("No relative imports - use path aliases (#lib/*, #test/*, etc.)", () => {
    const violations = analyzeRelativeImports();
    assertNoViolations(violations, {
      message: "relative imports",
      fixHint: 'use path aliases instead (e.g., "./foo.js" → "#lib/foo.js")',
    });
  });

  test("No path.join/resolve with '..' - use path utilities or absolute references", () => {
    const violations = analyzeRelativePathJoins();
    assertNoViolations(violations, {
      message: 'path operations with ".."',
      fixHint:
        "use path utilities from #lib/paths.js or restructure to avoid parent directory navigation",
    });
  });

  test("Test files should use rootDir from test-utils.js instead of process.cwd()", () => {
    const violations = analyzeProcessCwd();
    assertNoViolations(violations, {
      message: "process.cwd() usages in test files",
      fixHint:
        "import { rootDir } from '#test/test-utils.js' instead of using process.cwd()",
    });
  });
});
