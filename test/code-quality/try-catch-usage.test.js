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
 * Check if a line is a comment
 */
const isCommentLine = (line) => {
  const trimmed = line.trim();
  return trimmed.startsWith("//") || trimmed.startsWith("*");
};

/**
 * Check if a string contains a catch keyword after whitespace
 */
const hasCatchKeyword = (text) => /\s*catch\b/.test(text);

/**
 * Find the first non-empty line starting from index
 */
const findNextNonEmptyLine = (lines, startIndex) => {
  for (let i = startIndex; i < lines.length; i++) {
    const trimmed = lines[i].trim();
    if (trimmed !== "") return trimmed;
  }
  return null;
};

/**
 * Check if the line following a closing brace has a catch
 */
const nextLineHasCatch = (lines, lineIndex) => {
  const nextLine = findNextNonEmptyLine(lines, lineIndex + 1);
  if (!nextLine) return false;
  return /^catch\b/.test(nextLine) || /^\}\s*catch\b/.test(nextLine);
};

/**
 * Check if catch follows the closing brace at this position
 */
const catchFollowsClosingBrace = (searchLine, charIndex, lines, lineIndex) => {
  const afterBrace = searchLine.slice(charIndex + 1);
  if (hasCatchKeyword(afterBrace)) return true;
  return nextLineHasCatch(lines, lineIndex);
};

/**
 * Process characters in a line to track brace depth
 * Returns { depth, foundCatch: boolean | null, startedCounting }
 */
const processLineChars = (searchLine, initialDepth, initialStartedCounting, lines, lineIndex) => {
  let depth = initialDepth;
  let startedCounting = initialStartedCounting;

  for (let charIndex = 0; charIndex < searchLine.length; charIndex++) {
    const char = searchLine[charIndex];

    if (char === "{") {
      depth++;
      startedCounting = true;
      continue;
    }

    if (char !== "}") continue;

    depth--;

    // When we close back to depth 0, check what follows
    if (startedCounting && depth === 0) {
      const foundCatch = catchFollowsClosingBrace(
        searchLine,
        charIndex,
        lines,
        lineIndex,
      );
      return { depth, foundCatch, startedCounting };
    }
  }

  return { depth, foundCatch: null, startedCounting };
};

/**
 * Track brace depth and find if try block has a catch
 * Returns true if catch is found
 */
const tryBlockHasCatch = (lines, startLineIndex) => {
  let depth = 0;
  let startedCounting = false;

  for (let lineIndex = startLineIndex; lineIndex < lines.length; lineIndex++) {
    const result = processLineChars(
      lines[lineIndex],
      depth,
      startedCounting,
      lines,
      lineIndex,
    );

    depth = result.depth;
    startedCounting = result.startedCounting;

    if (result.foundCatch !== null) return result.foundCatch;
    if (startedCounting && depth === 0) return false;
  }

  return false;
};

/**
 * Find all try/catch blocks in a file (excludes try/finally without catch)
 * Returns array of { lineNumber, line }
 */
const findTryCatches = (source) => {
  const results = [];
  const lines = source.split("\n");
  const tryRegex = /\btry\s*\{/;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (!tryRegex.test(line)) continue;
    if (isCommentLine(line)) continue;

    if (tryBlockHasCatch(lines, i)) {
      results.push({
        lineNumber: i + 1,
        line: line.trim(),
      });
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
