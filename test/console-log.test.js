import { createTestRunner, ECOMMERCE_JS_FILES, expectTrue, fs, path, rootDir, SRC_JS_FILES } from "./test-utils.js";
import { ALLOWED_CONSOLE_LOG_FILES } from "./code-quality-exceptions.js";

/**
 * Find all console.log usages in a file
 * Returns array of { line, lineNumber }
 */
const findConsoleLogUsage = (source) => {
  const results = [];
  const lines = source.split("\n");

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Check for console.log
    const match = line.match(/console\.log\s*\(/);
    if (match) {
      // Skip if in a comment
      const beforeMatch = line.substring(0, match.index);
      if (beforeMatch.includes("//")) continue;
      if (beforeMatch.includes("/*") && !beforeMatch.includes("*/")) continue;

      results.push({
        line: line.trim(),
        lineNumber: i + 1,
      });
    }
  }

  return results;
};

/**
 * Analyze all JS files (excluding test files) for console.log usage
 */
const analyzeConsoleLogUsage = () => {
  const violations = [];
  const allowed = [];

  // Only check source files, not test files
  const allJsFiles = [...SRC_JS_FILES, ...ECOMMERCE_JS_FILES]
    .filter((f) => !f.includes(".test.js"));

  for (const relativePath of allJsFiles) {
    const fullPath = path.join(rootDir, relativePath);
    const source = fs.readFileSync(fullPath, "utf-8");
    const usages = findConsoleLogUsage(source);

    if (usages.length === 0) continue;

    // Check if file is in the allowed list
    if (ALLOWED_CONSOLE_LOG_FILES.has(relativePath)) {
      for (const usage of usages) {
        allowed.push({
          file: relativePath,
          line: usage.lineNumber,
          code: usage.line,
        });
      }
    } else {
      for (const usage of usages) {
        violations.push({
          file: relativePath,
          line: usage.lineNumber,
          code: usage.line,
        });
      }
    }
  }

  return { violations, allowed };
};

const testCases = [
  {
    name: "find-console-log-in-source",
    description: "Correctly identifies console.log statements in source code",
    test: () => {
      const source = `
console.log("hello");
console.error("error");
// console.log("commented out");
console.log("another one");
      `;
      const results = findConsoleLogUsage(source);
      expectTrue(
        results.length === 2,
        `Expected 2 console.log usages, found ${results.length}`
      );
    },
  },
  {
    name: "no-console-log-in-production-code",
    description: "No console.log outside whitelisted files (use console.error for errors)",
    test: () => {
      const { violations } = analyzeConsoleLogUsage();

      if (violations.length > 0) {
        console.log(`\n  Found ${violations.length} non-whitelisted console.log usages:`);
        for (const v of violations) {
          console.log(`     - ${v.file}:${v.line}`);
          console.log(`       ${v.code}`);
        }
        console.log("\n  To fix: remove debug logs, use console.error for errors,");
        console.log("  or add file to ALLOWED_CONSOLE_LOG_FILES in code-quality-exceptions.js\n");
      }

      expectTrue(
        violations.length === 0,
        `Found ${violations.length} non-whitelisted console.log usages. See list above.`
      );
    },
  },
  {
    name: "report-allowed-console-logs",
    description: "Reports whitelisted console.log usages for tracking",
    test: () => {
      const { allowed } = analyzeConsoleLogUsage();

      console.log(`\n  Whitelisted console.log usages: ${allowed.length}`);
      console.log("  These are in CLI scripts/tools and are intentional:\n");

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

      expectTrue(true, "Reported whitelisted console.log usages");
    },
  },
];

createTestRunner("console-log", testCases);
