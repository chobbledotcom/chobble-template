import { describe, expect, test } from "vitest";
import {
  analyzeFiles,
  assertNoViolations,
  combineFileLists,
  toLines,
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

const COMMENT_PATTERNS = {
  singleLine: /^\s*\/\//,
  blockStart: /^\s*\/\*/,
  blockEnd: /\*\/\s*$/,
  jsdocStart: /^\s*\/\*\*/,
};

const isBlockEnd = (line) => COMMENT_PATTERNS.blockEnd.test(line);
const isBlockStart = (line) => COMMENT_PATTERNS.blockStart.test(line);
const isSingleLine = (line) => COMMENT_PATTERNS.singleLine.test(line);

const findHeaderEndLine = (lines) => {
  const initialState = { headerEndLine: 0, inBlockComment: false, done: false };

  const processLine = (state, { line, num }) => {
    if (state.done) return state;
    const trimmed = line.trim();
    if (trimmed === "") return state;
    if (state.inBlockComment) {
      return {
        headerEndLine: num,
        inBlockComment: !isBlockEnd(trimmed),
        done: false,
      };
    }
    if (isBlockStart(trimmed)) {
      return {
        headerEndLine: num,
        inBlockComment: !isBlockEnd(trimmed),
        done: false,
      };
    }
    if (isSingleLine(trimmed)) {
      return { headerEndLine: num, inBlockComment: false, done: false };
    }
    return {
      headerEndLine: state.headerEndLine,
      inBlockComment: state.inBlockComment,
      done: true,
    };
  };

  return lines.reduce(processLine, initialState).headerEndLine;
};

const findExcessiveComments = (source) => {
  const lines = toLines(source);
  const headerEndLine = findHeaderEndLine(lines);
  // Only the count and first excess location are needed for the report.
  const processLine = (state, { line, num }) => {
    if (num <= headerEndLine) return state;
    const trimmed = line.trim();
    const emit = () => ({
      ...state,
      count: state.count + 1,
      firstExcessLine:
        state.count === MAX_INLINE_COMMENTS ? num : state.firstExcessLine,
    });
    if (state.inJsDocBlock) {
      return isBlockEnd(trimmed) ? { ...state, inJsDocBlock: false } : state;
    }
    if (state.inRegularBlock) {
      const next = emit();
      return isBlockEnd(trimmed) ? { ...next, inRegularBlock: false } : next;
    }
    if (COMMENT_PATTERNS.jsdocStart.test(trimmed)) {
      return { ...state, inJsDocBlock: !isBlockEnd(trimmed) };
    }
    if (isBlockStart(trimmed)) {
      const next = emit();
      return { ...next, inRegularBlock: !isBlockEnd(trimmed) };
    }
    return isSingleLine(trimmed) &&
      !JSDOC_TYPE_PATTERNS.some((pattern) => pattern.test(trimmed))
      ? emit()
      : state;
  };

  const { count, firstExcessLine } = lines.reduce(processLine, {
    count: 0,
    firstExcessLine: null,
    inJsDocBlock: false,
    inRegularBlock: false,
  });

  if (count <= MAX_INLINE_COMMENTS) return [];

  return [
    {
      lineNumber: firstExcessLine,
      line: `${count} inline comments (limit: ${MAX_INLINE_COMMENTS})`,
      count,
    },
  ];
};

const expectExcessiveComments = (source, expectedCount) => {
  const results = findExcessiveComments(source);
  expect(results.length).toBe(1);
  expect(results[0].count).toBe(expectedCount);
};

const THIS_FILE = "test/unit/code-quality/comment-limits.test.js";

describe("comment-limits", () => {
  test.each([
    ["empty source", "", 0],
    ["code before comments", "const value = 1;\n// Not a header", 0],
    ["single-line block", "/* Header */\nconst value = 1;\n// Inline", 1],
    [
      "mixed headers with blank lines",
      "\n/* Header\n\n * continued\n */\n// More header\n\nconst value = 1;\n// Inline",
      6,
    ],
  ])("finds the header boundary for %s", (_name, source, expectedEnd) => {
    expect(findHeaderEndLine(toLines(source))).toBe(expectedEnd);
  });

  test("reports the first excess line while counting all later comments", () => {
    const count = MAX_INLINE_COMMENTS + 10000;
    const source = `const value = 1;\n${"// inline\n".repeat(count)}`;
    expect(findExcessiveComments(source)).toEqual([
      {
        lineNumber: MAX_INLINE_COMMENTS + 2,
        line: `${count} inline comments (limit: ${MAX_INLINE_COMMENTS})`,
        count,
      },
    ]);
  });

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
const config = { key: "value" };
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
    const violations = analyzeFiles(
      combineFileLists([SRC_JS_FILES()], [THIS_FILE]),
      (source, relativePath) =>
        findExcessiveComments(source).map((v) => ({
          ...v,
          file: relativePath,
        })),
    );
    assertNoViolations(violations, {
      singular: "file with excessive comments",
      plural: "files with excessive comments",
      fixHint: `reduce inline comments to ${MAX_INLINE_COMMENTS} or fewer per file (header comments and JSDoc are excluded)`,
    });
  });
});
