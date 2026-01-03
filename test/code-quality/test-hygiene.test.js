import { describe, expect, test } from "bun:test";
import { analyzeFiles, assertNoViolations } from "#test/code-scanner.js";
import {
  SRC_HTML_FILES,
  SRC_JS_FILES,
  SRC_SCSS_FILES,
  TEST_FILES,
} from "#test/test-utils.js";

const ALLOWED_TEST_FUNCTIONS = new Set([
  "renderTemplate",
  "createCheckoutPage",
  "createMockLocalStorage",
  "createMockFetch",
  "mockFetch",
  "createLocationTracker",
  "withMockStorage",
  "getUserById",
  "active",
  "execScript",
  "createPerformanceObserverScript",
  "createTestEnv",
  "runAutosizes",
  "makeImg",
  "buildLiquidLookup",
  "expandLiquidVars",
  "loadTemplate",
  "withTempLayouts",
  "createMockMenu",
  "createMockCategory",
  "findPdfInMenuDir",
  "verifyPdfHeader",
  "slugify",
  "createLocation",
  "createReviews",
  "createMockCollectionApi",
  "createProduct",
  "processItem",
  "createPropertyReviewFixture",
  "runUnusedImagesTest",
  "cleanup",
  "readBaseline",
  "writeBaseline",
  "round2",
  "hasProblematicNamedExports",
  "hasWrongHelperName",
  "extractFunctionDefinitions",
  "analyzeTestFiles",
  "createFunctionLengthChecker",
  "extractFunctions",
  "calculateOwnLines",
  "analyzeFunctionLengths",
  "formatViolations",
  "findTryCatches",
  "analyzeTryCatchUsage",
  "createTestQualityChecker",
  "extractTestNames",
  "extractDescribeItTests",
  "findVagueTestNames",
  "findMultiConcernTestNames",
  "findAsyncTestsWithoutAwait",
  "findAssertionsWithoutMessages",
  "findTautologicalAssertions",
  "findHtmlInJs",
  "analyzeHtmlInJs",
  "findCommentedCode",
  "analyzeCommentedCode",
  "findStringsUsage",
  "createNamingConventionChecker",
  "countCamelCaseWords",
  "extractCamelCaseIdentifiers",
  "analyzeNamingConventions",
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
  "createSCSSVariableAnalyzer",
  "scan",
  "extractUsed",
  "extractDefined",
]);

const FUNC_PATTERNS = [
  /^(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s*)?\([^)]*\)\s*=>/,
  /^(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s*)?function\s*\([^)]*\)\s*\{/,
  /^(?:async\s+)?function\s+(\w+)\s*\([^)]*\)\s*\{/,
];

const extractFunctionDefinitions = (source) => {
  const functions = [],
    lines = source.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    for (const pattern of FUNC_PATTERNS) {
      const match = line.match(pattern);
      if (match) {
        let endLine = i,
          hasBrace = line.includes("{");
        if (hasBrace) {
          let braceCount =
            (line.match(/\{/g) || []).length - (line.match(/\}/g) || []).length;
          for (let j = i + 1; j < lines.length && braceCount > 0; j++) {
            braceCount +=
              (lines[j].match(/\{/g) || []).length -
              (lines[j].match(/\}/g) || []).length;
            endLine = j;
          }
        }
        functions.push({
          name: match[1],
          lineCount: endLine - i + 1,
          startLine: i + 1,
        });
        break;
      }
    }
  }
  return functions;
};

const analyzeTestFiles = () =>
  analyzeFiles(TEST_FILES, (source, relativePath) =>
    extractFunctionDefinitions(source)
      .filter((func) => !ALLOWED_TEST_FUNCTIONS.has(func.name))
      .map((func) => ({
        file: relativePath,
        line: func.startLine,
        code: func.name,
        reason: `Function "${func.name}" is not whitelisted`,
      })),
  );

describe("test-hygiene", () => {
  test("Pre-computed file lists contain files", () => {
    expect(SRC_JS_FILES.length).toBeGreaterThan(0);
    expect(SRC_HTML_FILES.length).toBeGreaterThan(0);
    expect(SRC_SCSS_FILES.length).toBeGreaterThan(0);
    expect(TEST_FILES.length).toBeGreaterThan(0);
  });

  test("Test files should not contain production logic - only test and import real code", () => {
    assertNoViolations(analyzeTestFiles(), {
      message: "non-whitelisted function(s) in test files",
      fixHint: "add to ALLOWED_TEST_FUNCTIONS or import from source",
    });
  });

  test("Correctly extracts arrow function definitions", () => {
    const funcs = extractFunctionDefinitions(
      `const myFunc = (a, b) => {\n  return a + b;\n};`,
    );
    expect(funcs.length).toBe(1);
    expect(funcs[0].name).toBe("myFunc");
  });

  test("Correctly extracts regular function definitions", () => {
    const funcs = extractFunctionDefinitions(
      `function doSomething(x) {\n  console.log(x);\n}`,
    );
    expect(funcs.length).toBe(1);
    expect(funcs[0].name).toBe("doSomething");
  });

  test("Correctly extracts async function definitions", () => {
    const funcs = extractFunctionDefinitions(
      `const fetchData = async (url) => {\n  return await fetch(url);\n};`,
    );
    expect(funcs.length).toBe(1);
    expect(funcs[0].name).toBe("fetchData");
  });

  test("All ALLOWED_TEST_FUNCTIONS entries are actually used", () => {
    const functionCounts = new Map(
      [...ALLOWED_TEST_FUNCTIONS].map((n) => [n, 0]),
    );
    analyzeFiles(TEST_FILES, (source) => {
      for (const func of extractFunctionDefinitions(source))
        if (functionCounts.has(func.name))
          functionCounts.set(func.name, functionCounts.get(func.name) + 1);
      return [];
    });
    const unusedEntries = [...functionCounts.entries()]
      .filter(([_, c]) => c === 0)
      .map(([n]) => n);
    if (unusedEntries.length > 0) {
      console.log(
        `\n  Found ${unusedEntries.length} unused ALLOWED_TEST_FUNCTIONS entries:`,
      );
      for (const name of unusedEntries.sort())
        console.log(`     - ${name} (x0)`);
      console.log(
        "\n  To fix: remove these entries from ALLOWED_TEST_FUNCTIONS",
      );
    }
    const usedEntries = [...functionCounts.entries()]
      .filter(([_, c]) => c > 0)
      .sort((a, b) => a[1] - b[1]);
    if (usedEntries.length > 0) {
      console.log(
        `\n  ALLOWED_TEST_FUNCTIONS usage (${usedEntries.length} entries):`,
      );
      for (const [name, count] of usedEntries)
        console.log(`     ${name} (x${count})`);
      console.log("");
    }
    expect(unusedEntries).toEqual([]);
  });
});
