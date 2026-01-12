import { describe, expect, test } from "bun:test";
import {
  analyzeFiles,
  assertNoViolations,
  createViolation,
} from "#test/code-scanner.js";
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
  "createObjectBuilder",
  "captureConsole",
  "execScript",
  "createMockEleventyConfig",
  "createTempDir",
  "createTempFile",
  "createTempSnippetsDir",
  "cleanupTempDir",
  "withTempDir",
  "withTempFile",
  "withMockedCwd",
  "withMockedConsole",
  "withAssetDir",
  "expectValidScriptTag",
  // Fixture factories
  "createProduct",
  "createPropertyReviewFixture",
  // events-utils.js - event fixture factories and assertion helpers
  "expectEventCounts",
  "expectShowState",
  "createOffsetDate",
  "formatDateString",
  "createEvent",
  "createEvents",
  // schema-helper-utils.js - schema fixture builders
  "addOptionalProps",
  "createSchemaPage",
  "createSchemaSite",
  "createSchemaData",
  "createProductSchemaData",
  "createPostSchemaData",
  "createMockReview",
  // quote-steps.test.js - test fixture factory and assertion helpers
  "createQuoteStepsHtml",
  "testNextButtonStep",
  "testIndicatorStates",
  "testValidateFieldWithHtml",
  // quote-price-utils.test.js - DOM setup and template rendering
  "setupFullDOM",
  "setupBlurTestDOM",
  "renderQuotePriceTemplates",
  // theme-editor.test.js - functional test helpers
  "roundTripTheme",
  "testScopedEntry",
  // item-filters.test.js - mock eleventy config with getters
  "mockConfig",
  // item-filters.test.js - preset config factory
  "itemsConfig",
  // checkout.test.js - template rendering and mocks
  "renderTemplate",
  "createCheckoutPage",
  "createMockFetch",
  "mockFetch",
  "createLocationTracker",
  "withMockStorage",
  // config.test.js - frontmatter validation helpers
  "testFrontmatterFieldThrows",
  // responsive-tables.test.js - assertion helpers
  "testScrollableTableCount",
  // autosizes.test.js - integration test helpers
  "testRemoteUrlNotProcessed",
  // code-scanner.test.js - matcher assertion helpers
  "testMatcherResult",
  // function-length.test.js - analysis helpers
  "calculateOwnLines",
  "analyzeFunctionLengths",
  "formatViolations",
  // let-usage.test.js - analysis helpers
  "findMutableVarDeclarations",
  "findMutableConstDeclarations",
  // naming-conventions.test.js - analysis helpers
  "countCamelCaseWords",
  "extractCamelCaseIdentifiers",
  "analyzeNamingConventions",
  // scss.variables.test.js
  "extractUsedVariables",
  "extractDefinedVariables",
  // code-scanner.js - stale exception validation helper
  "expectNoStaleExceptions",
  // code-scanner.js - export detection utility
  "extractExports",
  // design-system-scoping.test.js - SCSS analysis helpers
  "findUnscopedSelectors",
  "hasDesignSystemWrapper",
  // test-only-exports.test.js - analysis helpers
  "resolveImportPath",
  "extractImports",
  "buildSrcExportsMap",
  "buildImportUsageMap",
  "analyzeTestOnlyExports",
  // test-only-exports.test.js - test fixture source code strings (parser test data)
  "foo",
  "a",
  "b",
  "c",
  "original",
  // feed.test.js - test site factory
  "setupTestSiteWithFeed",
  // quote-steps.test.js - navigation test setup
  "setupQuoteStepsNav",
  // hire-calculator.test.js - callback tracking setup
  "initHireWithCallback",
  // unused-images.test.js - eleventy after handler runner
  "runEleventyAfter",
  "findUndefinedVariables",
  // strings.test.js
  "findStringsUsage",
  // test-hygiene.test.js - self-analysis helpers
  "nonWhitelistedViolation",
  "analyzeTestFiles",
  // unused-classes.test.js - analysis helpers
  "extractFromHtml",
  "extractClassesFromJs",
  "findSelectorReferencesInScss",
  "findReferencesInJs",
  // naming-conventions.test.js - test fixture string
  "getUserById",
  // schema-helper.test.js - test fixtures
  "testProductMeta",
  // try-catch-usage.test.js - analysis helpers
  "findTryCatches",
  "tryBlockHasCatch",
  // commented-code.test.js - analysis helpers
  "findCommentedCode",
  // commented-code.test.js - test fixture strings
  "active",
  // autosizes.test.js - helper to inject PerformanceObserver mock
  "createPerformanceObserverScript",
  // autosizes.test.js - test environment setup helpers
  "createTestEnv",
  "runAutosizes",
  "makeImg",
  "setupAndRun",
  // html-in-js.test.js - analysis helpers
  "extractStringContent",
  "findHtmlInJs",
  // template-selectors.test.js - analysis helpers
  "loadTemplate",
  // layout-aliases.test.js - test helpers
  "withTempLayouts",
  "runLayoutAliases",
  // test-quality.test.js - analysis helpers
  "extractTestNames",
  "findVagueTestNames",
  "findMultiConcernTestNames",
  "findAsyncTestsWithoutAwait",
  "findAssertionsWithoutMessages",
  "findTautologiesInSource",
  "findTautologicalAssertions",
  // pdf-integration.test.js - PDF output helpers
  "findPdfInMenuDir",
  "verifyPdfHeader",
  // reviews.test.js - test fixtures helpers
  "itemsFor",
  "createProductReviews",
  "createTruncatePair",
  "createLimitTestData",
  // test-site-factory.test.js - test page fixtures
  "minimalPage",
  "testPage",
  // recurring-events.test.js - test fixtures and helpers
  "event",
  "renderAndParse",
  // array-utils.test.js - test fixtures
  "testTruncatedList",
  // tags.test.js - test fixtures
  "testTagExtraction",
  // function-length.test.js - test fixtures
  "testSource",
  // code-scanner.test.js - test fixtures
  "testStaleException",
  // code-quality-utils.js - logging helper
  "logAllowedItems",
  // build-profiling.js - profiling helper
  "profileScript",
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
  "createViolation",
  "validateExceptions",
  "analyzeWithAllowlist",
  "createCodeChecker",
  // unused-images.test.js - test helper
  "runUnusedImagesTest",
  // method-aliasing.test.js - analysis helpers
  "findAliases",
  // short-circuit-order.test.js - analysis helpers
  "findSuboptimalOrder",
  // image.test.js - functional test helpers
  "expectPassthrough",
  "expectIncludes",
  "runTransform",
  // news.test.js - functional test fixture builders
  "newsPost",
  "teamMember",
  "getPostMeta",
  "getContentHtml",
  "extractImages",
  "expectAuthorElements",
  "expectTimeElement",
  "expectMetaStructure",
  // navigation.test.js - functional test fixture builders
  "pageItem",
  "expectFindsTarget",
  "navItem",
  "navItems",
  "navCollectionApi",
  "withNavigation",
  // test-site-factory.js - test site utilities
  "randomId",
  "ensureDir",
  "symlinkDirs",
  "setupDataDir",
  "createContentFiles",
  "ensureIndexPage",
  "normalizeImageSpec",
  "copyTestImages",
  "createSiteObject",
  "createTestSite",
  "withTestSite",
  "cleanupAllTestSites",
  "copyDirFiles",
  "copy11tyDataFiles",
  "copyToDir",
  "createMarkdownFile",
  "extractCollections",
  "getCachedDirExists",
  "getCachedDirList",
  "getCollection",
  "hasExtension",
  "inDir",
  "listFilesRecursive",
  "writeJsonToDir",
  "writeToDir",
  "rootDir",
  // build-profiling.js - performance profiling utilities
  "profileNodeStartup",
  "profileConfigImports",
  "profileSingleImport",
  "profileBuild",
  "hrtimeToMs",
  "profileScript",
  // test-runner-utils.js / precommit.js - test runner utilities
  "runStep",
  "extractErrorsFromOutput",
  "printSummary",
  // test-runner-utils.test.js - test fixture factories
  "createBasicSteps",
  "createResults",
  "captureSummaryOutput",
  "createThreeSteps",
  "createBunScriptStep",
  "createBuildTestOutput",
  // precommit.test.js - functional test helper
  "expectErrorsToInclude",
  // test-utils.js - test utilities (internal functions)
  "walk",
  "getFiles",
  "captureConsoleLogAsync",
  "expectResultTitles",
  "expectArrayProp",
  "expectProp",
  "expectDataArray",
  "expectGalleries",
  "handleOpeningBrace",
  "handleClosingBrace",
  "handleComments",
  "handleStringDelimiters",
  "processLine",
  "extractFunctions",
  // build-profiling.js - measurement utilities
  "measure",
  // test-utils.js - curried assertion helper for error checking
  "expectErrorsInclude",
  // test-utils.js - async error testing helper
  "expectAsyncThrows",
  // hire-calculator.test.js - DOM query helper
  "getDateInputs",
  // test-site-factory.test.js - test fixture
  "defaultTestFiles",
  // capture.test.js - test harness for push/slot shortcodes
  "setupCapture",
]);

