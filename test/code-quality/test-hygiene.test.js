import { describe, expect, test } from "bun:test";
import { analyzeFiles, assertNoViolations } from "#test/code-scanner.js";
import {
  SRC_HTML_FILES,
  SRC_JS_FILES,
  SRC_SCSS_FILES,
  TEST_FILES,
} from "#test/test-utils.js";

// Allowed function names in test files (utilities, not production logic)
const ALLOWED_TEST_FUNCTIONS = new Set([
  // Test utilities from test-utils.js pattern
  "execScript",
  "createMockEleventyConfig",
  "createTempDir",
  "createTempFile",
  "createTempSnippetsDir",
  "cleanupTempDir",
  "withTempDir",
  "withTempFile",
  "withMockedCwd",
  // Fixture factories
  "createOffsetDate",
  "formatDateString",
  "createEvent",
  "createFutureEvent",
  "createPastEvent",
  "createRecurringEvent",
  "createCategory",
  "createProduct",
  "createCollectionItem",
  "createPropertyReviewFixture",
  // Assertion helpers
  "expectFunctionType",
  "expectArrayLength",
  "expectObjectProperty",
  "expectDeepEqual",
  "expectStrictEqual",
  "expectTrue",
  "expectFalse",
  "expectThrows",
  // checkout.test.js - template rendering and mocks
  "renderTemplate",
  "createCheckoutPage",
  "createMockFetch",
  "mockFetch",
  "createLocationTracker",
  "withMockStorage",
  // function-length.test.js - analysis helpers
  "extractFunctions",
  "calculateOwnLines",
  "analyzeFunctionLengths",
  "formatViolations",
  // let-usage.test.js - analysis helpers
  "findMutableVarDeclarations",
  "isAllowedLetPattern",
  "analyzeMutableVarUsage",
  "isMutableConstPattern",
  "findMutableConstDeclarations",
  "analyzeMutableConstUsage",
  // naming-conventions.test.js - analysis helpers
  "countCamelCaseWords",
  "extractCamelCaseIdentifiers",
  "analyzeNamingConventions",
  // scss.variables.test.js
  "extractUsedVariables",
  "extractDefinedVariables",
  "extractAllDefinedVariables",
  "findUndefinedVariables",
  // strings.test.js
  "findStringsUsage",
  // test-hygiene.test.js - self-analysis helpers
  "extractFunctionDefinitions",
  "analyzeTestFiles",
  // unused-classes.test.js - analysis helpers
  "extractClassesFromHtml",
  "extractIdsFromHtml",
  "extractClassesFromJs",
  "findIdReferencesInHtml",
  "findSelectorReferencesInScss",
  "findClassReferencesInJs",
  "findIdReferencesInJs",
  "collectAllClassesAndIds",
  "findUnusedClassesAndIds",
  // function-length.test.js - test fixture strings (parsed as examples, not real code)
  "hello",
  "greet",
  "fetchData",
  "test",
  // naming-conventions.test.js - test fixture string
  "getUserById",
  // try-catch-usage.test.js - analysis helpers
  "findTryCatches",
  "analyzeTryCatchUsage",
  // commented-code.test.js - analysis helpers
  "isInsideTemplateLiteral",
  "isDocumentationComment",
  "findCommentedCode",
  "analyzeCommentedCode",
  // commented-code.test.js - test fixture strings
  "active",
  // autosizes.test.js - helper to inject PerformanceObserver mock
  "createPerformanceObserverScript",
  // autosizes.test.js - test environment setup helpers
  "createTestEnv",
  "runAutosizes",
  "makeImg",
  // unused-classes.test.js - helper to add classes from string
  "addClasses",
  // unused-classes.test.js - helper to add items to Map
  "addToMap",
  // unused-classes.test.js - helper to log unused items
  "logUnused",
  // html-in-js.test.js - analysis helpers
  "isCommentLine",
  "extractStringContent",
  "containsHtml",
  "findHtmlInJs",
  "analyzeHtmlInJs",
  // template-selectors.test.js - analysis helpers
  "buildLiquidLookup",
  "expandLiquidVars",
  "loadTemplate",
  // layout-aliases.test.js - test helper
  "withTempLayouts",
  // test-quality.test.js - analysis helpers
  "extractTestCases",
  "extractDescribeItTests",
  "extractTestNames",
  "findVagueTestNames",
  "findMultiConcernTestNames",
  "findAsyncTestsWithoutAwait",
  "findAssertionsWithoutMessages",
  "findTautologicalAssertions",
  // pdf-integration.test.js - PDF output helpers
  "findPdfInMenuDir",
  "verifyPdfHeader",
  // reviews.test.js - test fixtures helpers
  "createReviews",
  "createMockCollectionApi",
  "createProduct",
  // code-scanner.js - code scanning utilities
  "readSource",
  "toLines",
  "excludeFiles",
  "combineFileLists",
  "matchAny",
  "scanLines",
  "findPatterns",
  "analyzeFiles",
  "scanFilesForViolations",
  "formatViolationReport",
  "assertNoViolations",
  "createPatternMatcher",
  "validateExceptions",
  // unused-images.test.js - test helper
  "runUnusedImagesTest",
  // template.test.js - isolated DOM testing helpers
  "getTemplate",
  "populateItemFields",
  "populateQuantityControls",
  // data-exports.test.js - analysis helpers
  "hasProblematicNamedExports",
  "hasWrongHelperName",
  // method-aliasing.test.js - analysis helpers
  "parseAlias",
  "findAliases",
  "analyzeMethodAliasing",
]);

