import { describe, expect, test } from "bun:test";
import { ALLOWED_EXCESSIVE_COMMENTS } from "#test/code-quality/code-quality-exceptions.js";
import {
  assertNoViolations,
  combineFileLists,
  toLines,
  withAllowlist,
} from "#test/code-scanner.js";
import { SRC_JS_FILES } from "#test/test-utils.js";

/**
 * Comment limits scanner
 *
 * Enforces a limit on inline comments per file to encourage self-documenting code.
 * AI agents tend to over-comment, leading to noisy code. This rule ensures:
 *
 * 1. A single header comment block at file start is allowed (unlimited length)
 * 2. JSDoc type annotations are excluded from the count (TypeScript definitions)
 * 3. All other comments are limited to MAX_INLINE_COMMENTS lines per file
 */

const MAX_INLINE_COMMENTS = 5;

const JSDOC_TYPE_PATTERNS = [
  /@type\b/,
  /@param\b/,
  /@returns?\b/,
  /@typedef\b/,
  /@property\b/,
  /@template\b/,
  /@callback\b/,
  /@extends\b/,
  /@implements\b/,
  /@augments\b/,
  /@enum\b/,
  /@const\b/,
  /@readonly\b/,
  /@private\b/,
  /@protected\b/,
  /@public\b/,
  /@abstract\b/,
  /@override\b/,
  /@yields?\b/,
  /@throws\b/,
  /@async\b/,
  /@generator\b/,
  /@satisfies\b/,
];

const isJSDocTypeLine = (line) =>
  JSDOC_TYPE_PATTERNS.some((pattern) => pattern.test(line));

const COMMENT_PATTERNS = {
  singleLine: /^\s*\/\//,
  blockStart: /^\s*\/\*/,
  blockEnd: /\*\/\s*$/,
  jsdocStart: /^\s*\/\*\*/,
};

const isBlockEnd = (line) => COMMENT_PATTERNS.blockEnd.test(line);
const isBlockStart = (line) => COMMENT_PATTERNS.blockStart.test(line);
const isSingleLine = (line) => COMMENT_PATTERNS.singleLine.test(line);
const isJSDocStart = (line) => COMMENT_PATTERNS.jsdocStart.test(line);
const isSingleLineBlock = (line) => isBlockStart(line) && isBlockEnd(line);

const findHeaderEndLine = (lines) => {
  let headerEndLine = 0;
  let inBlockComment = false;

  for (const { line, num } of lines) {
    const trimmed = line.trim();

    if (trimmed === "") continue;

    if (inBlockComment) {
      headerEndLine = num;
      if (isBlockEnd(trimmed)) inBlockComment = false;
      continue;
    }

    if (isBlockStart(trimmed)) {
      headerEndLine = num;
      if (!isBlockEnd(trimmed)) inBlockComment = true;
      continue;
    }

    if (isSingleLine(trimmed)) {
      headerEndLine = num;
      continue;
    }

    break;
  }

  return headerEndLine;
};

const countInlineComments = (lines, headerEndLine) => {
  const inlineComments = [];
  let inJSDocBlock = false;
  let inRegularBlock = false;

  for (const { line, num } of lines) {
    if (num <= headerEndLine) continue;

    const trimmed = line.trim();

    if (inJSDocBlock) {
      if (isBlockEnd(trimmed)) inJSDocBlock = false;
      continue;
    }

    if (inRegularBlock) {
      inlineComments.push({ lineNumber: num, line: trimmed });
      if (isBlockEnd(trimmed)) inRegularBlock = false;
      continue;
    }

    if (isJSDocStart(trimmed)) {
      if (!isBlockEnd(trimmed)) inJSDocBlock = true;
      continue;
    }

    if (isBlockStart(trimmed)) {
      inlineComments.push({ lineNumber: num, line: trimmed });
      if (!isBlockEnd(trimmed)) inRegularBlock = true;
      continue;
    }

    if (isSingleLine(trimmed) && !isJSDocTypeLine(trimmed)) {
      inlineComments.push({ lineNumber: num, line: trimmed });
    }
  }

  return inlineComments;
};

