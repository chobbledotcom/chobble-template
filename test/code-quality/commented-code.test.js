import {
  createTestRunner,
  ECOMMERCE_JS_FILES,
  expectTrue,
  fs,
  path,
  rootDir,
  SRC_JS_FILES,
  TEST_FILES,
} from "../test-utils.js";

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
 * Check if a line is inside a template literal (backtick string)
 * This helps avoid false positives from test fixtures
 */
const isInsideTemplateLiteral = (lines, lineIndex) => {
  let backtickCount = 0;
  for (let i = 0; i < lineIndex; i++) {
    const line = lines[i];
    // Count unescaped backticks
    const matches = line.match(/(?<!\\)`/g);
    if (matches) {
      backtickCount += matches.length;
    }
  }
  // Odd number means we're inside a template literal
  return backtickCount % 2 === 1;
};

/**
 * Check if a comment is documentation (explaining a pattern) vs disabled code
 * Returns true only if this appears to be a documentation comment for a regex pattern
 */
const isDocumentationComment = (line, prevLine, nextLine) => {
  // Comments followed by regex patterns are documentation (explaining what regex matches)
  // Match lines starting with / but not // (so /pattern/ but not // comment)
  if (nextLine && /^\s*\/[^/]/.test(nextLine)) {
    return true;
  }

  return false;
};

/**
 * Find all commented-out code in a file
 * Returns array of { lineNumber, line }
 */
const findCommentedCode = (source, relativePath) => {
  const results = [];
  const lines = source.split("\n");

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const prevLine = i > 0 ? lines[i - 1] : "";
    const nextLine = i < lines.length - 1 ? lines[i + 1] : "";

    // Skip if inside a template literal (test fixtures)
    if (isInsideTemplateLiteral(lines, i)) {
      continue;
    }

    // Check against all commented code patterns
    for (const pattern of COMMENTED_CODE_PATTERNS) {
      if (pattern.test(line)) {
        // Skip documentation comments
        if (isDocumentationComment(line, prevLine, nextLine)) {
          continue;
        }

        results.push({
          lineNumber: i + 1,
          line: line.trim(),
        });
        break; // Only report each line once
      }
    }
  }

  return results;
};

/**
 * Analyze all JS files and find commented-out code
 */
const analyzeCommentedCode = () => {
  const violations = [];

  // Exclude this test file
  const allJsFiles = [
    ...SRC_JS_FILES,
    ...ECOMMERCE_JS_FILES,
    ...TEST_FILES,
  ].filter((f) => f !== "test/commented-code.test.js");

  for (const relativePath of allJsFiles) {
    const fullPath = path.join(rootDir, relativePath);
    const source = fs.readFileSync(fullPath, "utf-8");
    const commentedCode = findCommentedCode(source, relativePath);

    for (const cc of commentedCode) {
      violations.push({
        file: relativePath,
        line: cc.lineNumber,
        code: cc.line,
      });
    }
  }

  return violations;
};

const testCases = [
  {
    name: "detect-commented-variable",
    description: "Correctly identifies commented-out variable declarations",
    test: () => {
      const source = `
const a = 1;
// const b = 2;
// This is a regular comment
const c = 3;
      `;
      const results = findCommentedCode(source, "test.js");
      expectTrue(
        results.length === 1,
        `Expected 1 commented code, found ${results.length}`,
      );
      expectTrue(
        results[0].lineNumber === 3,
        `Expected line 3, got ${results[0].lineNumber}`,
      );
    },
  },
  {
    name: "detect-commented-function",
    description: "Correctly identifies commented-out function declarations",
    test: () => {
      const source = `
function active() {}
// function disabled() {}
// async function alsoDisabled() {}
      `;
      const results = findCommentedCode(source, "test.js");
      expectTrue(
        results.length === 2,
        `Expected 2 commented code, found ${results.length}`,
      );
    },
  },
  {
    name: "detect-commented-console",
    description: "Correctly identifies commented-out console statements",
    test: () => {
      const source = `
console.log("active");
// console.log("disabled");
// console.error("also disabled");
      `;
      const results = findCommentedCode(source, "test.js");
      expectTrue(
        results.length === 2,
        `Expected 2 commented code, found ${results.length}`,
      );
    },
  },
  {
    name: "ignore-template-literals",
    description:
      "Ignores commented code inside template literals (test fixtures)",
    test: () => {
      const source = `
const testFixture = \`
// const ignored = "inside template";
// console.log("also ignored");
\`;
const real = 1;
      `;
      const results = findCommentedCode(source, "test.js");
      expectTrue(
        results.length === 0,
        `Expected 0 commented code in template literals, found ${results.length}`,
      );
    },
  },
  {
    name: "ignore-regular-comments",
    description: "Does not flag regular documentation comments",
    test: () => {
      const source = `
// This is a comment about the code
// TODO: implement this later
// NOTE: important detail
const a = 1;
      `;
      const results = findCommentedCode(source, "test.js");
      expectTrue(
        results.length === 0,
        `Expected 0 commented code, found ${results.length}`,
      );
    },
  },
  {
    name: "no-commented-code",
    description: "No commented-out code allowed in the codebase",
    test: () => {
      const violations = analyzeCommentedCode();

      if (violations.length > 0) {
        console.log(`\n  Found ${violations.length} commented-out code:`);
        for (const v of violations) {
          console.log(`     - ${v.file}:${v.line}`);
          console.log(`       ${v.code}`);
        }
        console.log("\n  To fix: remove the commented code\n");
      }

      expectTrue(
        violations.length === 0,
        `Found ${violations.length} commented-out code. See list above.`,
      );
    },
  },
];

createTestRunner("commented-code", testCases);
