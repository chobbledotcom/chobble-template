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
 * - Section 2: Not Tautological (assertions verify behavior)
 * - Section 4: Clear Failure Semantics (test naming, assertion messages)
 * - Section 6: Tests One Thing (avoid "and" suggesting multiple concerns)
 * - Section 9: Async Tests Are Actually Async
 */

// ============================================
// Exception Lists (grandfathered violations)
// ============================================

// Grandfathered asyncTest functions that need to be converted to sync
const ASYNC_TEST_EXCEPTIONS = new Set([
  "test/checkout.test.js:376", // cart-utils-escapeHtml-basic
  "test/checkout.test.js:410", // cart-utils-updateCartIcon-shows-icon
  "test/checkout.test.js:452", // cart-utils-updateCartIcon-hides-icon
  "test/checkout.test.js:527", // cart-utils-updateItemQuantity-respects-max
  "test/checkout.test.js:577", // cart-utils-renderQuantityControls-basic
  "test/checkout.test.js:629", // cart-utils-renderQuantityControls-max-quantity
  "test/checkout.test.js:654", // cart-utils-renderQuantityControls-escapes-html
  "test/checkout.test.js:678", // cart-utils-attachQuantityHandlers-decrease
  "test/checkout.test.js:718", // cart-utils-attachQuantityHandlers-increase
  "test/checkout.test.js:758", // cart-utils-attachQuantityHandlers-input-change
  "test/checkout.test.js:797", // cart-utils-attachRemoveHandlers-removes-item
  "test/checkout.test.js:1366", // stripe-checkout-empty-cart-redirects-home
]);

// Grandfathered tautological patterns
// Supports file-level ("test/file.js") or specific ("test/file.js:assignLine:assertLine")
const TAUTOLOGICAL_EXCEPTIONS = new Set([
  "test/checkout.test.js", // 2 tautological patterns to fix
]);

// Files that are allowed to have tests with "and" in names
const AND_NAME_EXCEPTIONS = new Set([
  "test/theme-editor.test.js", // e2e tests that test workflows
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

// ============================================
// Analysis Functions
// ============================================

/**
 * Extract test case definitions from source code.
 * Finds patterns like: { name: "test-name", ... }
 */
const extractTestCases = (source, relativePath) => {
  const testCases = [];
  const lines = source.split("\n");

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
 */
const extractDescribeItTests = (source, relativePath) => {
  const testCases = [];
  const lines = source.split("\n");

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
            reason: `Vague test name "${testCase.name}" - use descriptive name`,
          });
          break;
        }
      }
    }
  }

  return violations;
};

/**
 * Check for test names with multiple "and"s suggesting multiple concerns.
 */
const findMultiConcernTestNames = () => {
  const violations = [];

  for (const relativePath of TEST_FILES) {
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
      const andCount = (testCase.name.match(/-and-/g) || []).length;
      if (andCount >= 2) {
        violations.push({
          file: relativePath,
          line: testCase.line,
          name: testCase.name,
          reason: `Test name has ${andCount} "and"s - consider splitting`,
        });
      }
    }
  }

  return violations;
};

/**
 * Check for asyncTest without real await operations.
 */
const findAsyncTestsWithoutAwait = () => {
  const violations = [];

  for (const relativePath of TEST_FILES) {
    const fullPath = path.join(rootDir, relativePath);
    const source = fs.readFileSync(fullPath, "utf-8");
    const lines = source.split("\n");

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      if (/asyncTest:\s*async/.test(line)) {
        let testName = "unknown";
        for (let j = i - 1; j >= 0 && j > i - 10; j--) {
          const nameMatch = lines[j].match(/name:\s*["']([^"']+)["']/);
          if (nameMatch) {
            testName = nameMatch[1];
            break;
          }
        }

        let braceCount = 0;
        let started = false;
        let funcBody = "";

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

          if (started && braceCount === 0) {
            break;
          }
        }

        const awaitMatches = funcBody.match(/await\s+[^;,\n]+/g) || [];
        const hasRealAwait = awaitMatches.some(
          (expr) =>
            !expr.includes("Promise.resolve") &&
            !expr.includes("Promise.reject"),
        );

        if (!hasRealAwait) {
          violations.push({
            file: relativePath,
            line: i + 1,
            testName,
            reason: `asyncTest without await - use sync "test" instead`,
          });
        }
      }
    }
  }

  return violations;
};

