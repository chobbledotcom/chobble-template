import { describe, expect, test } from "bun:test";
import { ALLOWED_TRY_CATCHES } from "#test/code-quality/code-quality-exceptions.js";
import {
  assertNoViolations,
  combineFileLists,
  isCommentLine,
  withAllowlist,
} from "#test/code-scanner.js";
import { ALL_JS_FILES } from "#test/test-utils.js";
import { groupBy } from "#utils/grouping.js";

/**
 * Track brace depth and find if try block has a catch.
 * Returns true if catch is found.
 */
const tryBlockHasCatch = (lines, startLineIndex) => {
  // Find first non-empty line starting from index
  const findNextNonEmpty = (idx) =>
    lines
      .slice(idx)
      .find((l) => l.trim() !== "")
      ?.trim() ?? "";

  const result = lines.slice(startLineIndex).reduce(
    (state, searchLine, index) => {
      if (state.done) return state;

      const lineIndex = startLineIndex + index;
      const chars = searchLine.split("");

      for (const [charIndex, char] of chars.entries()) {
        if (char === "{") {
          state.depth++;
          state.startedCounting = true;
          continue;
        }

        if (char !== "}") continue;

        state.depth--;

        // When we close back to depth 0, check what follows
        if (state.startedCounting && state.depth === 0) {
          // Check if catch follows the closing brace
          const afterBrace = searchLine.slice(charIndex + 1);
          if (/\s*catch\b/.test(afterBrace)) {
            state.hasCatch = true;
          } else {
            // Check if catch follows after a closing brace (inline)
            const nextLine = findNextNonEmpty(lineIndex + 1);
            state.hasCatch =
              nextLine !== "" &&
              (/^catch\b/.test(nextLine) || /^\}\s*catch\b/.test(nextLine));
          }
          state.done = true;
          return state;
        }
      }

      if (state.startedCounting && state.depth === 0) {
        state.done = true;
      }

      return state;
    },
    { depth: 0, startedCounting: false, hasCatch: false, done: false },
  );

  return result.hasCatch;
};

/**
 * Find all try/catch blocks in a file (excludes try/finally without catch)
 * Returns array of { lineNumber, line }
 */
const findTryCatches = (source) => {
  const lines = source.split("\n");
  const tryRegex = /\btry\s*\{/;

  return lines
    .map((line, index) => ({ line, index }))
    .filter(({ line }) => tryRegex.test(line))
    .filter(({ line }) => !isCommentLine(line))
    .filter(({ index }) => tryBlockHasCatch(lines, index))
    .map(({ line, index }) => ({
      lineNumber: index + 1,
      line: line.trim(),
    }));
};

const THIS_FILE = "test/unit/code-quality/try-catch-usage.test.js";

// Complete analyzer - find + allowlist + files in one definition
const tryCatchAnalysis = withAllowlist({
  find: findTryCatches,
  allowlist: ALLOWED_TRY_CATCHES,
  files: () => combineFileLists([ALL_JS_FILES()], [THIS_FILE]),
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
    const byFileMap = groupBy(allowed, (a) => a.file);
    const byFile = Object.fromEntries(
      [...byFileMap].map(([file, items]) => [file, items.map((a) => a.line)]),
    );

    for (const [file, lines] of Object.entries(byFile)) {
      console.log(`     ${file}: lines ${lines.join(", ")}`);
    }
    console.log("");

    // This test always passes - it's informational
    expect(true).toBe(true);
  });
});
