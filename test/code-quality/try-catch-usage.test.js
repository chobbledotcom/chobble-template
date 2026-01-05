import { describe, expect, test } from "bun:test";
import { ALLOWED_TRY_CATCHES } from "#test/code-quality/code-quality-exceptions.js";
import {
  assertNoViolations,
  combineFileLists,
  withAllowlist,
} from "#test/code-scanner.js";
import {
  ECOMMERCE_JS_FILES,
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

const THIS_FILE = "test/code-quality/try-catch-usage.test.js";

// Complete analyzer - find + allowlist + files in one definition
const tryCatchAnalysis = withAllowlist({
  find: findTryCatches,
  allowlist: ALLOWED_TRY_CATCHES,
  files: () =>
    combineFileLists(
      [SRC_JS_FILES(), ECOMMERCE_JS_FILES(), TEST_FILES()],
      [THIS_FILE],
    ),
});

describe("try-catch-usage", () => {
  test("Correctly identifies try/catch blocks in source code", () => {
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
    expect(results.length).toBe(1);
    expect(results[0].lineNumber).toBe(3);
  });

  test("Does not flag try/finally blocks (only try/catch)", () => {
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
    expect(results.length).toBe(0);
  });

  test("Flags try/catch/finally blocks (has catch)", () => {
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
    expect(results.length).toBe(1);
  });

  test("No new try/catch blocks outside the whitelist", () => {
    const { violations } = tryCatchAnalysis();
    assertNoViolations(violations, {
      message: "non-whitelisted try/catch blocks",
      fixHint:
        "refactor to avoid try/catch, or add to ALLOWED_TRY_CATCHES in code-quality-exceptions.js",
    });
  });

  test("Reports whitelisted try/catch blocks for tracking", () => {
    const { allowed } = tryCatchAnalysis();

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
    expect(true).toBe(true);
  });
});
