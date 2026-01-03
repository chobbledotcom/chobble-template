import { describe, expect, test } from "bun:test";
import {
  analyzeFiles,
  assertNoViolations,
  combineFileLists,
  isInsideTemplateLiteral,
  toLines,
} from "#test/code-scanner.js";
import {
  ECOMMERCE_JS_FILES,
  SRC_JS_FILES,
  TEST_FILES,
} from "#test/test-utils.js";

// ============================================
// Commented Code Detection
// Uses shared utilities from code-scanner.js
// ============================================

// Patterns that indicate commented-out code (not documentation)
const COMMENTED_CODE_PATTERNS = [
  /^\s*\/\/\s*(const|let|var)\s+\w+\s*=/,
  /^\s*\/\/\s*(async\s+)?function\s+\w+\s*\(/,
  /^\s*\/\/\s*(const|let|var)\s+\w+\s*=\s*(async\s*)?\(/,
  /^\s*\/\/\s*(const|let|var)\s+\w+\s*=\s*(async\s*)?function/,
  /^\s*\/\/\s*if\s*\(/,
  /^\s*\/\/\s*else\s*(\{|if)/,
  /^\s*\/\/\s*for\s*\(/,
  /^\s*\/\/\s*while\s*\(/,
  /^\s*\/\/\s*switch\s*\(/,
  /^\s*\/\/\s*do\s*\{/,
  /^\s*\/\/\s*return\s+\w+[\s;]*$/,
  /^\s*\/\/\s*return\s*;/,
  /^\s*\/\/\s*throw\s+new\s+/,
  /^\s*\/\/\s*import\s+[\w{]/,
  /^\s*\/\/\s*export\s+(const|let|var|function|class|default)/,
  /^\s*\/\/\s*console\.(log|error|warn|info|debug)\s*\(/,
  /^\s*\/\/\s*\w+\.\w+\s*\([^)]*\)\s*;\s*$/,
  /^\s*\/\/\s*\w+\s*=\s*[^=].*;\s*$/,
  /^\s*\/\/\s*await\s+\w+/,
];

/**
 * Find commented-out code in source.
 * Skips content inside template literals and documentation comments.
 */
const findCommentedCode = (source) => {
  const lines = toLines(source);
  const rawLines = lines.map((l) => l.line);

  return lines
    .filter(({ line }, i) => {
      // Skip if inside template literal (test fixtures)
      if (isInsideTemplateLiteral(rawLines, i)) return false;
      // Skip if followed by block comment (documentation pattern)
      const nextLine = i < rawLines.length - 1 ? rawLines[i + 1] : "";
      if (nextLine && /^\s*\/[^/]/.test(nextLine)) return false;
      // Check against commented code patterns
      return COMMENTED_CODE_PATTERNS.some((pattern) => pattern.test(line));
    })
    .map(({ line, num }) => ({ lineNumber: num, line: line.trim() }));
};

/**
 * Analyze files for commented-out code violations.
 */
const analyzeCommentedCode = (jsFiles, excludeFiles = []) => {
  const files = combineFileLists([jsFiles].flat(), excludeFiles);
  return analyzeFiles(files, (source, relativePath) =>
    findCommentedCode(source).map((cc) => ({
      file: relativePath,
      line: cc.lineNumber,
      code: cc.line,
    })),
  );
};

// Files to analyze
const THIS_FILE = "test/code-quality/commented-code.test.js";
const ALL_JS_FILES = [...SRC_JS_FILES, ...ECOMMERCE_JS_FILES, ...TEST_FILES];

describe("commented-code", () => {
  test("Correctly identifies commented-out variable declarations", () => {
    const source = `
const a = 1;
// const b = 2;
// This is a regular comment
const c = 3;
    `;
    const results = findCommentedCode(source);
    expect(results.length).toBe(1);
    expect(results[0].lineNumber).toBe(3);
  });

  test("Correctly identifies commented-out function declarations", () => {
    const source = `
function active() {}
// function disabled() {}
// async function alsoDisabled() {}
    `;
    const results = findCommentedCode(source);
    expect(results.length).toBe(2);
  });

  test("Correctly identifies commented-out console statements", () => {
    const source = `
console.log("active");
// console.log("disabled");
// console.error("also disabled");
    `;
    const results = findCommentedCode(source);
    expect(results.length).toBe(2);
  });

  test("Ignores commented code inside template literals (test fixtures)", () => {
    const source = `
const testFixture = \`
// const ignored = "inside template";
// console.log("also ignored");
\`;
const real = 1;
    `;
    const results = findCommentedCode(source);
    expect(results.length).toBe(0);
  });

  test("Does not flag regular documentation comments", () => {
    const source = `
// This is a comment about the code
// Remember to implement this later
// NOTE: important detail
const a = 1;
    `;
    const results = findCommentedCode(source);
    expect(results.length).toBe(0);
  });

  test("No commented-out code allowed in the codebase", () => {
    const violations = analyzeCommentedCode(ALL_JS_FILES, [THIS_FILE]);
    assertNoViolations(violations, {
      message: "commented-out code",
      fixHint: "remove the commented code",
    });
  });
});
