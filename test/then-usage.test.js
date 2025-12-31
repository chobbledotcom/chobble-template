import { createTestRunner, ECOMMERCE_JS_FILES, expectTrue, fs, path, rootDir, SRC_JS_FILES, TEST_FILES } from "./test-utils.js";

// Whitelist of allowed .then() occurrences
// Format: "filepath:lineNumber" - these are grandfathered in and should be removed over time
const ALLOWED_THEN_USAGE = new Set([
  // src/assets/js/availability-calendar.js - fetch chain
  "src/assets/js/availability-calendar.js:133",
]);

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
  const allowed = [];

  // Exclude this test file since it contains examples in test strings
  const allJsFiles = [...SRC_JS_FILES, ...ECOMMERCE_JS_FILES, ...TEST_FILES]
    .filter((f) => f !== "test/then-usage.test.js");

  for (const relativePath of allJsFiles) {
    const fullPath = path.join(rootDir, relativePath);
    const source = fs.readFileSync(fullPath, "utf-8");
    const thenCalls = findThenCalls(source);

    for (const tc of thenCalls) {
      const location = `${relativePath}:${tc.lineNumber}`;

      if (ALLOWED_THEN_USAGE.has(location)) {
        allowed.push({
          file: relativePath,
          line: tc.lineNumber,
          code: tc.line,
        });
      } else {
        violations.push({
          file: relativePath,
          line: tc.lineNumber,
          code: tc.line,
        });
      }
    }
  }

  return { violations, allowed };
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
        `Expected 2 .then() calls, found ${results.length}`
      );
    },
  },
  {
    name: "no-new-then-chains",
    description: "No new .then() chains outside the whitelist - use async/await",
    test: () => {
      const { violations, allowed } = analyzeThenUsage();

      if (violations.length > 0) {
        console.log(`\n  Found ${violations.length} non-whitelisted .then() calls:`);
        for (const v of violations) {
          console.log(`     - ${v.file}:${v.line}`);
          console.log(`       ${v.code}`);
        }
        console.log("\n  To fix: refactor to use async/await, or add to ALLOWED_THEN_USAGE\n");
      }

      expectTrue(
        violations.length === 0,
        `Found ${violations.length} non-whitelisted .then() calls. See list above.`
      );
    },
  },
  {
    name: "report-allowed-then-usage",
    description: "Reports whitelisted .then() calls for tracking",
    test: () => {
      const { allowed } = analyzeThenUsage();

      console.log(`\n  Whitelisted .then() calls: ${allowed.length}`);
      console.log("  These should be refactored to async/await over time:\n");

      // Group by file for cleaner output
      const byFile = {};
      for (const a of allowed) {
        if (!byFile[a.file]) byFile[a.file] = [];
        byFile[a.file].push(a.line);
      }

      for (const [file, lines] of Object.entries(byFile)) {
        console.log(`     ${file}: lines ${lines.join(", ")}`);
      }
      console.log("");

      // This test always passes - it's informational
      expectTrue(true, "Reported whitelisted .then() calls");
    },
  },
];

createTestRunner("then-usage", testCases);
