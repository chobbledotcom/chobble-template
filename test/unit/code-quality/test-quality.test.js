import { describe, expect, test } from "bun:test";
import {
  analyzeFiles,
  assertNoViolations,
  createViolation,
  findPatterns,
  scanLines,
} from "#test/code-scanner.js";
import { TEST_FILES } from "#test/test-utils.js";
import { compact, filterMap } from "#toolkit/fp/array.js";

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

// ============================================
// Analysis Functions (Pure + Composable)
// ============================================

// Helper: Check if name matches any vague pattern
const isVagueName = (name) => VAGUE_NAME_PATTERNS.some((p) => p.test(name));

/**
 * Check for vague test names.
 * Pure: () => violations[]
 */
const findVagueTestNames = () =>
  analyzeFiles(TEST_FILES(), (source, relativePath) =>
    filterMap(
      (tc) => isVagueName(tc.name),
      createViolation(
        (tc) => `Vague test name "${tc.name}" - use descriptive name`,
      ),
    )(extractTestNames(source, relativePath)),
  );

/**
 * Check for test names with multiple "and"s suggesting multiple concerns.
 * Pure: () => violations[]
 */
const findMultiConcernTestNames = () =>
  analyzeFiles(
    TEST_FILES().filter((f) => !AND_NAME_EXCEPTIONS.has(f)),
    (source, relativePath) =>
      filterMap(
        (tc) => {
          const andCount = (tc.name.match(/-and-/g) || []).length;
          return andCount >= 2;
        },
        createViolation((tc) => {
          const andCount = (tc.name.match(/-and-/g) || []).length;
          return `Test name has ${andCount} "and"s - consider splitting`;
        }),
      )(extractTestNames(source, relativePath)),
  );

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

      // Find test name by searching backwards (inline)
      const searchRange = lines.slice(Math.max(0, lineIndex - 10), lineIndex);
      const nameMatch = searchRange
        .reverse()
        .map((l) => l.match(/name:\s*["']([^"']+)["']/))
        .find((m) => m !== null);
      const testName = nameMatch ? nameMatch[1] : "unknown";

      // Extract function body using brace counting (inline)
      const extractState = lines.slice(lineIndex).reduce(
        (state, l) => {
          if (state.done) return state;
          const braceChanges = [...l].reduce(
            (acc, char) => ({
              depth: acc.depth + (char === "{" ? 1 : char === "}" ? -1 : 0),
              started: acc.started || char === "{",
            }),
            { depth: state.depth, started: state.started },
          );
          return {
            body: [...state.body, l],
            depth: braceChanges.depth,
            started: braceChanges.started,
            done: braceChanges.started && braceChanges.depth === 0,
          };
        },
        { body: [], depth: 0, started: false, done: false },
      );
      const funcBody = extractState.body.join("\n");

      // Check if function body has real await operations (inline)
      const awaitMatches = funcBody.match(/await\s+[^;,\n]+/g) || [];
      const hasRealAwait = awaitMatches.some(
        (expr) =>
          !expr.includes("Promise.resolve") && !expr.includes("Promise.reject"),
      );

      return hasRealAwait
        ? null
        : createViolation(
            () => 'asyncTest without await - use sync "test" instead',
          )({
            file: relativePath,
            line: lineNum,
            name: testName,
          });
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
 * Check for assertions without descriptive messages.
 * Section 4: Clear Failure Semantics
 * Pure: () => violations[]
 */
const findAssertionsWithoutMessages = () =>
  analyzeFiles(
    TEST_FILES().filter((f) => !f.includes("code-quality/")),
    (source, relativePath) =>
      scanLines(source, (line, lineNum) => {
        const trimmed = line.trim();
        const match = ASSERTION_PATTERNS.find(([pattern]) =>
          pattern.test(trimmed),
        );

        return match
          ? createViolation(
              () => `assert.${match[1]} missing message parameter`,
            )({
              file: relativePath,
              line: lineNum,
              code:
                trimmed.substring(0, 50) + (trimmed.length > 50 ? "..." : ""),
            })
          : null;
      }),
  );

