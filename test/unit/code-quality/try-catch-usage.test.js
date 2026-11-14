import { parseSync } from "oxc-parser";
import { describe, expect, test } from "vitest";
import { ALLOWED_TRY_CATCHES } from "#test/code-quality/code-quality-exceptions.js";
import {
  assertNoViolations,
  combineFileLists,
  withAllowlist,
} from "#test/code-scanner.js";
import { ALL_JS_FILES, path, rootDir, withTempFile } from "#test/test-utils.js";
import { frozenSet } from "#utils/fp/set.js";

/**
 * Find all try/catch blocks in a file (excludes try/finally without catch)
 * Returns array of { lineNumber, line }
 */
const findTryCatches = (source) => {
  const { program, errors } = parseSync("source.js", source);
  if (errors.length) {
    throw new Error(`Cannot parse source for catch scan: ${errors[0].message}`);
  }
  const lines = source.split(/\r\n|[\n\r\u2028\u2029]/);
  const findCatches = (node) => {
    if (node === null || typeof node !== "object") return [];
    const nested = Object.values(node).flatMap(findCatches);
    if (node.type !== "TryStatement" || !node.handler) return nested;
    const lineNumber = source
      .slice(0, node.start)
      .split(/\r\n|[\n\r\u2028\u2029]/).length;
    return [{ lineNumber, line: lines[lineNumber - 1].trim() }, ...nested];
  };
  return findCatches(program);
};

const THIS_FILE = "test/unit/code-quality/try-catch-usage.test.js";

// Complete analyzer - find + allowlist + files in one definition
const tryCatchAnalysis = withAllowlist({
  find: findTryCatches,
  allowlist: ALLOWED_TRY_CATCHES,
  files: () => combineFileLists([ALL_JS_FILES()], [THIS_FILE]),
});

const staleTryCatchExceptions = (allowlist, files) => {
  const { allowed } = withAllowlist({
    find: findTryCatches,
    allowlist,
    files,
  })();
  return [...allowlist].filter(
    (entry) =>
      !allowed.some(
        ({ file, location }) => entry === file || entry === location,
      ),
  );
};

describe("try-catch-usage", () => {
  test.each([
    ["live catch", "try {} catch {}", false],
    ["finally without catch", "try {} finally {}", true],
    ["commented catch", "// try {} catch {}", true],
    ["block-commented catch", "/* try {} catch {} */", true],
    ["string containing a catch", 'const sample = "try {} catch {}";', true],
    ["multiline block-commented catch", "/*\ntry {} catch {}\n*/", true],
    ["template containing a catch", "const sample = `try {} catch {}`;", true],
    ["removed try", "const value = 1;", true],
  ])("checks exception liveness for a %s", (_name, source, stale) => {
    withTempFile("catch-exceptions", "fixture.js", source, (_dir, filePath) => {
      const file = path.relative(rootDir, filePath);
      const entries = [file, `${file}:1`];

      expect(staleTryCatchExceptions(frozenSet(entries), [file])).toEqual(
        stale ? entries : [],
      );
    });
  });

  test("a catch elsewhere in a file does not keep a line exception alive", () => {
    withTempFile(
      "catch-exceptions",
      "fixture.js",
      "try {} finally {}\ntry {} catch {}",
      (_dir, filePath) => {
        const file = path.relative(rootDir, filePath);
        expect(
          staleTryCatchExceptions(frozenSet([file, `${file}:1`, `${file}:2`]), [
            file,
          ]),
        ).toEqual([`${file}:1`]);
      },
    );
  });

  test("exceptions for files absent from the scan are stale", () => {
    const entries = ["deleted.js", "deleted.js:1"];
    expect(staleTryCatchExceptions(frozenSet(entries), [])).toEqual(entries);
  });

  test("detects nested catches at their source locations", () => {
    const source = "try {\n  try {} catch {}\n} catch {}";
    expect(findTryCatches(source)).toEqual([
      { lineNumber: 1, line: "try {" },
      { lineNumber: 2, line: "try {} catch {}" },
    ]);
  });

  test("detects a catch with braces in strings and intervening comments", () => {
    const source = 'try { const text = "}"; } /* cleanup boundary */ catch {}';
    expect(findTryCatches(source)).toEqual([{ lineNumber: 1, line: source }]);
  });

  test("rejects invalid source rather than silently passing the catch scan", () => {
    expect(() => findTryCatches("try {")).toThrow(
      "Cannot parse source for catch scan:",
    );
  });

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
        "refactor so the error propagates instead of being caught - the ALLOWED_TRY_CATCHES baseline is deletion-only",
    });
    // Parses every JavaScript file; cold precommit runs exceed the default timeout.
  }, 5000);

  test("ALLOWED_TRY_CATCHES entries still refer to detected catches", () => {
    expect(
      staleTryCatchExceptions(
        ALLOWED_TRY_CATCHES,
        combineFileLists([ALL_JS_FILES()], [THIS_FILE]),
      ),
      "Remove stale ALLOWED_TRY_CATCHES entries and lock in the baseline deletion",
    ).toEqual([]);
    // Parses every JavaScript file; cold precommit runs exceed the default timeout.
  }, 5000);

  test("Reports whitelisted try/catch blocks for tracking", () => {
    const { allowed } = tryCatchAnalysis();

    console.log(`\n  Whitelisted try/catch blocks: ${allowed.length}`);
    console.log("  These should be removed over time:\n");

    // Group by file for cleaner output
    const byFileMap = Map.groupBy(allowed, (a) => a.file);
    const byFile = Object.fromEntries(
      [...byFileMap].map(([file, items]) => [file, items.map((a) => a.line)]),
    );

    for (const [file, lines] of Object.entries(byFile)) {
      console.log(`     ${file}: lines ${lines.join(", ")}`);
    }
    console.log("");
    // Parses every JavaScript file; cold precommit runs exceed the default timeout.
  }, 5000);
});
