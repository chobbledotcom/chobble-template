import { describe, expect, test } from "bun:test";
import { ALLOWED_TRY_CATCHES } from "#test/code-quality/code-quality-exceptions.js";
import {
  analyzeFiles,
  assertNoViolations,
  combineFileLists,
} from "#test/code-scanner.js";
import {
  ECOMMERCE_JS_FILES,
  SRC_JS_FILES,
  TEST_FILES,
} from "#test/test-utils.js";

const findTryCatches = (source) => {
  const results = [],
    lines = source.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i],
      trimmed = line.trim();
    if (
      !/\btry\s*\{/.test(line) ||
      trimmed.startsWith("//") ||
      trimmed.startsWith("*")
    )
      continue;

    let depth = 0,
      startedCounting = false,
      hasCatch = false;
    for (let j = i; j < lines.length && !hasCatch; j++) {
      for (let k = 0; k < lines[j].length; k++) {
        const char = lines[j][k];
        if (char === "{") {
          depth++;
          startedCounting = true;
        } else if (char === "}") {
          depth--;
          if (startedCounting && depth === 0) {
            const afterBrace = lines[j].slice(k + 1);
            if (/\s*catch\b/.test(afterBrace)) {
              hasCatch = true;
              break;
            }
            for (let m = j + 1; m < lines.length; m++) {
              const nextLine = lines[m].trim();
              if (nextLine === "") continue;
              if (/^catch\b/.test(nextLine) || /^\}\s*catch\b/.test(nextLine))
                hasCatch = true;
              break;
            }
            break;
          }
        }
      }
      if (startedCounting && depth === 0) break;
    }
    if (hasCatch) results.push({ lineNumber: i + 1, line: trimmed });
  }
  return results;
};

const analyzeTryCatchUsage = () => {
  const violations = [],
    allowed = [];
  const files = combineFileLists(
    [SRC_JS_FILES, ECOMMERCE_JS_FILES, TEST_FILES],
    ["test/code-quality/try-catch-usage.test.js"],
  );
  const results = analyzeFiles(files, (source, relativePath) =>
    findTryCatches(source).map((tc) => ({
      file: relativePath,
      line: tc.lineNumber,
      code: tc.line,
      location: `${relativePath}:${tc.lineNumber}`,
    })),
  );
  for (const tc of results) {
    (ALLOWED_TRY_CATCHES.has(tc.location) || ALLOWED_TRY_CATCHES.has(tc.file)
      ? allowed
      : violations
    ).push(tc);
  }
  return { violations, allowed };
};

describe("try-catch-usage", () => {
  test("Correctly identifies try/catch blocks in source code", () => {
    const source = `\nconst a = 1;\ntry {\n  doSomething();\n} catch (e) {\n  handleError(e);\n}\n// try { this is a comment\nconst b = 2;\n    `;
    const results = findTryCatches(source);
    expect(results.length).toBe(1);
    expect(results[0].lineNumber).toBe(3);
  });

  test("Does not flag try/finally blocks (only try/catch)", () => {
    const source = `\nconst a = 1;\ntry {\n  doSomething();\n} finally {\n  cleanup();\n}\nconst b = 2;\n    `;
    expect(findTryCatches(source).length).toBe(0);
  });

  test("Flags try/catch/finally blocks (has catch)", () => {
    const source = `\ntry {\n  doSomething();\n} catch (e) {\n  handleError(e);\n} finally {\n  cleanup();\n}\n    `;
    expect(findTryCatches(source).length).toBe(1);
  });

  test("No new try/catch blocks outside the whitelist", () => {
    assertNoViolations(analyzeTryCatchUsage().violations, {
      message: "non-whitelisted try/catch blocks",
      fixHint:
        "refactor to avoid try/catch, or add to ALLOWED_TRY_CATCHES in code-quality-exceptions.js",
    });
  });

  test("Reports whitelisted try/catch blocks for tracking", () => {
    const { allowed } = analyzeTryCatchUsage();
    console.log(`\n  Whitelisted try/catch blocks: ${allowed.length}`);
    console.log("  These should be removed over time:\n");
    const byFile = {};
    for (const a of allowed) {
      if (!byFile[a.file]) byFile[a.file] = [];
      byFile[a.file].push(a.line);
    }
    for (const [file, lines] of Object.entries(byFile))
      console.log(`     ${file}: lines ${lines.join(", ")}`);
    console.log("");
    expect(true).toBe(true);
  });
});
