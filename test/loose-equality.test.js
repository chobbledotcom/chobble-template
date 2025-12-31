import { ALLOWED_LOOSE_EQUALITY } from "./code-quality-exceptions.js";
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
 * Find all loose equality comparisons (== or !=) in a file
 * Returns array of { lineNumber, line, operator }
 */
const findLooseEquality = (source) => {
  const results = [];
  const lines = source.split("\n");

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // Match == or != that are not === or !==
    // Negative lookbehind for = or ! and negative lookahead for =
    const regex = /(?<![=!<>])([!=])=(?!=)/g;
    let match;

    while ((match = regex.exec(line)) !== null) {
      // Skip if in a comment
      const beforeMatch = line.substring(0, match.index);
      if (beforeMatch.includes("//")) continue;
      if (beforeMatch.includes("/*") && !beforeMatch.includes("*/")) continue;

      // Skip if in a string (simple heuristic: odd number of quotes before match)
      const singleQuotes = (beforeMatch.match(/'/g) || []).length;
      const doubleQuotes = (beforeMatch.match(/"/g) || []).length;
      const backticks = (beforeMatch.match(/`/g) || []).length;
      if (
        singleQuotes % 2 === 1 ||
        doubleQuotes % 2 === 1 ||
        backticks % 2 === 1
      )
        continue;

      results.push({
        lineNumber: i + 1,
        line: line.trim(),
        operator: match[1] === "!" ? "!=" : "==",
      });
    }
  }

  return results;
};

/**
 * Analyze all JS files and find loose equality usage
 */
const analyzeLooseEquality = () => {
  const violations = [];
  const allowed = [];

  // Exclude this test file since it contains examples in test strings
  const allJsFiles = [
    ...SRC_JS_FILES,
    ...ECOMMERCE_JS_FILES,
    ...TEST_FILES,
  ].filter((f) => f !== "test/loose-equality.test.js");

  for (const relativePath of allJsFiles) {
    const fullPath = path.join(rootDir, relativePath);
    const source = fs.readFileSync(fullPath, "utf-8");
    const looseComparisons = findLooseEquality(source);

    for (const cmp of looseComparisons) {
      const location = `${relativePath}:${cmp.lineNumber}`;

      if (ALLOWED_LOOSE_EQUALITY.has(location)) {
        allowed.push({
          file: relativePath,
          line: cmp.lineNumber,
          code: cmp.line,
          operator: cmp.operator,
        });
      } else {
        violations.push({
          file: relativePath,
          line: cmp.lineNumber,
          code: cmp.line,
          operator: cmp.operator,
        });
      }
    }
  }

  return { violations, allowed };
};

const testCases = [
  {
    name: "find-loose-equality-in-source",
    description: "Correctly identifies loose equality in source code",
    test: () => {
      const source = `
const a = 1;
if (a == 1) {}
if (b != 2) {}
if (c === 3) {}
if (d !== 4) {}
// Note: the == operator in comments like this is ignored
const str = "x == y";
      `;
      const results = findLooseEquality(source);
      expectTrue(
        results.length === 2,
        `Expected 2 loose equality comparisons, found ${results.length}`,
      );
      expectTrue(
        results[0].operator === "==",
        `Expected first operator to be ==, got ${results[0].operator}`,
      );
      expectTrue(
        results[1].operator === "!=",
        `Expected second operator to be !=, got ${results[1].operator}`,
      );
    },
  },
  {
    name: "no-new-loose-equality",
    description: "No new loose equality (== or !=) outside the whitelist",
    test: () => {
      const { violations, allowed } = analyzeLooseEquality();

      if (violations.length > 0) {
        console.log(
          `\n  Found ${violations.length} non-whitelisted loose equality comparisons:`,
        );
        for (const v of violations) {
          console.log(`     - ${v.file}:${v.line} (${v.operator})`);
          console.log(`       ${v.code}`);
        }
        console.log(
          "\n  To fix: use === or !== instead, or add to ALLOWED_LOOSE_EQUALITY in code-quality-exceptions.js\n",
        );
      }

      expectTrue(
        violations.length === 0,
        `Found ${violations.length} non-whitelisted loose equality comparisons. See list above.`,
      );
    },
  },
  {
    name: "report-allowed-loose-equality",
    description: "Reports whitelisted loose equality for tracking",
    test: () => {
      const { allowed } = analyzeLooseEquality();

      console.log(
        `\n  Whitelisted loose equality comparisons: ${allowed.length}`,
      );
      console.log("  These should be refactored to === or !== over time:\n");

      // Group by file for cleaner output
      const byFile = {};
      for (const a of allowed) {
        if (!byFile[a.file]) byFile[a.file] = [];
        byFile[a.file].push(`${a.line} (${a.operator})`);
      }

      for (const [file, lines] of Object.entries(byFile)) {
        console.log(`     ${file}: lines ${lines.join(", ")}`);
      }
      console.log("");

      // This test always passes - it's informational
      expectTrue(true, "Reported whitelisted loose equality comparisons");
    },
  },
];

createTestRunner("loose-equality", testCases);
