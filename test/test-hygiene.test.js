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
 * Analyze test files for copied production code.
 * Focuses on the specific problem: when test files define functions
 * that have the same name as functions in source files (copying instead of importing).
 */
const analyzeTestFiles = () => {
  const issues = [];
  const testFiles = getTestFiles();
  const sourceFunctions = getSourceFunctionNames();

  for (const testFile of testFiles) {
    const fileName = path.basename(testFile);
    const source = fs.readFileSync(testFile, "utf-8");
    const functions = extractFunctionDefinitions(source);

    for (const func of functions) {
      // Skip allowed test utilities
      if (ALLOWED_TEST_FUNCTIONS.has(func.name)) continue;

      // The key check: function name matches a source function (potential copy)
      // This catches the mistake of copying production code instead of importing it
      if (sourceFunctions.has(func.name)) {
        issues.push({
          file: fileName,
          function: func.name,
          line: func.startLine,
          reason: `Duplicates source function name "${func.name}" - import and test the real code instead of copying it`,
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
