import { describe, expect, test } from "bun:test";
import { ALLOWED_PROCESS_CWD } from "#test/code-quality/code-quality-exceptions.js";
import { assertNoViolations, createCodeChecker } from "#test/code-scanner.js";
import { ALL_JS_FILES, TEST_FILES } from "#test/test-utils.js";

const THIS_FILE = "test/code-quality/relative-paths.test.js";
const IMPORT_PATH_REGEX = /from\s+["']([^"']+)["']/;

describe("relative-paths", () => {
  // Create checkers inside describe block to ensure imports are resolved
  const testInfrastructureFiles = [
    "test/test-utils.js",
    "test/test-site-factory.js",
    "test/run-coverage.js",
    "test/build-profiling.js",
    "test/code-scanner.js",
    "test/setup.js",
  ];

  const { find: findRelativeImports, analyze: analyzeRelativeImports } =
    createCodeChecker({
      patterns: /from\s+["'](\.\.[/"']|\.\/)/,
      skipPatterns: [], // Check all lines
      extractData: (line) => {
        const pathMatch = line.match(IMPORT_PATH_REGEX);
        return { importPath: pathMatch ? pathMatch[1] : "unknown" };
      },
      files: ALL_JS_FILES(),
      excludeFiles: [THIS_FILE, ...testInfrastructureFiles],
    });

  const { find: findRelativePathJoins, analyze: analyzeRelativePathJoins } =
    createCodeChecker({
      patterns: /(?:path\.)?(join|resolve)\s*\([^)]*["']\.\.["'/]/,
      // skipPatterns defaults to COMMENT_LINE_PATTERNS
      files: ALL_JS_FILES(),
      excludeFiles: [
        THIS_FILE,
        "src/_lib/paths.js",
        ...testInfrastructureFiles,
      ],
    });

  const { analyze: analyzeProcessCwd } = createCodeChecker({
    patterns: /process\.cwd\(\)/,
    // skipPatterns defaults to COMMENT_LINE_PATTERNS
    files: TEST_FILES(),
    excludeFiles: [THIS_FILE, ...ALLOWED_PROCESS_CWD],
  });

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
    const { violations } = analyzeRelativeImports();
    assertNoViolations(violations, {
      message: "relative imports",
      fixHint: 'use path aliases instead (e.g., "./foo.js" → "#lib/foo.js")',
    });
  });

  test("No path.join/resolve with '..' - use path utilities or absolute references", () => {
    const { violations } = analyzeRelativePathJoins();
    assertNoViolations(violations, {
      message: 'path operations with ".."',
      fixHint:
        "use path utilities from #lib/paths.js or restructure to avoid parent directory navigation",
    });
  });

  test("Test files should use rootDir from test-utils.js instead of process.cwd()", () => {
    const { violations } = analyzeProcessCwd();
    assertNoViolations(violations, {
      message: "process.cwd() usages in test files",
      fixHint:
        "import { rootDir } from '#test/test-utils.js' instead of using process.cwd()",
    });
  });
});
