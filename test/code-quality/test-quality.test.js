import {
  createTestRunner,
  expectStrictEqual,
  expectTrue,
  fs,
  path,
  rootDir,
  TEST_FILES,
} from "#test/test-utils.js";

/**
 * Test Quality Enforcement
 *
 * This test enforces the criteria from TEST-QUALITY-CRITERIA.md:
 * - Section 4: Clear Failure Semantics (test naming)
 * - Section 6: Tests One Thing (avoid "and" suggesting multiple concerns)
 * - Section 9: Async Tests Are Actually Async
 */

// Grandfathered asyncTest functions that need to be converted to sync
// These should be fixed over time - new violations are not allowed
const ASYNC_TEST_EXCEPTIONS = new Set([
  "test/checkout.test.js:340", // cart-utils-escapeHtml-basic
  "test/checkout.test.js:364", // cart-utils-updateCartIcon-shows-icon
  "test/checkout.test.js:406", // cart-utils-updateCartIcon-hides-icon
  "test/checkout.test.js:481", // cart-utils-updateItemQuantity-respects-max
  "test/checkout.test.js:531", // cart-utils-renderQuantityControls-basic
  "test/checkout.test.js:583", // cart-utils-renderQuantityControls-max-quantity
  "test/checkout.test.js:608", // cart-utils-renderQuantityControls-escapes-html
  "test/checkout.test.js:632", // cart-utils-attachQuantityHandlers-decrease
  "test/checkout.test.js:672", // cart-utils-attachQuantityHandlers-increase
  "test/checkout.test.js:712", // cart-utils-attachQuantityHandlers-input-change
  "test/checkout.test.js:751", // cart-utils-attachRemoveHandlers-removes-item
  "test/checkout.test.js:1229", // stripe-checkout-empty-cart-redirects-home
]);

// Patterns that indicate vague/non-descriptive test names
const VAGUE_NAME_PATTERNS = [
  /^test-?\d+$/i, // test-1, test1, test-2, etc.
  /^test$/i, // just "test"
  /^works$/i, // just "works"
  /^it-works$/i, // it-works
  /^should-work$/i, // should-work
  /^basic$/i, // just "basic"
  /^simple$/i, // just "simple"
  /^default$/i, // just "default"
];

// Files that are allowed to have tests with "and" in names
// (integration tests that intentionally test workflows)
const AND_NAME_EXCEPTIONS = new Set([
  "test/theme-editor.test.js", // e2e tests that test workflows
]);

/**
 * Extract test case definitions from source code.
 * Finds patterns like: { name: "test-name", ... }
 */
const extractTestCases = (source, relativePath) => {
  const testCases = [];
  const lines = source.split("\n");

  // Pattern to match test case name definitions
  const namePattern = /^\s*name:\s*["']([^"']+)["']/;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const match = line.match(namePattern);
    if (match) {
      testCases.push({
        name: match[1],
        line: i + 1,
        file: relativePath,
      });
    }
  }

  return testCases;
};

/**
 * Extract describe/it test definitions (node:test style).
 * Finds patterns like: it("test name", ...)
 */
const extractDescribeItTests = (source, relativePath) => {
  const testCases = [];
  const lines = source.split("\n");

  // Pattern to match it("name", ...) or it('name', ...)
  const itPattern = /^\s*it\s*\(\s*["']([^"']+)["']/;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const match = line.match(itPattern);
    if (match) {
      testCases.push({
        name: match[1],
        line: i + 1,
        file: relativePath,
      });
    }
  }

  return testCases;
};

/**
 * Check for vague test names.
 */
const findVagueTestNames = () => {
  const violations = [];

  for (const relativePath of TEST_FILES) {
    const fullPath = path.join(rootDir, relativePath);
    const source = fs.readFileSync(fullPath, "utf-8");

    const testCases = [
      ...extractTestCases(source, relativePath),
      ...extractDescribeItTests(source, relativePath),
    ];

    for (const testCase of testCases) {
      for (const pattern of VAGUE_NAME_PATTERNS) {
        if (pattern.test(testCase.name)) {
          violations.push({
            file: relativePath,
            line: testCase.line,
            name: testCase.name,
            reason: `Vague test name "${testCase.name}" - use a descriptive name like "functionName-action-expected"`,
          });
          break;
        }
      }
    }
  }

  return violations;
};

/**
 * Check for test names with "and" that might indicate testing multiple things.
 * Only flags if there are 2+ "and"s, suggesting scope creep.
 */
const findMultiConcernTestNames = () => {
  const violations = [];

  for (const relativePath of TEST_FILES) {
    // Skip exceptions (e.g., e2e tests)
    if (AND_NAME_EXCEPTIONS.has(relativePath)) {
      continue;
    }

    const fullPath = path.join(rootDir, relativePath);
    const source = fs.readFileSync(fullPath, "utf-8");

    const testCases = [
      ...extractTestCases(source, relativePath),
      ...extractDescribeItTests(source, relativePath),
    ];

    for (const testCase of testCases) {
      // Count occurrences of "-and-" in the test name
      const andCount = (testCase.name.match(/-and-/g) || []).length;

      // Only flag if there are 2+ "and"s (multiple concerns)
      if (andCount >= 2) {
        violations.push({
          file: relativePath,
          line: testCase.line,
          name: testCase.name,
          reason: `Test name has ${andCount} "and"s - consider splitting into focused tests`,
        });
      }
    }
  }

  return violations;
};

/**
 * Extract asyncTest functions and check if they have real await operations.
 */
