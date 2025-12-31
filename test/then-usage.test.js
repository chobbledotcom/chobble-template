import {
  createTestRunner,
  ECOMMERCE_JS_FILES,
  expectTrue,
  fs,
  path,
  rootDir,
  SRC_JS_FILES,
  TEST_FILES,
} from "./test-utils.js";

/**
 * Find all .then() calls in a file
 * Returns array of { lineNumber, line }
 */
const findThenCalls = (source) => {
  const results = [];
  const lines = source.split("\n");

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // Match .then( with optional whitespace
    const regex = /\.then\s*\(/g;

    if (regex.test(line)) {
      // Skip if in a comment
      const trimmed = line.trim();
      if (trimmed.startsWith("//")) continue;
      if (trimmed.startsWith("*")) continue; // Block comment line

      results.push({
        lineNumber: i + 1,
        line: trimmed,
      });
    }
  }

  return results;
};

/**
 * Analyze all JS files and find .then() usage
 */
const analyzeThenUsage = () => {
  const violations = [];

  // Exclude this test file since it contains examples in test strings
  const allJsFiles = [
    ...SRC_JS_FILES,
    ...ECOMMERCE_JS_FILES,
    ...TEST_FILES,
  ].filter((f) => f !== "test/then-usage.test.js");

  for (const relativePath of allJsFiles) {
    const fullPath = path.join(rootDir, relativePath);
    const source = fs.readFileSync(fullPath, "utf-8");
    const thenCalls = findThenCalls(source);

    for (const tc of thenCalls) {
      violations.push({
        file: relativePath,
        line: tc.lineNumber,
        code: tc.line,
      });
    }
  }

  return violations;
};

const testCases = [
  {
    name: "find-then-in-source",
    description: "Correctly identifies .then() calls in source code",
    test: () => {
      const source = `
const a = 1;
fetch(url).then((res) => res.json());
promise.then(handleSuccess);
// promise.then(comment);
await asyncFunction();
      `;
      const results = findThenCalls(source);
      expectTrue(
        results.length === 2,
        `Expected 2 .then() calls, found ${results.length}`,
      );
    },
  },
  {
    name: "no-then-chains",
    description: "No .then() chains - use async/await instead",
    test: () => {
      const violations = analyzeThenUsage();

      if (violations.length > 0) {
        console.log(`\n  Found ${violations.length} .then() calls:`);
        for (const v of violations) {
          console.log(`     - ${v.file}:${v.line}`);
          console.log(`       ${v.code}`);
        }
        console.log("\n  To fix: refactor to use async/await\n");
      }

      expectTrue(
        violations.length === 0,
        `Found ${violations.length} .then() calls. See list above.`,
      );
    },
  },
];

createTestRunner("then-usage", testCases);
