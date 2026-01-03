import { describe, test, expect } from "bun:test";
import {
  analyzeFiles,
  assertNoViolations,
  findPatterns,
} from "#test/code-scanner.js";
import { TEST_FILES } from "#test/test-utils.js";

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

// Test name patterns to look for
const TEST_NAME_PATTERNS = [
  /^\s*name:\s*["']([^"']+)["']/, // { name: "test-name", ... }
  /^\s*it\s*\(\s*["']([^"']+)["']/, // it("test name", ...)
];

/**
 * Extract test case names from source code using multiple patterns.
 */
const extractTestNames = (source, relativePath) =>
  findPatterns(source, TEST_NAME_PATTERNS, (match, lineNum) => ({
    name: match[1],
    line: lineNum,
    file: relativePath,
  }));

// Keep for backwards compatibility in tests
const extractTestCases = extractTestNames;
const extractDescribeItTests = (source, relativePath) =>
  extractTestNames(source, relativePath).filter((t) =>
    TEST_NAME_PATTERNS[1].test(`  it('${t.name}'`),
  );

/**
 * Check for vague test names.
 */
const findVagueTestNames = () => {
  return analyzeFiles(TEST_FILES, (source, relativePath) => {
    const violations = [];
    const testCases = extractTestNames(source, relativePath);

    for (const testCase of testCases) {
      for (const pattern of VAGUE_NAME_PATTERNS) {
        if (pattern.test(testCase.name)) {
          violations.push({
            file: relativePath,
            line: testCase.line,
            code: testCase.name,
            reason: `Vague test name "${testCase.name}" - use descriptive name`,
          });
          break;
        }
      }
    }
    return violations;
  });
};

/**
 * Check for test names with multiple "and"s suggesting multiple concerns.
 */
const findMultiConcernTestNames = () => {
  const filesToCheck = TEST_FILES.filter((f) => !AND_NAME_EXCEPTIONS.has(f));

  return analyzeFiles(filesToCheck, (source, relativePath) => {
    const violations = [];
    const testCases = extractTestNames(source, relativePath);

    for (const testCase of testCases) {
      const andCount = (testCase.name.match(/-and-/g) || []).length;
      if (andCount >= 2) {
        violations.push({
          file: relativePath,
          line: testCase.line,
          code: testCase.name,
          reason: `Test name has ${andCount} "and"s - consider splitting`,
        });
      }
    }
    return violations;
  });
};

/**
 * Check for asyncTest without real await operations.
 */
const findAsyncTestsWithoutAwait = () => {
  return analyzeFiles(TEST_FILES, (source, relativePath) => {
    const violations = [];
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
            code: testName,
            reason: `asyncTest without await - use sync "test" instead`,
          });
        }
      }
    }
    return violations;
  });
};

/**
 * Check for assertions without descriptive messages.
 * Section 4: Clear Failure Semantics
 */
const findAssertionsWithoutMessages = () => {
  // Skip code-quality tests (meta-tests)
  const testFilesToCheck = TEST_FILES.filter(
    (f) => !f.includes("code-quality/"),
  );

  return analyzeFiles(testFilesToCheck, (source, relativePath) => {
    const violations = [];
    const lines = source.split("\n");

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      const truncatedCode =
        line.substring(0, 50) + (line.length > 50 ? "..." : "");

      // Match assert.strictEqual(a, b) without third parameter
      if (/assert\.strictEqual\s*\([^,]+,[^,)]+\)\s*[;,)]?\s*$/.test(line)) {
        violations.push({
          file: relativePath,
          line: i + 1,
          code: truncatedCode,
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
          code: truncatedCode,
          reason: "assert.deepStrictEqual missing message parameter",
        });
      }

      // Match assert.ok(x) without message
      if (/assert\.ok\s*\([^,)]+\)\s*[;,)]?\s*$/.test(line)) {
        violations.push({
          file: relativePath,
          line: i + 1,
          code: truncatedCode,
          reason: "assert.ok missing message parameter",
        });
      }
    }
    return violations;
  });
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
  const testFilesToCheck = TEST_FILES.filter(
    (f) => !f.includes("code-quality/"),
  );

  return analyzeFiles(testFilesToCheck, (source, relativePath) => {
    const violations = [];
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
              line: i + 1,
              code: prop,
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
    return violations;
  });
};

// ============================================
// Test Cases
// ============================================

describe("test-quality", () => {
  test("Correctly extracts test case names from testCases array", () => {
    const source = `
const testCases = [
  {
    name: "my-test",
    description: "Does something",
    test: () => {}
  }
];`;
    const cases = extractTestCases(source, "test.js");
    expect(cases.length).toBe(1);
    expect(cases[0].name).toBe("my-test");
  });

  test("Correctly extracts it() test names", () => {
    const source = `
describe("module", () => {
  it("should do something", () => {});
  it('handles edge case', () => {});
});`;
    const cases = extractDescribeItTests(source, "test.js");
    expect(cases.length).toBe(2);
    expect(cases[0].name).toBe("should do something");
  });

  test("Detects vague test names", () => {
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
      expect(isVague).toBe(true);
    }
  });

  test("Does not flag good descriptive test names", () => {
    const goodNames = [
      "addItem-increments-quantity",
      "getCart-returns-empty-array-initially",
      "parseConfig-handles-missing-keys",
      "basic-functionality-works",
    ];
    for (const name of goodNames) {
      const isVague = VAGUE_NAME_PATTERNS.some((p) => p.test(name));
      expect(isVague).toBe(false);
    }
  });

  test("Detects set-then-assert tautological patterns", () => {
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

    expect(foundTautology).toBe(true);
  });

  test("No tests have vague names (Section 4)", () => {
    const violations = findVagueTestNames();
    assertNoViolations(violations, {
      message: "vague test name(s)",
      fixHint: "use descriptive test names",
    });
  });

  test("No tests have multiple 'and's (Section 6)", () => {
    const violations = findMultiConcernTestNames();
    assertNoViolations(violations, {
      message: "multi-concern test(s)",
      fixHint: "split tests that test multiple things",
    });
  });

  test("asyncTest functions have real await (Section 9)", () => {
    const violations = findAsyncTestsWithoutAwait();
    assertNoViolations(violations, {
      message: "asyncTest(s) without await",
      fixHint: 'use sync "test" instead of asyncTest when no await needed',
    });
  });

  test("Assertions have descriptive messages (Section 4)", () => {
    const violations = findAssertionsWithoutMessages();
    assertNoViolations(violations, {
      message: "assertion(s) without messages",
      fixHint: "add descriptive message as third parameter to assertions",
    });
  });

  test("No tautological set-then-assert patterns (Section 2)", () => {
    const violations = findTautologicalAssertions();
    assertNoViolations(violations, {
      message: "tautological assertion(s)",
      fixHint: "test actual behavior, not just set-then-check patterns",
    });
  });
});
