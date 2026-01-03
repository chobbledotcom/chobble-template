import { describe, expect, test } from "bun:test";
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
// Test Quality Checker Factory
// Consolidates all test quality analysis functions
// ============================================

/**
 * Factory that creates a test quality checker with methods for:
 * - Extracting test names from source
 * - Finding vague test names
 * - Finding multi-concern tests
 * - Finding async tests without await
 * - Finding assertions without messages
 * - Finding tautological assertions
 */
const createTestQualityChecker = (testFiles, config = {}) => {
  const {
    andNameExceptions = new Set(["test/theme-editor.test.js"]),
    vagueNamePatterns = [
      /^test-?\d+$/i,
      /^test$/i,
      /^works$/i,
      /^it-works$/i,
      /^should-work$/i,
      /^basic$/i,
      /^simple$/i,
      /^default$/i,
    ],
    testNamePatterns = [
      /^\s*name:\s*["']([^"']+)["']/,
      /^\s*it\s*\(\s*["']([^"']+)["']/,
    ],
  } = config;

  // ----------------------------------------
  // Extraction methods
  // ----------------------------------------

  const extractTestNames = (source, relativePath) =>
    findPatterns(source, testNamePatterns, (match, lineNum) => ({
      name: match[1],
      line: lineNum,
      file: relativePath,
    }));

  const extractDescribeItTests = (source, relativePath) =>
    extractTestNames(source, relativePath).filter((t) =>
      testNamePatterns[1].test(`  it('${t.name}'`),
    );

  // ----------------------------------------
  // Analysis methods
  // ----------------------------------------

  const findVagueTestNames = () =>
    analyzeFiles(testFiles, (source, relativePath) => {
      const violations = [];
      for (const testCase of extractTestNames(source, relativePath)) {
        for (const pattern of vagueNamePatterns) {
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

  const findMultiConcernTestNames = () => {
    const filesToCheck = testFiles.filter((f) => !andNameExceptions.has(f));
    return analyzeFiles(filesToCheck, (source, relativePath) => {
      const violations = [];
      for (const testCase of extractTestNames(source, relativePath)) {
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

  const findAsyncTestsWithoutAwait = () =>
    analyzeFiles(testFiles, (source, relativePath) => {
      const violations = [];
      const lines = source.split("\n");

      for (let i = 0; i < lines.length; i++) {
        if (!/asyncTest:\s*async/.test(lines[i])) continue;

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
          for (const char of lines[j]) {
            if (char === "{") {
              braceCount++;
              started = true;
            } else if (char === "}") braceCount--;
          }
          funcBody += `${lines[j]}\n`;
          if (started && braceCount === 0) break;
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
      return violations;
    });

  const findAssertionsWithoutMessages = () => {
    const filesToCheck = testFiles.filter((f) => !f.includes("code-quality/"));
    return analyzeFiles(filesToCheck, (source, relativePath) => {
      const violations = [];
      const lines = source.split("\n");

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        const truncatedCode =
          line.substring(0, 50) + (line.length > 50 ? "..." : "");

        if (/assert\.strictEqual\s*\([^,]+,[^,)]+\)\s*[;,)]?\s*$/.test(line)) {
          violations.push({
            file: relativePath,
            line: i + 1,
            code: truncatedCode,
            reason: "assert.strictEqual missing message parameter",
          });
        }
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

  const findTautologicalAssertions = () => {
    const filesToCheck = testFiles.filter((f) => !f.includes("code-quality/"));
    return analyzeFiles(filesToCheck, (source, relativePath) => {
      const violations = [];
      const lines = source.split("\n");
      const recentAssignments = new Map();

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();

        const assignMatch = line.match(/^(\w+(?:\.\w+)+)\s*=\s*([^;]+);?\s*$/);
        if (assignMatch) {
          recentAssignments.set(assignMatch[1], {
            value: assignMatch[2].trim(),
            line: i + 1,
          });
          continue;
        }

        const assertMatch = line.match(
          /assert\.(?:strictEqual|ok)\s*\(\s*(\w+(?:\.\w+)+)/,
        );
        if (assertMatch) {
          const prop = assertMatch[1];
          const assignment = recentAssignments.get(prop);
          if (assignment) {
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

        for (const [key, val] of recentAssignments) {
          if (i + 1 - val.line > 10) recentAssignments.delete(key);
        }
      }
      return violations;
    });
  };

  return {
    extractTestNames,
    extractDescribeItTests,
    findVagueTestNames,
    findMultiConcernTestNames,
    findAsyncTestsWithoutAwait,
    findAssertionsWithoutMessages,
    findTautologicalAssertions,
  };
};

// Create checker instance with default config
const testQualityChecker = createTestQualityChecker(TEST_FILES);

// Aliases for backwards compatibility in tests
const extractTestCases = testQualityChecker.extractTestNames;
const extractDescribeItTests = testQualityChecker.extractDescribeItTests;

// Vague name patterns exposed for unit testing
const VAGUE_NAME_PATTERNS = [
  /^test-?\d+$/i,
  /^test$/i,
  /^works$/i,
  /^it-works$/i,
  /^should-work$/i,
  /^basic$/i,
  /^simple$/i,
  /^default$/i,
];

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
    const violations = testQualityChecker.findVagueTestNames();
    assertNoViolations(violations, {
      message: "vague test name(s)",
      fixHint: "use descriptive test names",
    });
  });

  test("No tests have multiple 'and's (Section 6)", () => {
    const violations = testQualityChecker.findMultiConcernTestNames();
    assertNoViolations(violations, {
      message: "multi-concern test(s)",
      fixHint: "split tests that test multiple things",
    });
  });

  test("asyncTest functions have real await (Section 9)", () => {
    const violations = testQualityChecker.findAsyncTestsWithoutAwait();
    assertNoViolations(violations, {
      message: "asyncTest(s) without await",
      fixHint: 'use sync "test" instead of asyncTest when no await needed',
    });
  });

  test("Assertions have descriptive messages (Section 4)", () => {
    const violations = testQualityChecker.findAssertionsWithoutMessages();
    assertNoViolations(violations, {
      message: "assertion(s) without messages",
      fixHint: "add descriptive message as third parameter to assertions",
    });
  });

  test("No tautological set-then-assert patterns (Section 2)", () => {
    const violations = testQualityChecker.findTautologicalAssertions();
    assertNoViolations(violations, {
      message: "tautological assertion(s)",
      fixHint: "test actual behavior, not just set-then-check patterns",
    });
  });
});
