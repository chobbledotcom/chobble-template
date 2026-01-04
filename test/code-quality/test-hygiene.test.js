import { describe, expect, test } from "bun:test";
import { analyzeFiles, assertNoViolations } from "#test/code-scanner.js";
import {
  extractFunctions,
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
  "createCategory",
  "createProduct",
  "createCollectionItem",
  "createPropertyReviewFixture",
  // checkout.test.js - template rendering and mocks
  "renderTemplate",
  "createCheckoutPage",
  "createMockFetch",
  "mockFetch",
  "createLocationTracker",
  "withMockStorage",
  // function-length.test.js - analysis helpers
  "calculateOwnLines",
  "analyzeFunctionLengths",
  "formatViolations",
  // let-usage.test.js - analysis helpers
  "findMutableVarDeclarations",
  "analyzeMutableVarUsage",
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
  "analyzeTestFiles",
  // unused-classes.test.js - analysis helpers
  "extractFromHtml",
  "extractClassesFromJs",
  "findIdReferencesInHtml",
  "findSelectorReferencesInScss",
  "findReferencesInJs",
  "collectAllClassesAndIds",
  "findUnusedClassesAndIds",
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
  // code-scanner.js - code scanning utilities
  "matchesAny",
  "isCommentLine",
  "readSource",
  "toLines",
  "excludeFiles",
  "combineFileLists",
  "scanLines",
  "findPatterns",
  "analyzeFiles",
  "scanFilesForViolations",
  "formatViolationReport",
  "assertNoViolations",
  "createPatternMatcher",
  "validateExceptions",
  "analyzeWithAllowlist",
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
  // short-circuit-order.test.js - analysis helpers
  "buildPattern",
  "hasSuboptimalOrder",
  "findSuboptimalOrder",
  "analyzeShortCircuitOrder",
]);

// Pattern to identify true function declarations (not methods or callbacks)
const DECLARATION_PATTERN =
  /^\s*(?:export\s+)?(?:const|let|var|(?:async\s+)?function)\s+/;

/**
 * Analyze test files for non-whitelisted functions.
 * Only functions in ALLOWED_TEST_FUNCTIONS are permitted in test files.
 * All other function definitions are flagged - tests should import real code.
 * Filters to only top-level declarations (const/let/var/function), ignoring
 * object methods and callbacks which are typically test fixtures.
 */
const analyzeTestFiles = () => {
  return analyzeFiles(TEST_FILES(), (source, relativePath) => {
    const lines = source.split("\n");
    const functions = extractFunctions(source);
    const violations = [];

    for (const func of functions) {
      // Only check actual declarations (const/let/var/function), not methods
      const sourceLine = lines[func.startLine - 1] || "";
      if (!DECLARATION_PATTERN.test(sourceLine)) continue;

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