/**
 * Check for assertions without descriptive messages.
 * Section 4: Clear Failure Semantics
 */
const findAssertionsWithoutMessages = () => {
  const violations = [];

  // Skip code-quality tests (meta-tests) and this file
  const testFilesToCheck = TEST_FILES.filter(
    (f) => !f.includes("code-quality/"),
  );

  for (const relativePath of testFilesToCheck) {
    const fullPath = path.join(rootDir, relativePath);
    const source = fs.readFileSync(fullPath, "utf-8");
    const lines = source.split("\n");

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      // Match assert.strictEqual(a, b) without third parameter
      // Pattern: assert.strictEqual(something, something) followed by ; or , or )
      if (/assert\.strictEqual\s*\([^,]+,[^,)]+\)\s*[;,)]?\s*$/.test(line)) {
        violations.push({
          file: relativePath,
          line: i + 1,
          code: line.substring(0, 50) + (line.length > 50 ? "..." : ""),
          reason: "assert.strictEqual missing message parameter",
        });
      }

      // Match assert.deepStrictEqual without message
      if (
        /assert\.deepStrictEqual\s*\([^,]+,[^,)]+\)\s*[;,)]?\s*$/.test(line)
      ) {
        violations.push({
          file: relativePath,
          line: i + 1,
          code: line.substring(0, 50) + (line.length > 50 ? "..." : ""),
          reason: "assert.deepStrictEqual missing message parameter",
        });
      }

      // Match assert.ok(x) without message
      if (/assert\.ok\s*\([^,)]+\)\s*[;,)]?\s*$/.test(line)) {
        violations.push({
          file: relativePath,
          line: i + 1,
          code: line.substring(0, 50) + (line.length > 50 ? "..." : ""),
          reason: "assert.ok missing message parameter",
        });
      }
    }
  }

  return violations;
};

/**
 * Check for tautological assertions.
 * Section 2: Not Tautological
 *
 * Detects patterns like:
 *   x.prop = value;
 *   assert.strictEqual(x.prop, value);
 */
const findTautologicalAssertions = () => {
  const violations = [];

  const testFilesToCheck = TEST_FILES.filter(
    (f) => !f.includes("code-quality/"),
  );

  for (const relativePath of testFilesToCheck) {
    const fullPath = path.join(rootDir, relativePath);
    const source = fs.readFileSync(fullPath, "utf-8");
    const lines = source.split("\n");

    // Track recent assignments: { "x.prop": { value, line } }
    const recentAssignments = new Map();

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      // Match property assignments: x.prop = value;
      const assignMatch = line.match(/^(\w+(?:\.\w+)+)\s*=\s*([^;]+);?\s*$/);
      if (assignMatch) {
        const [, prop, value] = assignMatch;
        recentAssignments.set(prop, { value: value.trim(), line: i + 1 });
        continue;
      }

      // Match assertions on properties
      const assertMatch = line.match(
        /assert\.(?:strictEqual|ok)\s*\(\s*(\w+(?:\.\w+)+)/,
      );
      if (assertMatch) {
        const prop = assertMatch[1];
        const assignment = recentAssignments.get(prop);

        if (assignment) {
          // Check if this is a tautology (assertion within 5 lines of assignment)
          const lineDistance = i + 1 - assignment.line;
          if (lineDistance <= 5 && lineDistance > 0) {
            violations.push({
              file: relativePath,
              assignLine: assignment.line,
              assertLine: i + 1,
              property: prop,
              reason: `Set "${prop}" on line ${assignment.line}, then assert on line ${i + 1} - tests nothing`,
            });
          }
        }
      }

      // Clear assignments that are too old (more than 10 lines ago)
      for (const [key, val] of recentAssignments) {
        if (i + 1 - val.line > 10) {
          recentAssignments.delete(key);
        }
      }
    }
  }

  return violations;
};

