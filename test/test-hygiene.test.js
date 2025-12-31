import { dirname, resolve } from "path";
import { fileURLToPath } from "url";
import { createTestRunner, expectTrue, expectStrictEqual, fs, path } from "./test-utils.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = resolve(__dirname, "..");

// Allowed function names in test files (utilities, not production logic)
const ALLOWED_TEST_FUNCTIONS = new Set([
  // Test utilities from test-utils.js pattern
  "createMockEleventyConfig",
  "createTempDir",
  "createTempFile",
  "createTempSnippetsDir",
  "cleanupTempDir",
  "withTempDir",
  "withTempFile",
  "withMockedCwd",
  "runTestSuite",
  "createTestRunner",
  // Fixture factories
  "createFutureDate",
  "createPastDate",
  "formatDateString",
  "createEvent",
  "createFutureEvent",
  "createPastEvent",
  "createRecurringEvent",
  "createCategory",
  "createProduct",
  "createCollectionItem",
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
  "createMockLocalStorage",
  "createMockFetch",
  "mockFetch",
  "createLocationTracker",
  "withMockStorage",
  // function-length.test.js - analysis helpers
  "shouldSkipDir",
  "getJsFiles",
  "extractFunctions",
  "calculateOwnLines",
  "analyzeFunctionLengths",
  "formatViolations",
  // missing-folders-lib.test.js
  "testLibModules",
  // naming-conventions.test.js - analysis helpers
  "countCamelCaseWords",
  "extractCamelCaseIdentifiers",
  "analyzeNamingConventions",
  // render-snippet.test.js
  "runTests",
  // scss.variables.test.js
  "extractUsedVariables",
  "extractDefinedVariables",
  "runTest",
  // strings.test.js
  "findStringsUsage",
  // test-hygiene.test.js - self-analysis helpers
  "extractFunctionDefinitions",
  "isTestHelper",
  "getTestFiles",
  "getSourceFunctionNames",
  "processDir",
  "analyzeTestFiles",
  // theme-editor.test.js
  "generateFormHtml",
  "createMockDOM",
  // unused-classes.test.js - analysis helpers
  "getAllFiles",
  "extractClassesFromHtml",
  "extractIdsFromHtml",
  "extractClassesFromJs",
  "findClassReferencesInScss",
  "findIdReferencesInScss",
  "findClassReferencesInJs",
  "findIdReferencesInJs",
  "collectAllClassesAndIds",
  "findUnusedClassesAndIds",
  // checkout.test.js - small inline helper
  "buildFullName",
  // checkout.test.js - cart-utils copies for integration testing (inside template strings)
  "getCart",
  "saveCart",
  "getItemCount",
  "updateCartIcon",
  // function-length.test.js - test fixture strings (parsed as examples, not real code)
  "hello",
  "greet",
  "fetchData",
  "test",
  // naming-conventions.test.js - test fixture string
  "getUserById",
]);

// Maximum lines for a function in a test file before it's suspicious
const MAX_TEST_HELPER_LINES = 15;

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
 * Check if a function body contains test-related code.
 * Returns true if it looks like a test helper (uses assertions, mocks, etc.)
 */
const isTestHelper = (source, funcName, startLine, lineCount) => {
  const lines = source.split("\n").slice(startLine - 1, startLine - 1 + lineCount);
  const funcBody = lines.join("\n");

  // Test-related keywords that indicate this is test code
  const testKeywords = [
    "assert",
    "expect",
    "mock",
    "stub",
    "spy",
    "test",
    "describe",
    "it(",
    "beforeEach",
    "afterEach",
    "JSDOM",
    "createMock",
  ];

  return testKeywords.some((keyword) => funcBody.includes(keyword));
};

/**
 * Get all test files
 */
const getTestFiles = () => {
  const testDir = path.join(rootDir, "test");
  return fs.readdirSync(testDir)
    .filter((f) => f.endsWith(".test.js"))
    .map((f) => path.join(testDir, f));
};

/**
 * Get all source function names from _lib directory
 */
const getSourceFunctionNames = () => {
  const names = new Set();
  const libDir = path.join(rootDir, "src", "_lib");

  const processDir = (dir) => {
    if (!fs.existsSync(dir)) return;

    for (const file of fs.readdirSync(dir)) {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);

      if (stat.isDirectory()) {
        processDir(filePath);
      } else if (file.endsWith(".js")) {
        const source = fs.readFileSync(filePath, "utf-8");
        const funcs = extractFunctionDefinitions(source);
        funcs.forEach((f) => names.add(f.name));
      }
    }
  };

  processDir(libDir);
  return names;
};

/**
 * Analyze test files for non-whitelisted functions.
 * Only functions in ALLOWED_TEST_FUNCTIONS are permitted in test files.
 * All other function definitions are flagged - tests should import real code.
 */
const analyzeTestFiles = () => {
  const issues = [];
  const testFiles = getTestFiles();

  for (const testFile of testFiles) {
    const fileName = path.basename(testFile);
    const source = fs.readFileSync(testFile, "utf-8");
    const functions = extractFunctionDefinitions(source);

    for (const func of functions) {
      // Only whitelisted functions are allowed
      if (!ALLOWED_TEST_FUNCTIONS.has(func.name)) {
        issues.push({
          file: fileName,
          function: func.name,
          line: func.startLine,
          reason: `Function "${func.name}" is not whitelisted - add to ALLOWED_TEST_FUNCTIONS or import from source`,
        });
      }
    }
  }

  return issues;
};

const testCases = [
  {
    name: "no-production-code-in-tests",
    description: "Test files should not contain production logic - only test and import real code",
    test: () => {
      const issues = analyzeTestFiles();

      if (issues.length > 0) {
        console.log("\n  ⚠️  Potential production code found in test files:");
        for (const issue of issues) {
          console.log(`     - ${issue.file}:${issue.line} - ${issue.function}`);
          console.log(`       ${issue.reason}`);
        }
        console.log("");
      }

      expectStrictEqual(
        issues.length,
        0,
        `Found ${issues.length} function(s) that may be production code in test files. ` +
        `Tests should import and test real code, not copies.`
      );
    },
  },
  {
    name: "extractFunctionDefinitions-arrow",
    description: "Correctly extracts arrow function definitions",
    test: () => {
      const source = `const myFunc = (a, b) => {\n  return a + b;\n};`;
      const funcs = extractFunctionDefinitions(source);
      expectStrictEqual(funcs.length, 1, "Should find one function");
      expectStrictEqual(funcs[0].name, "myFunc", "Should extract function name");
    },
  },
  {
    name: "extractFunctionDefinitions-regular",
    description: "Correctly extracts regular function definitions",
    test: () => {
      const source = `function doSomething(x) {\n  console.log(x);\n}`;
      const funcs = extractFunctionDefinitions(source);
      expectStrictEqual(funcs.length, 1, "Should find one function");
      expectStrictEqual(funcs[0].name, "doSomething", "Should extract function name");
    },
  },
  {
    name: "extractFunctionDefinitions-async",
    description: "Correctly extracts async function definitions",
    test: () => {
      const source = `const fetchData = async (url) => {\n  return await fetch(url);\n};`;
      const funcs = extractFunctionDefinitions(source);
      expectStrictEqual(funcs.length, 1, "Should find async function");
      expectStrictEqual(funcs[0].name, "fetchData", "Should extract async function name");
    },
  },
];

export default createTestRunner("test-hygiene", testCases);