// ============================================
// Tautological Assertion Detection (Functional)
// ============================================

// Pattern matchers for assignments and assertions
const ASSIGNMENT_PATTERN = /^(\w+(?:\.\w+)+)\s*=\s*([^;]+);?\s*$/;
const ASSERT_PATTERN = /assert\.(?:strictEqual|ok)\s*\(\s*(\w+(?:\.\w+)+)/;

/**
 * Scan for set-then-assert patterns.
 * Pure: (source, relativePath) => violations[]
 */
const findTautologiesInSource = (source, relativePath) => {
  const lines = source.split("\n");
  const maxDistance = 5;

  // Extract all assignments and assertions inline
  const assignments = lines.flatMap((line, i) => {
    const m = line.trim().match(ASSIGNMENT_PATTERN);
    return m ? [{ prop: m[1], lineNum: i + 1 }] : [];
  });

  const assertions = lines.flatMap((line, i) => {
    const m = line.trim().match(ASSERT_PATTERN);
    return m ? [{ prop: m[1], lineNum: i + 1 }] : [];
  });

  return compact(
    assertions.map((assertion) => {
      // Find most recent assignment inline
      const matching = assignments
        .filter(
          (a) => a.prop === assertion.prop && a.lineNum < assertion.lineNum,
        )
        .filter((a) => assertion.lineNum - a.lineNum <= maxDistance);
      const assignLine =
        matching.length > 0 ? matching[matching.length - 1].lineNum : undefined;

      return assignLine !== undefined
        ? createViolation(
            (ctx) =>
              `Set "${ctx.code}" on line ${assignLine}, then assert on line ${ctx.line} - tests nothing`,
          )({
            file: relativePath,
            line: assertion.lineNum,
            code: assertion.prop,
          })
        : null;
    }),
  );
};

/**
 * Check for tautological assertions.
 * Section 2: Not Tautological
 * Pure: () => violations[]
 */
const findTautologicalAssertions = () =>
  analyzeFiles(
    TEST_FILES().filter((f) => !f.includes("code-quality/")),
    findTautologiesInSource,
  );

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
    const cases = extractTestNames(source, "test.js");
    expect(cases.length).toBe(1);
    expect(cases[0].name).toBe("my-test");
  });

  test("Correctly extracts it() test names", () => {
    const source = `
describe("module", () => {
  it("should do something", () => {});
  it('handles edge case', () => {});
});`;
    const cases = extractTestNames(source, "test.js").filter((t) =>
      TEST_NAME_PATTERNS[1].test(`  it('${t.name}'`),
    );
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
      expect(isVagueName(name)).toBe(true);
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
      expect(isVagueName(name)).toBe(false);
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
      singular: "vague test name",
      fixHint: "use descriptive test names",
    });
  });

  test("No tests have multiple 'and's (Section 6)", () => {
    const violations = findMultiConcernTestNames();
    assertNoViolations(violations, {
      singular: "multi-concern test",
      fixHint: "split tests that test multiple things",
    });
  });

  test("asyncTest functions have real await (Section 9)", () => {
    const violations = findAsyncTestsWithoutAwait();
    assertNoViolations(violations, {
      singular: "asyncTest without await",
      plural: "asyncTests without await",
      fixHint: 'use sync "test" instead of asyncTest when no await needed',
    });
  });

  test("Assertions have descriptive messages (Section 4)", () => {
    const violations = findAssertionsWithoutMessages();
    assertNoViolations(violations, {
      singular: "assertion without message",
      plural: "assertions without messages",
      fixHint: "add descriptive message as third parameter to assertions",
    });
  });

  test("No tautological set-then-assert patterns (Section 2)", () => {
    const violations = findTautologicalAssertions();
    assertNoViolations(violations, {
      singular: "tautological assertion",
      fixHint: "test actual behavior, not just set-then-check patterns",
    });
  });
});
