import { describe, expect, test } from "bun:test";
import {
  analyzeFiles,
  assertNoViolations,
  createViolation,
  noStaleAllowlist,
} from "#test/code-scanner.js";
import {
  extractFunctions,
  SRC_HTML_FILES,
  SRC_JS_FILES,
  SRC_SCSS_FILES,
  TEST_FILES,
} from "#test/test-utils.js";
import { frozenSet } from "#toolkit/fp/set.js";

// Allowed function names in test files (utilities, not production logic)
const ALLOWED_TEST_FUNCTIONS = frozenSet([
  // Test utilities from test-utils.js pattern
  "compileScss",
  "createObjectBuilder",
  "execScript",
  "createMockEleventyConfig",
  "createMockEngine", // cached-block.test.js - mock liquidjs engine
  "createRenderContext", // cached-block.test.js - render test setup
  "parseWithTag", // cached-block.test.js - parse helper for tag testing
  "renderWithKey", // cached-block.test.js - render helper for caching tests
  "createTestMockEngine", // cached-block.test.js - configurable mock engine factory
  "createRealisticMockEngine", // cached-block.test.js - mock engine with parseCallCount
  "createMutatingMockEngine", // cached-block.test.js - mock engine simulating token mutation
  "simulateProductionUsage", // cached-block.test.js - production-like render simulation
  "testCacheKeyCollision", // cached-block.test.js - helper for cache key collision tests
  "createLiquidWithCachedBlock", // cached-block.test.js - creates Liquid with tag registered
  "createPropertiesMock", // properties.test.js - creates mock config with registered filters
  "createReviewsMock", // reviews.test.js - creates mock config with registered filters
  "createSearchMock", // search.test.js - creates mock config with registered filters
  "createStyleBundleMock", // style-bundle.test.js - creates mock config with registered filters
  "createConfiguredMock", // file-utils.test.js - creates mock config with file utils registered
  "withFileUtils", // file-utils.test.js - runs callback with configured file utils in mocked CWD
  "testWithFile", // file-utils.test.js - runs sync test with temp file and configured file utils
  "testWithEmptyDir", // file-utils.test.js - runs sync test with empty temp dir
  "testSnippet", // file-utils.test.js - runs async snippet test with configured file utils
  "createTempDir",
  "createTempSnippetsDir",
  "withTempDir",
  "withTempFile",
  "withMockedConsole",
  "withSetupTestSite", // test-site-factory.js - runs test without build, with cleanup
  "getIconFilter",
  "createIconifyMock", // iconify.test.js - configured mock using withConfiguredMock
  "expectValidScriptTag",
  "expectNavUnchanged", // navigation-utils.test.js - assertion helper for disabled config tests
  // Fixture factories
  "createProduct",
  "createPropertyReviewFixture",
  // Collection test helpers - get collection from configured mock
  "getEventsCollection",
  "getLocationsCollection",
  // events-utils.js - event fixture factories and assertion helpers
  "expectEventCounts",
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
  // quote-steps.test.js - test fixture factory and setup helpers
  "createQuoteStepsHtml",
  "setupQuoteSteps",
  "triggerValidationError",
  // quote-steps-utils.js - shared test helpers for progress tests
  "testIndicatorStates",
  // quote-price-utils.test.js - DOM setup, fixtures, and template rendering
  "setupDOM",
  "setupBlurTestDOM",
  "renderQuotePriceTemplates",
  "cartItem",
  "buyItem",
  "getDetails",
  "getDetailKey",
  "getDetailValue",
  "testEventTriggersDays",
  // theme-editor.test.js - functional test helpers
  "roundTripTheme",
  "testScopedEntry",
  // item-filters.test.js - mock eleventy config with getters
  "mockConfig",
  // item-filters.test.js - test setup helper with collection accessors
  "setupConfig",
  // checkout.test.js - template rendering and mocks
  "renderTemplate",
  "createCheckoutPage",
  "createMockFetch",
  "mockFetch",
  "fetchMock",
  "createLocationTracker",
  "withCheckoutMockStorage",
  // transforms/*.test.js - DOM transform test helpers
  "transformHtml",
  "countScrollableTables",
  // html-transform.test.js - mock image processor
  "mockImageProcessor",
  // images.test.js - test helpers
  "getImageOptions",
  "createWrapper",
  "expectSkipped",
  "processAndCapture",
  // autosizes.test.js - integration test helpers
  "testRemoteUrlNotProcessed",
  // code-scanner.test.js - matcher assertion helpers
  "testMatcherResult",
  // function-length.test.js - analysis helpers
  "calculateOwnLines",
  "analyzeFunctionLengths",
  "formatLengthViolations",
  // let-usage.test.js - analysis helpers
  "findMutableVarDeclarations",
  "findMutableConstDeclarations",
  // naming-conventions.test.js - analysis helpers
  "countCamelCaseWords",
  "extractCamelCaseIdentifiers",
  "analyzeNamingConventions",
  // inline-type-annotations.test.js - scanner config and analysis helpers
  "isSingleLineComment",
  "shouldSkipLine",
  "extractTypeName",
  "toTypeAnnotationViolation",
  "isAllowed",
  "analyzeInlineTypeAnnotations",
  // memoize-inside-function.test.js - scanner config and analysis helpers
  "toMemoizeViolation",
  "analyzeMemoizeInsideFunction",
  // Template fixture function names in code-quality tests
  "outer",
  "second",
  "secondViolation",
  "innerNested",
  "useIt",
  // scss.variables.test.js
  "extractUsedVariables",
  "extractDefinedVariables",
  // code-scanner.js - stale exception validation helpers
  "assertNoStaleEntries",
  "withStaleAssertion",
  "expectNoStaleExceptions",
  "isFunctionDefined",
  "validateFunctionAllowlist",
  "noStaleAllowlist",
  // code-scanner.js - export detection utility
  "extractExports",
  // code-scanner.js - export list parsing helper
  "parseExportListContent",
  // design-system-scoping.test.js - SCSS analysis helpers
  "findUnscopedSelectors",
  "hasDesignSystemWrapper",
  // test-only-exports.test.js - analysis helpers
  "resolveImportPath",
  "extractImports",
  "extractEleventyRegistrations",
  "buildExportsMap",
  "buildImportUsageMap",
  "buildEleventyRegistrationMap",
  "analyzeTestOnlyExports",
  // test-only-exports.test.js - test fixture source code strings (parser test data)
  "foo",
  "a",
  "b",
  "c",
  "original",
  "exportAlpha",
  "exportBeta",
  "exportGamma",
  "baseExport",
  "multiAlpha",
  "multiBeta",
  "multiGamma",
  "aliasBase",
  "aliasKeep",
  // categories.test.js - collection setup helpers
  "getCategoriesCollection",
  // products.test.js - test setup helpers
  "setupProductsConfig",
  "categorizedProducts",
  // area-list.test.js - filter setup helper
  "getAreaListFilter",
  // Eleventy filter getter helpers - get filter via config registration
  "getCacheBustFilter",
  "getJsConfigFilter",
  "getEventIcalFilter",
  // feed.test.js - test site factory
  "setupTestSiteWithFeed",
  // hire-calculator.test.js - callback tracking setup
  "initHireWithCallback",
  // hire-calculator.test.js - mock storage setup
  "withHireMockStorage",
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
  // duplicate-methods.test.js - analysis helpers
  "extractFunctionNames",
  "isExcludedFile",
  "buildFunctionLocationMap",
  "findDuplicateMethods",
  "printDuplicateReport",
  // duplicate-methods.test.js - test fixture function names
  "hello",
  "greet",
  "fetchData",
  "getData",
  "actual",
  // memoize-inside-function.test.js - test fixture function name
  "innerNested",
  // try-catch-usage.test.js - analysis helpers
  "findTryCatches",
  "tryBlockHasCatch",
  // comment-limits.test.js - analysis helpers
  "findExcessiveComments",
  "findHeaderEndLine",
  "countInlineComments",
  "isJSDocTypeLine",
  "isBlockEnd",
  "isBlockStart",
  "isSingleLine",
  "isJSDocStart",
  "isSingleLineBlock",
  // comment-limits.test.js - test fixture function name
  "validate",
  // comment-limits.test.js - test assertion helper
  "expectExcessiveComments",
  // commented-code.test.js - analysis helpers
  "findCommentedCode",
  // commented-code.test.js - test fixture strings
  "active",
  // autosizes.test.js - helper to inject PerformanceObserver mock
  "createPerformanceObserverScript",
  // template.test.js - helper to extract input from template
  "getQuantityInput",
  // autosizes.test.js - test environment setup helpers
  "createAutosizesTestEnv",
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
  "reviewItem",
  "itemsFor",
  "createProductReviews",
  "createTruncatePair",
  "createLimitTestData",
  // test-site-factory.test.js - test page fixtures
  "minimalPage",
  "factoryTestPage",
  // image.test.js - test page fixture
  "imageTestPage",
  // recurring-events.test.js - test page fixture
  "eventsTestPage",
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
  // aliasing.test.js - analysis helpers
  "findAliases",
  // short-circuit-order.test.js - analysis helpers
  "findSuboptimalOrder",
  // image.test.js - functional test helpers
  "expectPassthrough",
  "expectIncludes",
  "runTransform",
  // news.test.js - functional test fixture builders
  "newsPostItem",
  "newsPostItems",
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
  // test-utils.js - project-specific test utilities
  "getFiles",
  "expectResultTitles",
  "expectGalleries",
  // build-profiling.js - measurement utilities
  "measure",
  // NOTE: captureConsole, expectArrayProp, expectProp, expectDataArray,
  // extractFunctions, expectErrorsInclude, expectAsyncThrows, withSubDir,
  // withSubDirAsync, mockFetch, withMockFetch are now imported from toolkit
  // hire-calculator.test.js - DOM query helper
  "getDateInputs",
  // test-site-factory.test.js - test fixture
  "defaultTestFiles",
  // capture.test.js - test harness for push/slot shortcodes
  "setupCapture",
  // breadcrumbs.test.js - filter setup helper
  "setupFilter",
  // customise-cms.test.js - test setup helpers
  "setupSiteJson",
  "setupSiteJsonWithSrc",
  // customise-cms.test.js - YAML section extraction helpers
  "getEventsSection",
  "getViewSection",
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

    noStaleAllowlist(
      ALLOWED_TEST_FUNCTIONS,
      allTestSource,
      "ALLOWED_TEST_FUNCTIONS",
    );
  });

  test("ALLOWED_TEST_FUNCTIONS entries are actually used in test files", () => {
    // Combine all test file sources
    const allTestSource = analyzeFiles(TEST_FILES(), (source) => source).join(
      "\n",
    );

    // Find allowlisted functions that are defined but never called/referenced
    // Skip some special cases that might be used in non-obvious ways
    const skipUsageCheck = frozenSet([
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