// ============================================
// Test Cases
// ============================================

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
        "basic-functionality-works",
      ];
      for (const name of goodNames) {
        const isVague = VAGUE_NAME_PATTERNS.some((p) => p.test(name));
        expectTrue(!isVague, `"${name}" should NOT be flagged as vague`);
      }
    },
  },
  {
    name: "tautology-detection-basic",
    description: "Detects set-then-assert tautological patterns",
    test: () => {
      const source = `
        button.disabled = false;
        assert.strictEqual(button.disabled, false);
      `;
      const lines = source.split("\n");
      const recentAssignments = new Map();
      let foundTautology = false;

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        const assignMatch = line.match(/^(\w+(?:\.\w+)+)\s*=\s*([^;]+);?\s*$/);
        if (assignMatch) {
          recentAssignments.set(assignMatch[1], { line: i + 1 });
        }
        const assertMatch = line.match(
          /assert\.strictEqual\s*\(\s*(\w+(?:\.\w+)+)/,
        );
        if (assertMatch && recentAssignments.has(assertMatch[1])) {
          foundTautology = true;
        }
      }

      expectTrue(foundTautology, "Should detect tautological pattern");
    },
  },
  {
    name: "no-vague-test-names",
    description: "No tests have vague names (Section 4)",
    test: () => {
      const violations = findVagueTestNames();

      if (violations.length > 0) {
        console.log(`\n  ⚠️  Found ${violations.length} vague test name(s):`);
        for (const v of violations.slice(0, 10)) {
          console.log(`     - ${v.file}:${v.line} "${v.name}"`);
        }
        if (violations.length > 10) {
          console.log(`     ... and ${violations.length - 10} more`);
        }
        console.log("");
      }

      expectStrictEqual(
        violations.length,
        0,
        `Found ${violations.length} vague test name(s)`,
      );
    },
  },
  {
    name: "no-multi-concern-test-names",
    description: "No tests have multiple 'and's (Section 6)",
    test: () => {
      const violations = findMultiConcernTestNames();

      if (violations.length > 0) {
        console.log(`\n  ⚠️  Found ${violations.length} multi-concern test(s):`);
        for (const v of violations) {
          console.log(`     - ${v.file}:${v.line} "${v.name}"`);
        }
        console.log("");
      }

      expectStrictEqual(violations.length, 0, `Found ${violations.length}`);
    },
  },
  {
    name: "async-tests-have-await",
    description: "asyncTest functions have real await (Section 9)",
    test: () => {
      const violations = findAsyncTestsWithoutAwait();

      if (violations.length > 0) {
        console.log(
          `\n  ⚠️  Found ${violations.length} asyncTest(s) without await:`,
        );
        for (const v of violations) {
          console.log(`     - ${v.file}:${v.line} "${v.testName}"`);
        }
        console.log("");
      }

      expectStrictEqual(violations.length, 0, `Found ${violations.length}`);
    },
  },
  {
    name: "assertions-have-messages",
    description: "Assertions have descriptive messages (Section 4)",
    test: () => {
      const violations = findAssertionsWithoutMessages();

      if (violations.length > 0) {
        console.log(
          `\n  ⚠️  Found ${violations.length} assertion(s) without messages:`,
        );
        for (const v of violations.slice(0, 10)) {
          console.log(`     - ${v.file}:${v.line}`);
          console.log(`       ${v.code}`);
        }
        if (violations.length > 10) {
          console.log(`     ... and ${violations.length - 10} more`);
        }
        console.log("");
      }

      expectStrictEqual(
        violations.length,
        0,
        `Found ${violations.length} assertion(s) without messages`,
      );
    },
  },
  {
    name: "no-tautological-assertions",
    description: "No tautological set-then-assert patterns (Section 2)",
    test: () => {
      const violations = findTautologicalAssertions();

      if (violations.length > 0) {
        console.log(
          `\n  ⚠️  Found ${violations.length} tautological assertion(s):`,
        );
        for (const v of violations) {
          console.log(
            `     - ${v.file}:${v.assignLine}->${v.assertLine} "${v.property}"`,
          );
          console.log(`       ${v.reason}`);
        }
        console.log("");
      }

      expectStrictEqual(
        violations.length,
        0,
        `Found ${violations.length} tautological assertion(s)`,
      );
    },
  },
];

export default createTestRunner("test-quality", testCases);
