import { ALLOWED_TRY_CATCHES } from "#test/code-quality/code-quality-exceptions.js";
import {
  createTestRunner,
  ECOMMERCE_JS_FILES,
  expectTrue,
  fs,
  path,
  rootDir,
  SRC_JS_FILES,
  TEST_FILES,
} from "#test/test-utils.js";

/**
 * Find all try/catch blocks in a file (excludes try/finally without catch)
 * Returns array of { lineNumber, line }
 */
const findTryCatches = (source) => {
  const results = [];
  const lines = source.split("\n");

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // Match 'try' followed by optional whitespace and '{'
    const tryRegex = /\btry\s*\{/;

    if (tryRegex.test(line)) {
      // Skip if in a comment
      const trimmed = line.trim();
      if (trimmed.startsWith("//")) continue;
      if (trimmed.startsWith("*")) continue; // Block comment line

      // Look ahead for a catch block by tracking brace depth
      // We need to find where the try block ends and check if it's followed by catch
      let depth = 0;
      let startedCounting = false;
      let hasCatch = false;

      // Search through remaining source from this line
      for (let j = i; j < lines.length; j++) {
        const searchLine = lines[j];

        for (let k = 0; k < searchLine.length; k++) {
          const char = searchLine[k];

          if (char === "{") {
            depth++;
            startedCounting = true;
          } else if (char === "}") {
            depth--;

            // When we close back to depth 0, check what follows
            if (startedCounting && depth === 0) {
              // Check if catch follows on this line after the closing brace
              const afterBrace = searchLine.slice(k + 1);
              if (/\s*catch\b/.test(afterBrace)) {
                hasCatch = true;
                break;
              }

              // Check next non-empty lines for catch
              for (let m = j + 1; m < lines.length; m++) {
                const nextLine = lines[m].trim();
                if (nextLine === "") continue;
                if (
                  /^catch\b/.test(nextLine) ||
                  /^\}\s*catch\b/.test(nextLine)
                ) {
                  hasCatch = true;
                }
                break; // Only check first non-empty line
              }
              break;
            }
          }
        }

        if (startedCounting && depth === 0) break;
        if (hasCatch) break;
      }

      if (hasCatch) {
        results.push({
          lineNumber: i + 1,
          line: trimmed,
        });
      }
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
  ].filter((f) => f !== "test/code-quality/try-catch-usage.test.js");

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
    name: "ignore-try-finally-in-source",
    description: "Does not flag try/finally blocks (only try/catch)",
    test: () => {
      const source = `
const a = 1;
try {
  doSomething();
} finally {
  cleanup();
}
const b = 2;
      `;
      const results = findTryCatches(source);
      expectTrue(
        results.length === 0,
        `Expected 0 try/catch (only try/finally), found ${results.length}`,
      );
    },
  },
  {
    name: "find-try-catch-finally-in-source",
    description: "Flags try/catch/finally blocks (has catch)",
    test: () => {
      const source = `
try {
  doSomething();
} catch (e) {
  handleError(e);
} finally {
  cleanup();
}
      `;
      const results = findTryCatches(source);
      expectTrue(
        results.length === 1,
        `Expected 1 try/catch/finally, found ${results.length}`,
      );
    },
  },
  {
    name: "no-new-try-catches",
    description: "No new try/catch blocks outside the whitelist",
    test: () => {
      const { violations } = analyzeTryCatchUsage();

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
