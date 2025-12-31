import { createTestRunner, ECOMMERCE_JS_FILES, expectTrue, fs, path, rootDir, SRC_JS_FILES, TEST_FILES } from "./test-utils.js";

// Whitelist of allowed TODO/FIXME occurrences
// Format: "filepath:lineNumber" - these are grandfathered in and should be removed over time
const ALLOWED_TODO_FIXME = new Set([
  // Currently no allowed TODO/FIXME comments - add entries here if temporarily needed
]);

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
  const allowed = [];

  // Exclude this test file since it contains TODO/FIXME in test strings
  const allJsFiles = [...SRC_JS_FILES, ...ECOMMERCE_JS_FILES, ...TEST_FILES]
    .filter((f) => f !== "test/todo-fixme-comments.test.js");

  for (const relativePath of allJsFiles) {
    const fullPath = path.join(rootDir, relativePath);
    const source = fs.readFileSync(fullPath, "utf-8");
    const todoFixmes = findTodoFixme(source);

    for (const tf of todoFixmes) {
      const location = `${relativePath}:${tf.lineNumber}`;

      if (ALLOWED_TODO_FIXME.has(location)) {
        allowed.push({
          file: relativePath,
          line: tf.lineNumber,
          code: tf.line,
          match: tf.match,
        });
      } else {
        violations.push({
          file: relativePath,
          line: tf.lineNumber,
          code: tf.line,
          match: tf.match,
        });
      }
    }
  }

  return { violations, allowed };
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
    description: "No TODO/FIXME comments outside the whitelist",
    test: () => {
      const { violations, allowed } = analyzeTodoFixme();

      if (violations.length > 0) {
        console.log(`\n  Found ${violations.length} non-whitelisted TODO/FIXME comments:`);
        for (const v of violations) {
          console.log(`     - ${v.file}:${v.line} (${v.match})`);
          console.log(`       ${v.code}`);
        }
        console.log("\n  To fix: resolve the TODO/FIXME, or add to ALLOWED_TODO_FIXME in todo-fixme-comments.test.js\n");
      }

      expectTrue(
        violations.length === 0,
        `Found ${violations.length} non-whitelisted TODO/FIXME comments. See list above.`
      );
    },
  },
  {
    name: "report-allowed-todo-fixme",
    description: "Reports whitelisted TODO/FIXME comments for tracking",
    test: () => {
      const { allowed } = analyzeTodoFixme();

      if (allowed.length > 0) {
        console.log(`\n  Whitelisted TODO/FIXME comments: ${allowed.length}`);
        console.log("  These should be removed over time:\n");

        // Group by file for cleaner output
        const byFile = {};
        for (const a of allowed) {
          if (!byFile[a.file]) byFile[a.file] = [];
          byFile[a.file].push(`${a.line} (${a.match})`);
        }

        for (const [file, lines] of Object.entries(byFile)) {
          console.log(`     ${file}: lines ${lines.join(", ")}`);
        }
        console.log("");
      } else {
        console.log("\n  No whitelisted TODO/FIXME comments - codebase is clean!\n");
      }

      // This test always passes - it's informational
      expectTrue(true, "Reported whitelisted TODO/FIXME comments");
    },
  },
];

createTestRunner("todo-fixme-comments", testCases);
