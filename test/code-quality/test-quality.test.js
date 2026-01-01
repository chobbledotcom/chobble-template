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

// Grandfathered assertions without messages
// Format: "file:line" - these should be fixed over time
// Total: 156 violations to be addressed
const MISSING_MESSAGE_EXCEPTIONS = new Set([
  // test/canonical-url.test.js (7)
  "test/canonical-url.test.js:10",
  "test/canonical-url.test.js:14",
  "test/canonical-url.test.js:18",
  "test/canonical-url.test.js:22",
  "test/canonical-url.test.js:26",
  "test/canonical-url.test.js:30",
  "test/canonical-url.test.js:31",
  // test/checkout.test.js (54)
  "test/checkout.test.js:255",
  "test/checkout.test.js:269",
  "test/checkout.test.js:284",
  "test/checkout.test.js:310",
  "test/checkout.test.js:311",
  "test/checkout.test.js:319",
  "test/checkout.test.js:320",
  "test/checkout.test.js:321",
  "test/checkout.test.js:333",
  "test/checkout.test.js:353",
  "test/checkout.test.js:354",
  "test/checkout.test.js:839",
  "test/checkout.test.js:958",
  "test/checkout.test.js:959",
  "test/checkout.test.js:960",
  "test/checkout.test.js:961",
  "test/checkout.test.js:962",
  "test/checkout.test.js:1006",
  "test/checkout.test.js:1007",
  "test/checkout.test.js:1024",
  "test/checkout.test.js:1029",
  "test/checkout.test.js:1030",
  "test/checkout.test.js:1031",
  "test/checkout.test.js:1032",
  "test/checkout.test.js:1080",
  "test/checkout.test.js:1081",
  "test/checkout.test.js:1082",
  "test/checkout.test.js:1083",
  "test/checkout.test.js:1084",
  "test/checkout.test.js:1276",
  "test/checkout.test.js:1277",
  "test/checkout.test.js:1321",
  "test/checkout.test.js:1344",
  "test/checkout.test.js:1346",
  "test/checkout.test.js:1375",
  "test/checkout.test.js:1392",
  "test/checkout.test.js:1477",
  "test/checkout.test.js:1478",
  "test/checkout.test.js:1479",
  "test/checkout.test.js:1480",
  "test/checkout.test.js:1481",
  "test/checkout.test.js:1501",
  "test/checkout.test.js:1502",
  "test/checkout.test.js:1583",
  "test/checkout.test.js:1585",
  "test/checkout.test.js:1590",
  "test/checkout.test.js:1591",
  "test/checkout.test.js:1592",
  "test/checkout.test.js:1593",
  "test/checkout.test.js:1595",
  "test/checkout.test.js:1596",
  "test/checkout.test.js:1597",
  "test/checkout.test.js:1598",
  "test/checkout.test.js:1634",
  "test/checkout.test.js:1635",
  // test/schema-helper.test.js (57)
  "test/schema-helper.test.js:21",
  "test/schema-helper.test.js:22",
  "test/schema-helper.test.js:35",
  "test/schema-helper.test.js:46",
  "test/schema-helper.test.js:59",
  "test/schema-helper.test.js:72",
  "test/schema-helper.test.js:86",
  "test/schema-helper.test.js:100",
  "test/schema-helper.test.js:113",
  "test/schema-helper.test.js:157",
  "test/schema-helper.test.js:173",
  "test/schema-helper.test.js:186",
  "test/schema-helper.test.js:202",
  "test/schema-helper.test.js:203",
  "test/schema-helper.test.js:217",
  "test/schema-helper.test.js:218",
  "test/schema-helper.test.js:231",
  "test/schema-helper.test.js:232",
  "test/schema-helper.test.js:233",
  "test/schema-helper.test.js:238",
  "test/schema-helper.test.js:251",
  "test/schema-helper.test.js:264",
  "test/schema-helper.test.js:277",
  "test/schema-helper.test.js:290",
  "test/schema-helper.test.js:302",
  "test/schema-helper.test.js:327",
  "test/schema-helper.test.js:328",
  "test/schema-helper.test.js:329",
  "test/schema-helper.test.js:330",
  "test/schema-helper.test.js:331",
  "test/schema-helper.test.js:332",
  "test/schema-helper.test.js:358",
  "test/schema-helper.test.js:379",
  "test/schema-helper.test.js:380",
  "test/schema-helper.test.js:381",
  "test/schema-helper.test.js:402",
  "test/schema-helper.test.js:423",
  "test/schema-helper.test.js:424",
  "test/schema-helper.test.js:439",
  "test/schema-helper.test.js:440",
  "test/schema-helper.test.js:452",
  "test/schema-helper.test.js:464",
  "test/schema-helper.test.js:480",
  "test/schema-helper.test.js:481",
  "test/schema-helper.test.js:482",
  "test/schema-helper.test.js:484",
  "test/schema-helper.test.js:485",
  "test/schema-helper.test.js:509",
  "test/schema-helper.test.js:523",
  "test/schema-helper.test.js:524",
  "test/schema-helper.test.js:543",
  "test/schema-helper.test.js:544",
  "test/schema-helper.test.js:545",
  "test/schema-helper.test.js:558",
  "test/schema-helper.test.js:570",
  // test/slug-utils.test.js (17)
  "test/slug-utils.test.js:11",
  "test/slug-utils.test.js:12",
  "test/slug-utils.test.js:13",
  "test/slug-utils.test.js:17",
  "test/slug-utils.test.js:18",
  "test/slug-utils.test.js:22",
  "test/slug-utils.test.js:23",
  "test/slug-utils.test.js:27",
  "test/slug-utils.test.js:31",
  "test/slug-utils.test.js:32",
  "test/slug-utils.test.js:36",
  "test/slug-utils.test.js:76",
  "test/slug-utils.test.js:81",
  "test/slug-utils.test.js:86",
  "test/slug-utils.test.js:91",
  "test/slug-utils.test.js:96",
  // test/sorting.test.js (2)
  "test/sorting.test.js:61",
  "test/sorting.test.js:63",
  // test/spec-filters.test.js (23)
  "test/spec-filters.test.js:7",
  "test/spec-filters.test.js:11",
  "test/spec-filters.test.js:15",
  "test/spec-filters.test.js:19",
  "test/spec-filters.test.js:29",
  "test/spec-filters.test.js:30",
  "test/spec-filters.test.js:39",
  "test/spec-filters.test.js:56",
  "test/spec-filters.test.js:61",
  "test/spec-filters.test.js:66",
  "test/spec-filters.test.js:75",
  "test/spec-filters.test.js:77",
  "test/spec-filters.test.js:78",
  "test/spec-filters.test.js:94",
  "test/spec-filters.test.js:95",
  "test/spec-filters.test.js:96",
  "test/spec-filters.test.js:97",
  "test/spec-filters.test.js:106",
  "test/spec-filters.test.js:115",
  "test/spec-filters.test.js:131",
  "test/spec-filters.test.js:133",
  "test/spec-filters.test.js:134",
  "test/spec-filters.test.js:135",
  "test/spec-filters.test.js:137",
]);

// Grandfathered tautological patterns
const TAUTOLOGICAL_EXCEPTIONS = new Set([
  // test/checkout.test.js - sets DOM properties then asserts
  "test/checkout.test.js:1630:1633", // button.disabled = false then assert
  "test/checkout.test.js:1631:1636", // button.textContent then assert includes
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
          const location = `${relativePath}:${i + 1}`;
          if (!ASYNC_TEST_EXCEPTIONS.has(location)) {
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
      const location = `${relativePath}:${i + 1}`;

      // Skip if grandfathered
      if (MISSING_MESSAGE_EXCEPTIONS.has(location)) {
        continue;
      }

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
            const exceptionKey = `${relativePath}:${assignment.line}:${i + 1}`;
            if (!TAUTOLOGICAL_EXCEPTIONS.has(exceptionKey)) {
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
