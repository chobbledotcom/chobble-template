import { createTestRunner, ECOMMERCE_JS_FILES, expectTrue, fs, path, rootDir, SRC_JS_FILES, TEST_FILES } from "./test-utils.js";

/**
 * Find all TODO/FIXME occurrences in a file
 * Returns array of { lineNumber, line, match }
 */
const findTodoFixme = (source) => {
  const results = [];
  const lines = source.split("\n");

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // Match TODO or FIXME as whole words (case-insensitive)
    const regex = /\b(TODO|FIXME)\b/gi;
    const match = line.match(regex);

    if (match) {
      results.push({
        lineNumber: i + 1,
        line: line.trim(),
        match: match[0],
      });
    }
  }

  return results;
};

/**
 * Analyze all JS files and find TODO/FIXME comments
 */
const analyzeTodoFixme = () => {
  const violations = [];

  // Exclude test files that contain TODO/FIXME in test fixture strings
  const allJsFiles = [...SRC_JS_FILES, ...ECOMMERCE_JS_FILES, ...TEST_FILES]
    .filter((f) => f !== "test/todo-fixme-comments.test.js")
    .filter((f) => f !== "test/commented-code.test.js");

  for (const relativePath of allJsFiles) {
    const fullPath = path.join(rootDir, relativePath);
    const source = fs.readFileSync(fullPath, "utf-8");
    const todoFixmes = findTodoFixme(source);

    for (const tf of todoFixmes) {
      violations.push({
        file: relativePath,
        line: tf.lineNumber,
        code: tf.line,
        match: tf.match,
      });
    }
  }

  return violations;
};

const testCases = [
  {
    name: "find-todo-fixme-in-source",
    description: "Correctly identifies TODO/FIXME comments in source code",
    test: () => {
      const source = `
const a = 1;
// TODO: fix this later
const b = 2;
/* FIXME: this is broken */
const c = 3;
const todoList = []; // variable name, not a comment
      `;
      const results = findTodoFixme(source);
      expectTrue(
        results.length === 2,
        `Expected 2 TODO/FIXME comments, found ${results.length}`
      );
      expectTrue(
        results[0].lineNumber === 3,
        `Expected line 3, got ${results[0].lineNumber}`
      );
      expectTrue(
        results[0].match === "TODO",
        `Expected TODO, got ${results[0].match}`
      );
      expectTrue(
        results[1].lineNumber === 5,
        `Expected line 5, got ${results[1].lineNumber}`
      );
      expectTrue(
        results[1].match === "FIXME",
        `Expected FIXME, got ${results[1].match}`
      );
    },
  },
  {
    name: "no-todo-fixme-comments",
    description: "No TODO/FIXME comments in the codebase",
    test: () => {
      const violations = analyzeTodoFixme();

      if (violations.length > 0) {
        console.log(`\n  Found ${violations.length} TODO/FIXME comments:`);
        for (const v of violations) {
          console.log(`     - ${v.file}:${v.line} (${v.match})`);
          console.log(`       ${v.code}`);
        }
        console.log("\n  To fix: resolve the TODO/FIXME before committing.\n");
      }

      expectTrue(
        violations.length === 0,
        `Found ${violations.length} TODO/FIXME comments. See list above.`
      );
    },
  },
];

createTestRunner("todo-fixme-comments", testCases);
