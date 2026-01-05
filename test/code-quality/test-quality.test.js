import { describe, expect, test } from "bun:test";
import {
  analyzeFiles,
  assertNoViolations,
  findPatterns,
  scanLines,
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
// Functional Utilities
// ============================================

// Curried predicate: checks if name matches any vague pattern
const matchesAnyVaguePattern = (name) =>
  VAGUE_NAME_PATTERNS.some((p) => p.test(name));

// Curried predicate: counts "and" occurrences in name
const countAnds = (name) => (name.match(/-and-/g) || []).length;

// Curried violation creator: (reasonFn) => (testCase) => violation
const createViolation = (reasonFn) => (testCase) => ({
  file: testCase.file,
  line: testCase.line,
  code: testCase.name,
  reason: reasonFn(testCase),
});

// Curried filter + map: transforms test cases to violations if predicate matches
const toViolationsWhere = (predicate, toViolation) => (testCases) =>
  testCases.filter(predicate).map(toViolation);

// ============================================
// Test Name Extraction
// ============================================

// Test name patterns to look for
const TEST_NAME_PATTERNS = [
  /^\s*name:\s*["']([^"']+)["']/, // { name: "test-name", ... }
  /^\s*it\s*\(\s*["']([^"']+)["']/, // it("test name", ...)
];

/**
 * Extract test case names from source code using multiple patterns.
 * Pure function: (source, relativePath) => testCases[]
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

// ============================================
// Analysis Functions (Pure + Composable)
// ============================================

// Vague name violation creator
const vagueViolation = createViolation(
  (tc) => `Vague test name "${tc.name}" - use descriptive name`,
);

// Multi-concern violation creator
const multiConcernViolation = createViolation(
  (tc) => `Test name has ${countAnds(tc.name)} "and"s - consider splitting`,
);

/**
 * Check for vague test names.
 * Pure: () => violations[]
 */
const findVagueTestNames = () =>
  analyzeFiles(TEST_FILES(), (source, relativePath) =>
    toViolationsWhere(
      (tc) => matchesAnyVaguePattern(tc.name),
      vagueViolation,
    )(extractTestNames(source, relativePath)),
  );

/**
 * Check for test names with multiple "and"s suggesting multiple concerns.
 * Pure: () => violations[]
 */
const findMultiConcernTestNames = () => {
  const filesToCheck = TEST_FILES().filter((f) => !AND_NAME_EXCEPTIONS.has(f));

  return analyzeFiles(filesToCheck, (source, relativePath) =>
    toViolationsWhere(
      (tc) => countAnds(tc.name) >= 2,
      multiConcernViolation,
    )(extractTestNames(source, relativePath)),
  );
};

// ============================================
// Async Test Analysis (Functional Brace Tracking)
// ============================================

/**
 * Extract function body starting at a given line using brace counting.
 * Pure function: (lines, startIndex) => string
 */
const extractFunctionBody = (lines, startIndex) => {
  const extractState = lines.slice(startIndex).reduce(
    (state, line) => {
      if (state.done) return state;

      const newBody = [...state.body, line];
      const braceChanges = [...line].reduce(
        (acc, char) => ({
          depth: acc.depth + (char === "{" ? 1 : char === "}" ? -1 : 0),
          started: acc.started || char === "{",
        }),
        { depth: state.depth, started: state.started },
      );

      const isDone = braceChanges.started && braceChanges.depth === 0;

      return {
        body: newBody,
        depth: braceChanges.depth,
        started: braceChanges.started,
        done: isDone,
      };
    },
    { body: [], depth: 0, started: false, done: false },
  );

  return extractState.body.join("\n");
};

/**
 * Find test name by searching backwards from a line.
 * Pure function: (lines, startIndex, maxLookback) => string
 */
const findTestNameBackwards = (lines, startIndex, maxLookback = 10) => {
  const searchRange = lines.slice(
    Math.max(0, startIndex - maxLookback),
    startIndex,
  );

  const found = searchRange
    .reverse()
    .map((line) => line.match(/name:\s*["']([^"']+)["']/))
    .find((match) => match !== null);

  return found ? found[1] : "unknown";
};

/**
 * Check if function body has real await operations.
 * Pure predicate: (body) => boolean
 */
const hasRealAwait = (body) => {
  const awaitMatches = body.match(/await\s+[^;,\n]+/g) || [];
  return awaitMatches.some(
    (expr) =>
      !expr.includes("Promise.resolve") && !expr.includes("Promise.reject"),
  );
};

/**
 * Check for asyncTest without real await operations.
 * Pure: () => violations[]
 */
const findAsyncTestsWithoutAwait = () =>
  analyzeFiles(TEST_FILES(), (source, relativePath) => {
    const lines = source.split("\n");

    return scanLines(source, (line, lineNum) => {
      if (!/asyncTest:\s*async/.test(line)) return null;

      const lineIndex = lineNum - 1;
      const testName = findTestNameBackwards(lines, lineIndex);
      const funcBody = extractFunctionBody(lines, lineIndex);

      return hasRealAwait(funcBody)
        ? null
        : {
            file: relativePath,
            line: lineNum,
            code: testName,
            reason: 'asyncTest without await - use sync "test" instead',
          };
    });
  });

// ============================================
// Assertion Analysis (Pattern-Based)
// ============================================

// Assertion patterns that need messages (pattern, method name)
const ASSERTION_PATTERNS = [
  [/assert\.strictEqual\s*\([^,]+,[^,)]+\)\s*[;,)]?\s*$/, "strictEqual"],
  [
    /assert\.deepStrictEqual\s*\([^,]+,[^,)]+\)\s*[;,)]?\s*$/,
    "deepStrictEqual",
  ],
  [/assert\.ok\s*\([^,)]+\)\s*[;,)]?\s*$/, "ok"],
];