const findAsyncTestsWithoutAwait = () => {
  const violations = [];

  for (const relativePath of TEST_FILES) {
    const fullPath = path.join(rootDir, relativePath);
    const source = fs.readFileSync(fullPath, "utf-8");
    const lines = source.split("\n");

    // Find asyncTest definitions
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Match asyncTest: async () => { or asyncTest: async function() {
      if (/asyncTest:\s*async/.test(line)) {
        // Find the corresponding test name (look backwards)
        let testName = "unknown";
        for (let j = i - 1; j >= 0 && j > i - 10; j--) {
          const nameMatch = lines[j].match(/name:\s*["']([^"']+)["']/);
          if (nameMatch) {
            testName = nameMatch[1];
            break;
          }
        }

        // Extract the function body
        let braceCount = 0;
        let started = false;
        let funcBody = "";
        let _endLine = i;

        for (let j = i; j < lines.length; j++) {
          const checkLine = lines[j];
          for (const char of checkLine) {
            if (char === "{") {
              braceCount++;
              started = true;
            } else if (char === "}") {
              braceCount--;
            }
          }
          funcBody += `${checkLine}\n`;
          _endLine = j;

          if (started && braceCount === 0) {
            break;
          }
        }

        // Check if there are real await operations
        // Skip awaits that are just Promise.resolve() or trivial
        const awaitMatches = funcBody.match(/await\s+[^;,\n]+/g) || [];
        const hasRealAwait = awaitMatches.some((awaitExpr) => {
          // Filter out trivial awaits
          return (
            !awaitExpr.includes("Promise.resolve") &&
            !awaitExpr.includes("Promise.reject")
          );
        });

        if (!hasRealAwait) {
          const location = `${relativePath}:${i + 1}`;
          // Skip grandfathered exceptions
          if (!ASYNC_TEST_EXCEPTIONS.has(location)) {
            violations.push({
              file: relativePath,
              line: i + 1,
              testName,
              reason: `asyncTest without meaningful await - use sync "test" instead`,
            });
          }
        }
      }
    }
  }

  return violations;
};

const testCases = [
  {
    name: "extractTestCases-basic",
    description: "Correctly extracts test case names from testCases array",
    test: () => {
      const source = `
const testCases = [
  {
    name: "my-test",
    description: "Does something",
    test: () => {}
  }
];`;
      const cases = extractTestCases(source, "test.js");
      expectStrictEqual(cases.length, 1, "Should find one test case");
      expectStrictEqual(cases[0].name, "my-test", "Should extract name");
    },
  },
  {
    name: "extractDescribeItTests-basic",
    description: "Correctly extracts it() test names",
    test: () => {
      const source = `
describe("module", () => {
  it("should do something", () => {});
  it('handles edge case', () => {});
});`;
      const cases = extractDescribeItTests(source, "test.js");
      expectStrictEqual(cases.length, 2, "Should find two tests");
      expectStrictEqual(
        cases[0].name,
        "should do something",
        "Should extract first name",
      );
    },
  },
  {
    name: "vague-names-detected",
    description: "Detects vague test names",
    test: () => {
      const testPatterns = [
        "test-1",
        "test1",
        "test",
        "works",
        "basic",
        "simple",
      ];
      for (const name of testPatterns) {
        const isVague = VAGUE_NAME_PATTERNS.some((p) => p.test(name));
        expectTrue(isVague, `"${name}" should be detected as vague`);
      }
    },
  },
  {
    name: "good-names-not-flagged",
    description: "Does not flag good descriptive test names",
    test: () => {
      const goodNames = [
        "addItem-increments-quantity",
        "getCart-returns-empty-array-initially",
        "parseConfig-handles-missing-keys",
        "basic-functionality-works", // "basic" as part of longer name is OK
      ];
      for (const name of goodNames) {
        const isVague = VAGUE_NAME_PATTERNS.some((p) => p.test(name));
        expectTrue(!isVague, `"${name}" should NOT be flagged as vague`);
      }
    },
  },
  {
    name: "no-vague-test-names",
    description:
      "No tests in the codebase have vague names (Section 4: Clear Failure Semantics)",
    test: () => {
      const violations = findVagueTestNames();

      if (violations.length > 0) {
        console.log(`\n  ⚠️  Found ${violations.length} vague test name(s):`);
        for (const v of violations) {
          console.log(`     - ${v.file}:${v.line} "${v.name}"`);
          console.log(`       ${v.reason}`);
        }
        console.log("");
      }

      expectStrictEqual(
        violations.length,
        0,
        `Found ${violations.length} vague test name(s). See list above.`,
      );
    },
  },
  {
    name: "no-multi-concern-test-names",
    description:
      "No tests have multiple 'and's suggesting testing too many things (Section 6)",
    test: () => {
      const violations = findMultiConcernTestNames();

      if (violations.length > 0) {
        console.log(
          `\n  ⚠️  Found ${violations.length} test(s) with multiple concerns:`,
        );
        for (const v of violations) {
          console.log(`     - ${v.file}:${v.line} "${v.name}"`);
          console.log(`       ${v.reason}`);
        }
        console.log("");
      }

      expectStrictEqual(
        violations.length,
        0,
        `Found ${violations.length} multi-concern test name(s). See list above.`,
      );
    },
  },
  {
    name: "async-tests-have-await",
    description:
      "asyncTest functions have real await operations (Section 9: Async Tests)",
    test: () => {
      const violations = findAsyncTestsWithoutAwait();

      if (violations.length > 0) {
        console.log(
          `\n  ⚠️  Found ${violations.length} asyncTest(s) without real awaits:`,
        );
        for (const v of violations) {
          console.log(`     - ${v.file}:${v.line} "${v.testName}"`);
          console.log(`       ${v.reason}`);
        }
        console.log("");
      }

      expectStrictEqual(
        violations.length,
        0,
        `Found ${violations.length} asyncTest(s) without await. Use sync "test" instead.`,
      );
    },
  },
];

export default createTestRunner("test-quality", testCases);
