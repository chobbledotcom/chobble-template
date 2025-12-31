import {
  createTestRunner,
  ECOMMERCE_JS_FILES,
  expectTrue,
  fs,
  path,
  rootDir,
  SRC_JS_FILES,
  TEST_FILES,
} from "#test/test-utils.js";

/**
 * Find all relative imports in a file
 * Returns array of { lineNumber, line, importPath }
 */
const findRelativeImports = (source) => {
  const results = [];
  const lines = source.split("\n");

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Match import statements with relative paths
    // Captures: from "./something" or from "../something" or from '../../something'
    const regex = /from\s+["'](\.\.[/"']|\.\/)/g;

    if (regex.test(line)) {
      // Extract the actual import path
      const pathMatch = line.match(/from\s+["']([^"']+)["']/);
      const importPath = pathMatch ? pathMatch[1] : "unknown";

      results.push({
        lineNumber: i + 1,
        line: line.trim(),
        importPath,
      });
    }
  }

  return results;
};

/**
 * Analyze all JS files for relative imports
 */
const analyzeRelativeImports = () => {
  const violations = [];

  // Exclude this test file since it contains examples in test strings
  const allJsFiles = [
    ...SRC_JS_FILES,
    ...ECOMMERCE_JS_FILES,
    ...TEST_FILES,
  ].filter((f) => f !== "test/code-quality/relative-imports.test.js");

  for (const relativePath of allJsFiles) {
    const fullPath = path.join(rootDir, relativePath);
    const source = fs.readFileSync(fullPath, "utf-8");
    const relativeImports = findRelativeImports(source);

    for (const ri of relativeImports) {
      violations.push({
        file: relativePath,
        line: ri.lineNumber,
        code: ri.line,
        importPath: ri.importPath,
      });
    }
  }

  return violations;
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

      if (violations.length > 0) {
        console.log(`\n  Found ${violations.length} relative imports:`);
        for (const v of violations) {
          console.log(`     - ${v.file}:${v.line}`);
          console.log(`       ${v.importPath}`);
        }
        console.log("\n  To fix: use path aliases instead of relative paths");
        console.log("  Examples:");
        console.log('    "./foo.js" → "#lib/foo.js" or "#test/foo.js"');
        console.log(
          '    "../utils.js" → "#lib/utils.js" or "#utils/file.js"\n',
        );
      }

      expectTrue(
        violations.length === 0,
        `Found ${violations.length} relative imports. See list above.`,
      );
    },
  },
];

createTestRunner("relative-imports", testCases);
