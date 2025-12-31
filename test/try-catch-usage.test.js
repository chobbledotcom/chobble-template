import { ALLOWED_TRY_CATCHES } from "./code-quality-exceptions.js";
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
 * Find all try { occurrences in a file
 * Returns array of { lineNumber, line }
 */
const findTryCatches = (source) => {
  const results = [];
  const lines = source.split("\n");

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // Match 'try' followed by optional whitespace and '{'
    const regex = /\btry\s*\{/g;

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
 * Analyze all JS files and find try/catch usage
 */
const analyzeTryCatchUsage = () => {
  const violations = [];
  const allowed = [];

  // Exclude this test file since it contains try/catch examples in test strings
  const allJsFiles = [
    ...SRC_JS_FILES,
    ...ECOMMERCE_JS_FILES,
    ...TEST_FILES,
  ].filter((f) => f !== "test/try-catch-usage.test.js");

  for (const relativePath of allJsFiles) {
    const fullPath = path.join(rootDir, relativePath);
    const source = fs.readFileSync(fullPath, "utf-8");
    const tryCatches = findTryCatches(source);

    for (const tc of tryCatches) {
      const location = `${relativePath}:${tc.lineNumber}`;

      if (ALLOWED_TRY_CATCHES.has(location)) {
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
    name: "find-try-catch-in-source",
    description: "Correctly identifies try/catch blocks in source code",
    test: () => {
      const source = `
const a = 1;
try {
  doSomething();
} catch (e) {
  handleError(e);
}
// try { this is a comment
const b = 2;
      `;
      const results = findTryCatches(source);
      expectTrue(
        results.length === 1,
        `Expected 1 try/catch, found ${results.length}`,
      );
      expectTrue(
        results[0].lineNumber === 3,
        `Expected line 3, got ${results[0].lineNumber}`,
      );
    },
  },
  {
    name: "no-new-try-catches",
    description: "No new try/catch blocks outside the whitelist",
    test: () => {
      const { violations, allowed } = analyzeTryCatchUsage();

      if (violations.length > 0) {
        console.log(
          `\n  Found ${violations.length} non-whitelisted try/catch blocks:`,
        );
        for (const v of violations) {
          console.log(`     - ${v.file}:${v.line}`);
          console.log(`       ${v.code}`);
        }
        console.log(
          "\n  To fix: refactor to avoid try/catch, or add to ALLOWED_TRY_CATCHES in code-quality-exceptions.js\n",
        );
      }

      expectTrue(
        violations.length === 0,
        `Found ${violations.length} non-whitelisted try/catch blocks. See list above.`,
      );
    },
  },
  {
    name: "report-allowed-try-catches",
    description: "Reports whitelisted try/catch blocks for tracking",
    test: () => {
      const { allowed } = analyzeTryCatchUsage();

      console.log(`\n  Whitelisted try/catch blocks: ${allowed.length}`);
      console.log("  These should be removed over time:\n");

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
      expectTrue(true, "Reported whitelisted try/catch blocks");
    },
  },
];

createTestRunner("try-catch-usage", testCases);
