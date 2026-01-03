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
  // checkout.test.js - template rendering and mocks
  "renderTemplate",
  "createCheckoutPage",
  "createMockLocalStorage",
  "createMockFetch",
  "mockFetch",
  "createLocationTracker",
  "withMockStorage",
  // function-length.test.js - test fixture strings (parsed as examples, not real code)
  "hello",
  "greet",
  "fetchData",
  "test",
  // naming-conventions.test.js - test fixture string
  "getUserById",
  // commented-code.test.js - test fixture strings
  "active",
  // autosizes.test.js - test environment setup helpers
  "execScript",
  "createPerformanceObserverScript",
  "createTestEnv",
  "runAutosizes",
  "makeImg",
  // template-selectors.test.js - analysis helpers
  "buildLiquidLookup",
  "expandLiquidVars",
  "loadTemplate",
  // layout-aliases.test.js - test helper
  "withTempLayouts",
  // pdf.test.js - test fixture helpers
  "createMockMenu",
  "createMockCategory",
  // pdf-integration.test.js - PDF output helpers
  "findPdfInMenuDir",
  "verifyPdfHeader",
  "slugify",
  // area-list.test.js - test fixture helper
  "createLocation",
  // reviews.test.js - test fixtures helpers
  "createReviews",
  "createMockCollectionApi",
  "createProduct",
  "processItem",
  // properties.test.js - test fixture helper
  "createPropertyReviewFixture",
  // unused-images.test.js - test helper
  "runUnusedImagesTest",
  // template.test.js - global document cleanup helper
  "cleanup",
  // cpd.test.js - baseline ratcheting helpers
  "readBaseline",
  "writeBaseline",
  "round2",
  // data-exports.test.js - analysis helpers
  "hasProblematicNamedExports",
  "hasWrongHelperName",
  // test-hygiene.test.js - self-analysis helpers
  "extractFunctionDefinitions",
  "analyzeTestFiles",
  // function-length.test.js - createFunctionLengthChecker factory and its methods
  "createFunctionLengthChecker",
  "extractFunctions",
  "calculateOwnLines",
  "analyzeFunctionLengths",
  "formatViolations",
  // try-catch-usage.test.js - analysis helpers
  "findTryCatches",
  "analyzeTryCatchUsage",
  // test-quality.test.js - createTestQualityChecker factory and its methods
  "createTestQualityChecker",
  "extractTestNames",
  "extractDescribeItTests",
  "findVagueTestNames",
  "findMultiConcernTestNames",
  "findAsyncTestsWithoutAwait",
  "findAssertionsWithoutMessages",
  "findTautologicalAssertions",
  // html-in-js.test.js - HTML detection helpers
  "extractStringContent",
  "findHtmlInJs",
  "analyzeHtmlInJs",
  // commented-code.test.js - commented code detection helpers
  "findCommentedCode",
  "analyzeCommentedCode",
  // strings.test.js
  "findStringsUsage",
  // naming-conventions.test.js - createNamingConventionChecker factory and its methods
  "createNamingConventionChecker",
  "countCamelCaseWords",
  "extractCamelCaseIdentifiers",
  "analyzeNamingConventions",
  // unused-classes.test.js - createCSSAnalyzer factory and its methods
  "createCSSAnalyzer",
  "escapeRegex",
  "extractClassesFromHtml",
  "extractIdsFromHtml",
  "extractClassesFromJs",
  "addClasses",
  "findClassReferencesInScss",
  "findIdReferencesInScss",
  "findClassReferencesInJs",
  "findIdReferencesInJs",
  "findIdReferencesInHtml",
  "addToMap",
  "collectAllClassesAndIds",
  "logUnused",
  // scss.variables.test.js - createSCSSVariableAnalyzer with chainable API
  "createSCSSVariableAnalyzer",
  "scan",
  "extractUsed",
  "extractDefined",
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
    // const name = (args) => { ... } or const name = (args) => expression
    /^(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s*)?\([^)]*\)\s*=>/,
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
        // For brace-based functions, count until closing brace
        // For implicit returns, just count as single line
        const hasBrace = line.includes("{");
        let endLine = i;

        if (hasBrace) {
          let braceCount = (line.match(/\{/g) || []).length;
          braceCount -= (line.match(/\}/g) || []).length;
          for (let j = i + 1; j < lines.length && braceCount > 0; j++) {
            const checkLine = lines[j];
            braceCount += (checkLine.match(/\{/g) || []).length;
            braceCount -= (checkLine.match(/\}/g) || []).length;
            endLine = j;
          }
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
  return analyzeFiles(TEST_FILES, (source, relativePath) => {
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
    expect(SRC_JS_FILES.length).toBeGreaterThan(0);
    expect(SRC_HTML_FILES.length).toBeGreaterThan(0);
    expect(SRC_SCSS_FILES.length).toBeGreaterThan(0);
    expect(TEST_FILES.length).toBeGreaterThan(0);
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

  test("All ALLOWED_TEST_FUNCTIONS entries are actually used", () => {
    // Count occurrences of each function name in test files
    const functionCounts = new Map();
    for (const name of ALLOWED_TEST_FUNCTIONS) {
      functionCounts.set(name, 0);
    }

    analyzeFiles(TEST_FILES, (source) => {
      for (const func of extractFunctionDefinitions(source)) {
        if (functionCounts.has(func.name)) {
          functionCounts.set(func.name, functionCounts.get(func.name) + 1);
        }
      }
      return [];
    });

    // Find entries with zero usage
    const unusedEntries = [...functionCounts.entries()]
      .filter(([_, count]) => count === 0)
      .map(([name]) => name);

    if (unusedEntries.length > 0) {
      console.log(
        `\n  Found ${unusedEntries.length} unused ALLOWED_TEST_FUNCTIONS entries:`,
      );
      for (const name of unusedEntries.sort()) {
        console.log(`     - ${name} (x0)`);
      }
      console.log("\n  To fix: remove these entries from ALLOWED_TEST_FUNCTIONS");
    }

    // Show usage counts for all entries (informational)
    const usedEntries = [...functionCounts.entries()]
      .filter(([_, count]) => count > 0)
      .sort((a, b) => a[1] - b[1]); // Sort by count ascending

    if (usedEntries.length > 0) {
      console.log(`\n  ALLOWED_TEST_FUNCTIONS usage (${usedEntries.length} entries):`);
      for (const [name, count] of usedEntries) {
        console.log(`     ${name} (x${count})`);
      }
      console.log("");
    }

    expect(unusedEntries).toEqual([]);
  });
});