// Pattern to identify true function declarations (not methods or callbacks)
const DECLARATION_PATTERN =
  /^\s*(?:export\s+)?(?:const|let|var|(?:async\s+)?function)\s+/;

// Curried violation creator for non-whitelisted functions
const nonWhitelistedViolation = createViolation(
  (ctx) => `Function "${ctx.name}" is not whitelisted`,
);

/**
 * Analyze test files for non-whitelisted functions.
 * Only functions in ALLOWED_TEST_FUNCTIONS are permitted in test files.
 * All other function definitions are flagged - tests should import real code.
 * Filters to only top-level declarations (const/let/var/function), ignoring
 * object methods and callbacks which are typically test fixtures.
 */
const analyzeTestFiles = () =>
  analyzeFiles(TEST_FILES(), (source, relativePath) => {
    const lines = source.split("\n");
    const functions = extractFunctions(source);

    return functions
      .filter((func) => {
        const sourceLine = lines[func.startLine - 1] || "";
        return DECLARATION_PATTERN.test(sourceLine);
      })
      .filter((func) => !ALLOWED_TEST_FUNCTIONS.has(func.name))
      .map((func) =>
        nonWhitelistedViolation({
          file: relativePath,
          line: func.startLine,
          name: func.name,
        }),
      );
  });

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
      singular: "non-whitelisted function in test file",
      plural: "non-whitelisted functions in test files",
      fixHint: "add to ALLOWED_TEST_FUNCTIONS or import from source",
    });
  });

  test("ALLOWED_TEST_FUNCTIONS entries are defined in test files", () => {
    // Combine all test file sources
    const allTestSource = analyzeFiles(TEST_FILES(), (source) => source).join(
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

  test("ALLOWED_TEST_FUNCTIONS entries are actually used in test files", () => {
    // Combine all test file sources
    const allTestSource = analyzeFiles(TEST_FILES(), (source) => source).join(
      "\n",
    );

    // Find allowlisted functions that are defined but never called/referenced
    // Skip some special cases that might be used in non-obvious ways
    const skipUsageCheck = new Set([
      // Exported from test-utils.js but may only be imported elsewhere
      "rootDir",
      "srcDir",
      "fs",
      "path",
      "expect",
      "DOM",
    ]);

    const unused = [...ALLOWED_TEST_FUNCTIONS]
      .filter((name) => !skipUsageCheck.has(name))
      .filter((name) => {
        // Check if function is called or used as a reference (callback, etc.)
        // Patterns:
        // - Direct call: functionName(
        // - Passed as callback: map(functionName)
        // - Object property access: obj[functionName]
        // - Destructuring or assignment: = functionName
        const usagePatterns = [
          new RegExp(`\\b${name}\\s*\\(`), // function call
          new RegExp(`[\\(,\\s]${name}[\\),\\s]`), // passed as argument/callback
          new RegExp(`\\[${name}\\]`), // array/object access
          new RegExp(`=\\s*${name}[\\s;,)]`), // assignment
          new RegExp(`\\.${name}\\b`), // property access
        ];
        return !usagePatterns.some((p) => p.test(allTestSource));
      });

    if (unused.length > 0) {
      console.log("\n  Unused ALLOWED_TEST_FUNCTIONS entries:");
      for (const name of unused) {
        console.log(`    - ${name}`);
      }
      console.log(
        "\n  These functions are defined but never called. Consider removing them.",
      );
    }

    expect(unused.length).toBe(0);
  });
});