const findExcessiveComments = (source) => {
  const lines = toLines(source);
  const headerEndLine = findHeaderEndLine(lines);
  const inlineComments = countInlineComments(lines, headerEndLine);

  if (inlineComments.length <= MAX_INLINE_COMMENTS) return [];

  const firstExcess = inlineComments[MAX_INLINE_COMMENTS];
  return [
    {
      lineNumber: firstExcess.lineNumber,
      line: `${inlineComments.length} inline comments (limit: ${MAX_INLINE_COMMENTS})`,
      count: inlineComments.length,
    },
  ];
};

const expectExcessiveComments = (source, expectedCount) => {
  const results = findExcessiveComments(source);
  expect(results.length).toBe(1);
  expect(results[0].count).toBe(expectedCount);
};

const THIS_FILE = "test/unit/code-quality/comment-limits.test.js";

const excessiveCommentsAnalysis = withAllowlist({
  find: findExcessiveComments,
  allowlist: ALLOWED_EXCESSIVE_COMMENTS,
  files: () => combineFileLists([SRC_JS_FILES()], [THIS_FILE]),
});

describe("comment-limits", () => {
  test("Allows header comment block at file start", () => {
    const source = `/**
 * This is a long header comment that explains the file.
 * It can be as long as needed since it documents the module.
 * Line 1
 * Line 2
 * Line 3
 * Line 4
 * Line 5
 * Line 6
 * Line 7 - all fine, this is the header
 */
const a = 1;
`;
    const results = findExcessiveComments(source);
    expect(results.length).toBe(0);
  });

  test("Allows single-line header comments at file start", () => {
    const source = `// This is a header comment
// It spans multiple lines
// Line 3
// Line 4
// Line 5
// Line 6
// Line 7 - all fine, still header
const a = 1;
`;
    const results = findExcessiveComments(source);
    expect(results.length).toBe(0);
  });

  test("Excludes JSDoc type annotations from count", () => {
    const source = `const a = 1;

/**
 * A function with JSDoc.
 * @param {string} name - The name
 * @param {number} age - The age
 * @returns {boolean} Whether valid
 */
function validate(name, age) {
  return true;
}

/**
 * Another JSDoc block.
 * @type {Object}
 */
const config = {};
`;
    const results = findExcessiveComments(source);
    expect(results.length).toBe(0);
  });

  test("Counts inline comments after header", () => {
    const source = `/** Header */
const a = 1;
// Comment 1
// Comment 2
// Comment 3
// Comment 4
// Comment 5
const b = 2;
`;
    const results = findExcessiveComments(source);
    expect(results.length).toBe(0);
  });

  test("Flags files exceeding inline comment limit", () => {
    const source = `/** Header */
const a = 1;
// Comment 1
// Comment 2
// Comment 3
// Comment 4
// Comment 5
// Comment 6 - exceeds limit
const b = 2;
`;
    expectExcessiveComments(source, 6);
  });

  test("Counts block comments within code", () => {
    const source = `const a = 1;
/* Block comment line 1
 * Block comment line 2
 * Block comment line 3
 * Block comment line 4
 * Block comment line 5
 * Block comment line 6 - exceeds limit
 */
const b = 2;
`;
    expectExcessiveComments(source, 7);
  });

  test("Does not count JSDoc blocks within code", () => {
    const source = `const a = 1;
/**
 * This is JSDoc documentation.
 * @param {string} x - Parameter
 * @returns {void}
 */
function foo(x) {}
// One inline comment
const b = 2;
`;
    const results = findExcessiveComments(source);
    expect(results.length).toBe(0);
  });

  test("Handles mixed comment styles", () => {
    const source = `/** Header */
const a = 1;
// Inline 1
/* Inline 2 */
// Inline 3
// Inline 4
// Inline 5
// Inline 6 - over limit
const b = 2;
`;
    expectExcessiveComments(source, 6);
  });

  test("No excessive inline comments in src/ files", () => {
    const { violations } = excessiveCommentsAnalysis();
    assertNoViolations(violations, {
      singular: "file with excessive comments",
      plural: "files with excessive comments",
      fixHint: `reduce inline comments to ${MAX_INLINE_COMMENTS} or fewer per file (header comments and JSDoc are excluded)`,
    });
  });
});