/**
 * Check a single line for assertion without message.
 * Pure: (line, lineNum, relativePath) => violation | null
 */
const checkLineForAssertionWithoutMessage = (line, lineNum, relativePath) => {
  const trimmed = line.trim();
  const truncated =
    trimmed.substring(0, 50) + (trimmed.length > 50 ? "..." : "");

  const match = ASSERTION_PATTERNS.find(([pattern]) => pattern.test(trimmed));

  return match
    ? {
        file: relativePath,
        line: lineNum,
        code: truncated,
        reason: `assert.${match[1]} missing message parameter`,
      }
    : null;
};

/**
 * Check for assertions without descriptive messages.
 * Section 4: Clear Failure Semantics
 * Pure: () => violations[]
 */
const findAssertionsWithoutMessages = () => {
  const testFilesToCheck = TEST_FILES().filter(
    (f) => !f.includes("code-quality/"),
  );

  return analyzeFiles(testFilesToCheck, (source, relativePath) =>
    scanLines(source, (line, lineNum) =>
      checkLineForAssertionWithoutMessage(line, lineNum, relativePath),
    ),
  );
};

// ============================================
// Tautological Assertion Detection (Functional)
// ============================================

// Pattern matchers for assignments and assertions
const ASSIGNMENT_PATTERN = /^(\w+(?:\.\w+)+)\s*=\s*([^;]+);?\s*$/;
const ASSERT_PATTERN = /assert\.(?:strictEqual|ok)\s*\(\s*(\w+(?:\.\w+)+)/;

/**
 * Extract all assignments from source as [{prop, lineNum}].
 * Pure: (lines) => assignments[]
 */
const extractAssignments = (lines) =>
  lines.flatMap((line, index) => {
    const match = line.trim().match(ASSIGNMENT_PATTERN);
    return match ? [{ prop: match[1], lineNum: index + 1 }] : [];
  });

/**
 * Extract all assertions from source as [{prop, lineNum}].
 * Pure: (lines) => assertions[]
 */
const extractAssertions = (lines) =>
  lines.flatMap((line, index) => {
    const match = line.trim().match(ASSERT_PATTERN);
    return match ? [{ prop: match[1], lineNum: index + 1 }] : [];
  });

/**
 * Find the most recent assignment for a property before a given line.
 * Pure: (assignments, prop, beforeLine, maxDistance) => lineNum | undefined
 */
const findRecentAssignment = (assignments, prop, beforeLine, maxDistance) => {
  const matching = assignments
    .filter((a) => a.prop === prop && a.lineNum < beforeLine)
    .filter((a) => beforeLine - a.lineNum <= maxDistance);
  return matching.length > 0
    ? matching[matching.length - 1].lineNum
    : undefined;
};

/**
 * Scan for set-then-assert patterns.
 * Pure: (source, relativePath) => violations[]
 */
const findTautologiesInSource = (source, relativePath) => {
  const lines = source.split("\n");
  const maxDistance = 5;

  const assignments = extractAssignments(lines);
  const assertions = extractAssertions(lines);

  return assertions
    .map((assertion) => {
      const assignLine = findRecentAssignment(
        assignments,
        assertion.prop,
        assertion.lineNum,
        maxDistance,
      );
      return assignLine !== undefined
        ? {
            file: relativePath,
            line: assertion.lineNum,
            code: assertion.prop,
            reason: `Set "${assertion.prop}" on line ${assignLine}, then assert on line ${assertion.lineNum} - tests nothing`,
          }
        : null;
    })
    .filter((v) => v !== null);
};

/**
 * Check for tautological assertions.
 * Section 2: Not Tautological
 * Pure: () => violations[]
 */
const findTautologicalAssertions = () => {
  const testFilesToCheck = TEST_FILES().filter(
    (f) => !f.includes("code-quality/"),
  );

  return analyzeFiles(testFilesToCheck, findTautologiesInSource);
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
      expect(matchesAnyVaguePattern(name)).toBe(true);
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
      expect(matchesAnyVaguePattern(name)).toBe(false);
    }
  });

  test("Detects set-then-assert tautological patterns", () => {
    const source = `
        button.disabled = false;
        assert.strictEqual(button.disabled, false);
      `;
    const violations = findTautologiesInSource(source, "test.js");
    expect(violations.length).toBe(1);
  });

  test("Does not flag assertions without prior assignments", () => {
    const source = `
        const result = computeValue();
        assert.strictEqual(result.status, true);
      `;
    const violations = findTautologiesInSource(source, "test.js");
    expect(violations.length).toBe(0);
  });

  test("Does not flag assertions too far from assignments", () => {
    const source = `
        button.disabled = false;
        line1;
        line2;
        line3;
        line4;
        line5;
        line6;
        assert.strictEqual(button.disabled, false);
      `;
    const violations = findTautologiesInSource(source, "test.js");
    expect(violations.length).toBe(0);
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
