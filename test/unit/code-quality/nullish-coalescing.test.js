import { describe, expect, test } from "bun:test";
import { ALLOWED_NULLISH_COALESCING } from "#test/code-quality/code-quality-exceptions.js";
import {
  assertNoViolations,
  createCodeChecker,
  expectNoStaleExceptions,
} from "#test/code-scanner.js";
import { SRC_JS_FILES } from "#test/test-utils.js";

const THIS_FILE = "test/unit/code-quality/nullish-coalescing.test.js";

// Files to check: src/ JS files excluding collections (where defaults belong)
// and packages/ (shared utilities, not part of site data chain)
const ALLOWED_DIRS = ["src/_lib/collections/", "packages/"];

describe("nullish-coalescing", () => {
  const { find: findNullishCoalescing, analyze: analyzeNullishCoalescing } =
    createCodeChecker({
      patterns: /\?\?/,
      files: () =>
        SRC_JS_FILES().filter(
          (file) => !ALLOWED_DIRS.some((dir) => file.startsWith(dir)),
        ),
      excludeFiles: [THIS_FILE],
      allowlist: ALLOWED_NULLISH_COALESCING,
    });

  test("Correctly identifies ?? operator in source code", () => {
    const source = `
const a = 1;
const b = value ?? "default";
const c = obj?.prop ?? fallback;
// const d = commented ?? out;
const e = other || "not nullish";
    `;
    const results = findNullishCoalescing(source);
    expect(results.length).toBe(2);
  });

  test("No ?? operator outside src/_lib/collections/ - set defaults early in data chain", () => {
    const { violations } = analyzeNullishCoalescing();
    assertNoViolations(violations, {
      singular: "nullish coalescing operator",
      fixHint:
        "set default values in src/_lib/collections/ instead, or add to ALLOWED_NULLISH_COALESCING in code-quality-exceptions.js",
    });
  });

  test("Exception list entries still exist", () => {
    expectNoStaleExceptions(
      ALLOWED_NULLISH_COALESCING,
      /\?\?/,
      "ALLOWED_NULLISH_COALESCING",
    );
  });
});
