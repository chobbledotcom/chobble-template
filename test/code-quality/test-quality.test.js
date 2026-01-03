import { describe, expect, test } from "bun:test";
import {
  analyzeFiles,
  assertNoViolations,
  findPatterns,
} from "#test/code-scanner.js";
import { TEST_FILES } from "#test/test-utils.js";

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

const ASSERT_PATTERNS = [
  {
    pattern: /assert\.strictEqual\s*\([^,]+,[^,)]+\)\s*[;,)]?\s*$/,
    reason: "assert.strictEqual missing message parameter",
  },
  {
    pattern: /assert\.deepStrictEqual\s*\([^,]+,[^,)]+\)\s*[;,)]?\s*$/,
    reason: "assert.deepStrictEqual missing message parameter",
  },
  {
    pattern: /assert\.ok\s*\([^,)]+\)\s*[;,)]?\s*$/,
    reason: "assert.ok missing message parameter",
  },
];

const createTestQualityChecker = (testFiles, config = {}) => {
  const {
    andNameExceptions = new Set(["test/theme-editor.test.js"]),
    vagueNamePatterns = [],
    testNamePatterns = [
      /^\s*name:\s*["']([^"']+)["']/,
      /^\s*it\s*\(\s*["']([^"']+)["']/,
    ],
  } = config;

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
      const violations = [],
        lines = source.split("\n");
      for (let i = 0; i < lines.length; i++) {
        if (!/asyncTest:\s*async/.test(lines[i])) continue;
        let testName = "unknown";
        for (let j = i - 1; j >= 0 && j > i - 10; j--) {
          const m = lines[j].match(/name:\s*["']([^"']+)["']/);
          if (m) {
            testName = m[1];
            break;
          }
        }
        let braceCount = 0,
          started = false,
          funcBody = "";
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
        if (
          !awaitMatches.some(
            (e) =>
              !e.includes("Promise.resolve") && !e.includes("Promise.reject"),
          )
        ) {
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
      const violations = [],
        lines = source.split("\n");
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        for (const { pattern, reason } of ASSERT_PATTERNS) {
          if (pattern.test(line)) {
            violations.push({
              file: relativePath,
              line: i + 1,
              code: line.substring(0, 50) + (line.length > 50 ? "..." : ""),
              reason,
            });
          }
        }
      }
      return violations;
    });
  };

  const findTautologicalAssertions = () => {
    const filesToCheck = testFiles.filter((f) => !f.includes("code-quality/"));
    return analyzeFiles(filesToCheck, (source, relativePath) => {
      const violations = [],
        lines = source.split("\n"),
        recentAssignments = new Map();
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
          const prop = assertMatch[1],
            assignment = recentAssignments.get(prop);
          if (
            assignment &&
            i + 1 - assignment.line <= 5 &&
            i + 1 - assignment.line > 0
          ) {
            violations.push({
              file: relativePath,
              line: i + 1,
              code: prop,
              reason: `Set "${prop}" on line ${assignment.line}, then assert on line ${i + 1} - tests nothing`,
            });
          }
        }
        for (const [key, val] of recentAssignments)
          if (i + 1 - val.line > 10) recentAssignments.delete(key);
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

const testQualityChecker = createTestQualityChecker(TEST_FILES, {
  vagueNamePatterns: VAGUE_NAME_PATTERNS,
});

describe("test-quality", () => {
  test("Correctly extracts test case names from testCases array", () => {
    const source = `const testCases = [\n  {\n    name: "my-test",\n    test: () => {}\n  }\n];`;
    const cases = testQualityChecker.extractTestNames(source, "test.js");
    expect(cases.length).toBe(1);
    expect(cases[0].name).toBe("my-test");
  });

  test("Correctly extracts it() test names", () => {
    const source = `describe("m", () => {\n  it("should do something", () => {});\n});`;
    const cases = testQualityChecker.extractDescribeItTests(source, "test.js");
    expect(cases.length).toBe(1);
    expect(cases[0].name).toBe("should do something");
  });

  test("Detects vague test names", () => {
    for (const name of ["test-1", "test", "works", "basic", "simple"])
      expect(VAGUE_NAME_PATTERNS.some((p) => p.test(name))).toBe(true);
  });

  test("Does not flag good descriptive test names", () => {
    for (const name of [
      "addItem-increments-quantity",
      "basic-functionality-works",
    ])
      expect(VAGUE_NAME_PATTERNS.some((p) => p.test(name))).toBe(false);
  });

  test("No tests have vague names (Section 4)", () => {
    assertNoViolations(testQualityChecker.findVagueTestNames(), {
      message: "vague test name(s)",
      fixHint: "use descriptive test names",
    });
  });

  test("No tests have multiple 'and's (Section 6)", () => {
    assertNoViolations(testQualityChecker.findMultiConcernTestNames(), {
      message: "multi-concern test(s)",
      fixHint: "split tests that test multiple things",
    });
  });

  test("asyncTest functions have real await (Section 9)", () => {
    assertNoViolations(testQualityChecker.findAsyncTestsWithoutAwait(), {
      message: "asyncTest(s) without await",
      fixHint: 'use sync "test" instead of asyncTest when no await needed',
    });
  });

  test("Assertions have descriptive messages (Section 4)", () => {
    assertNoViolations(testQualityChecker.findAssertionsWithoutMessages(), {
      message: "assertion(s) without messages",
      fixHint: "add descriptive message as third parameter to assertions",
    });
  });

  test("No tautological set-then-assert patterns (Section 2)", () => {
    assertNoViolations(testQualityChecker.findTautologicalAssertions(), {
      message: "tautological assertion(s)",
      fixHint: "test actual behavior, not just set-then-check patterns",
    });
  });
});
