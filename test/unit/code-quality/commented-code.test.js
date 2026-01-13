import { describe, expect, test } from "bun:test";
import {
  assertNoViolations,
  combineFileLists,
  toLines,
  withAllowlist,
} from "#test/code-scanner.js";
import { ALL_JS_FILES } from "#test/test-utils.js";
import { filterMap, pipe } from "#utils/array-utils.js";

/**
 * Patterns that indicate commented-out code (not documentation)
 * Each pattern is designed to catch code that was disabled, not explanatory comments
 */
const COMMENTED_CODE_PATTERNS = [
  // Variable declarations (const/let/var x = ...)
  /^\s*\/\/\s*(const|let|var)\s+\w+\s*=/,

  // Function declarations and expressions
  /^\s*\/\/\s*(async\s+)?function\s+\w+\s*\(/,
  /^\s*\/\/\s*(const|let|var)\s+\w+\s*=\s*(async\s*)?\(/,
  /^\s*\/\/\s*(const|let|var)\s+\w+\s*=\s*(async\s*)?function/,

  // Control flow statements
  /^\s*\/\/\s*if\s*\(/,
  /^\s*\/\/\s*else\s*(\{|if)/,
  /^\s*\/\/\s*for\s*\(/,
  /^\s*\/\/\s*while\s*\(/,
  /^\s*\/\/\s*switch\s*\(/,
  /^\s*\/\/\s*do\s*\{/,

  // Returns and throws (must look like actual code, not documentation)
  /^\s*\/\/\s*return\s+\w+[\s;]*$/,
  /^\s*\/\/\s*return\s*;/,
  /^\s*\/\/\s*throw\s+new\s+/,

  // Module statements
  /^\s*\/\/\s*import\s+[\w{]/,
  /^\s*\/\/\s*export\s+(const|let|var|function|class|default)/,

  // Console statements (debug code)
  /^\s*\/\/\s*console\.(log|error|warn|info|debug)\s*\(/,

  // Method calls ending with semicolon (actual code, not documentation)
  /^\s*\/\/\s*\w+\.\w+\s*\([^)]*\)\s*;\s*$/,

  // Assignments to existing variables (x = value;)
  // Must end with semicolon to distinguish from documentation like "// Monday = 0, Sunday = 6"
  /^\s*\/\/\s*\w+\s*=\s*[^=].*;\s*$/,

  // await expressions
  /^\s*\/\/\s*await\s+\w+/,
];

/**
 * Find all commented-out code in a file.
 * Optimized using pipe() and filterMap() for single-pass processing.
 */
const findCommentedCode = (source, _relativePath) => {
  const lines = toLines(source);
  const rawLines = lines.map((l) => l.line);

  // Build template literal state in O(n) - tracks if each line is inside a template literal
  let backtickCount = 0;
  const insideTemplateLiteral = rawLines.map((line) => {
    const isInside = backtickCount % 2 === 1;
    const matches = line.match(/(?<!\\)`/g);
    if (matches) backtickCount += matches.length;
    return isInside;
  });

  // Check if a comment is documentation (comment before a regex pattern)
  const isDocumentation = (nextLine) => nextLine && /^\s*\/[^/]/.test(nextLine);

  // Enrich lines with context needed for filtering
  const enrichedLines = lines.map((item, i) => ({
    ...item,
    inTemplate: insideTemplateLiteral[i],
    nextLine: i < rawLines.length - 1 ? rawLines[i + 1] : "",
  }));

  return pipe(
    filterMap(
      ({ line, inTemplate, nextLine }) => {
        if (inTemplate) return false;
        return COMMENTED_CODE_PATTERNS.some(
          (pattern) => pattern.test(line) && !isDocumentation(nextLine),
        );
      },
      ({ line, num }) => ({ lineNumber: num, line: line.trim() }),
    ),
  )(enrichedLines);
};

const THIS_FILE = "test/unit/code-quality/commented-code.test.js";

// Complete analyzer - find + files in one definition (no allowlist needed)
const commentedCodeAnalysis = withAllowlist({
  find: findCommentedCode,
  files: () => combineFileLists([ALL_JS_FILES()], [THIS_FILE]),
});

describe("commented-code", () => {
  test("Correctly identifies commented-out variable declarations", () => {
    const source = `
const a = 1;
// const b = 2;
// This is a regular comment
const c = 3;
    `;
    const results = findCommentedCode(source, "test.js");
    expect(results.length).toBe(1);
    expect(results[0].lineNumber).toBe(3);
  });

  test("Correctly identifies commented-out function declarations", () => {
    const source = `
function active() {}
// function disabled() {}
// async function alsoDisabled() {}
    `;
    const results = findCommentedCode(source, "test.js");
    expect(results.length).toBe(2);
  });

  test("Correctly identifies commented-out console statements", () => {
    const source = `
console.log("active");
// console.log("disabled");
// console.error("also disabled");
    `;
    const results = findCommentedCode(source, "test.js");
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
    const results = findCommentedCode(source, "test.js");
    expect(results.length).toBe(0);
  });

  test("Does not flag regular documentation comments", () => {
    const source = `
// This is a comment about the code
// Remember to implement this later
// NOTE: important detail
const a = 1;
    `;
    const results = findCommentedCode(source, "test.js");
    expect(results.length).toBe(0);
  });

  test("No commented-out code allowed in the codebase", () => {
    const { violations } = commentedCodeAnalysis();
    assertNoViolations(violations, {
      message: "commented-out code",
      fixHint: "remove the commented code",
    });
  });
});