/**
 * Extract function definitions from source code.
 * Returns array of { name, lineCount, startLine }
 */
const extractFunctionDefinitions = (source) => {
  const functions = [];
  const lines = source.split("\n");

  // Patterns for function definitions
  const patterns = [
    // const name = (args) => { ... }
    /^(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s*)?\([^)]*\)\s*=>\s*\{/,
    // const name = function(args) { ... }
    /^(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s*)?function\s*\([^)]*\)\s*\{/,
    // function name(args) { ... }
    /^(?:async\s+)?function\s+(\w+)\s*\([^)]*\)\s*\{/,
  ];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    for (const pattern of patterns) {
      const match = line.match(pattern);
      if (match) {
        const name = match[1];
        // Count lines until closing brace (simple heuristic)
        let braceCount = 1;
        let endLine = i;
        for (let j = i + 1; j < lines.length && braceCount > 0; j++) {
          const checkLine = lines[j];
          braceCount += (checkLine.match(/\{/g) || []).length;
          braceCount -= (checkLine.match(/\}/g) || []).length;
          endLine = j;
        }
        functions.push({
          name,
          lineCount: endLine - i + 1,
          startLine: i + 1,
        });
        break;
      }
    }
  }

  return functions;
};

/**
 * Analyze test files for non-whitelisted functions.
 * Only functions in ALLOWED_TEST_FUNCTIONS are permitted in test files.
 * All other function definitions are flagged - tests should import real code.
 */
const analyzeTestFiles = () => {
  return analyzeFiles(TEST_FILES(), (source, relativePath) => {
    const functions = extractFunctionDefinitions(source);
    const violations = [];

    for (const func of functions) {
      if (!ALLOWED_TEST_FUNCTIONS.has(func.name)) {
        violations.push({
          file: relativePath,
          line: func.startLine,
          code: func.name,
          reason: `Function "${func.name}" is not whitelisted`,
        });
      }
    }
    return violations;
  });
};

describe("test-hygiene", () => {
  test("Pre-computed file lists contain files", () => {
    expect(SRC_JS_FILES().length).toBeGreaterThan(0);
    expect(SRC_HTML_FILES().length).toBeGreaterThan(0);
    expect(SRC_SCSS_FILES().length).toBeGreaterThan(0);
    expect(TEST_FILES().length).toBeGreaterThan(0);
  });

  test("Test files should not contain production logic - only test and import real code", () => {
    const issues = analyzeTestFiles();
    assertNoViolations(issues, {
      message: "non-whitelisted function(s) in test files",
      fixHint: "add to ALLOWED_TEST_FUNCTIONS or import from source",
    });
  });

  test("Correctly extracts arrow function definitions", () => {
    const source = `const myFunc = (a, b) => {\n  return a + b;\n};`;
    const funcs = extractFunctionDefinitions(source);
    expect(funcs.length).toBe(1);
    expect(funcs[0].name).toBe("myFunc");
  });

  test("Correctly extracts regular function definitions", () => {
    const source = `function doSomething(x) {\n  console.log(x);\n}`;
    const funcs = extractFunctionDefinitions(source);
    expect(funcs.length).toBe(1);
    expect(funcs[0].name).toBe("doSomething");
  });

  test("Correctly extracts async function definitions", () => {
    const source = `const fetchData = async (url) => {\n  return await fetch(url);\n};`;
    const funcs = extractFunctionDefinitions(source);
    expect(funcs.length).toBe(1);
    expect(funcs[0].name).toBe("fetchData");
  });

  test("ALLOWED_TEST_FUNCTIONS entries are defined in test files", () => {
    // Include test files AND test infrastructure files
    const allTestFiles = [
      ...TEST_FILES(),
      "test/test-utils.js",
      "test/test-site-factory.js",
      "test/code-scanner.js",
    ];

    // Combine all test file sources
    const allTestSource = analyzeFiles(allTestFiles, (source) => source).join(
      "\n",
    );

    // Find allowlisted functions that aren't defined anywhere in test files
    // Look for common definition patterns: const/let/var/function name, or : name (destructuring)
    const stale = [...ALLOWED_TEST_FUNCTIONS].filter((name) => {
      const patterns = [
        new RegExp(`\\bconst\\s+${name}\\s*=`),
        new RegExp(`\\blet\\s+${name}\\s*=`),
        new RegExp(`\\bvar\\s+${name}\\s*=`),
        new RegExp(`\\bfunction\\s+${name}\\s*\\(`),
        new RegExp(`:\\s*${name}\\s*[,}\\)]`), // destructuring: { x: name } or (name)
      ];
      return !patterns.some((p) => p.test(allTestSource));
    });

    if (stale.length > 0) {
      console.log("\n  Stale ALLOWED_TEST_FUNCTIONS entries:");
      for (const name of stale) {
        console.log(`    - ${name}`);
      }
    }

    expect(stale.length).toBe(0);
  });
});
