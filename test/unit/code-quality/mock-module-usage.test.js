/**
 * Bans bare `mock.module(...)` calls in test files.
 *
 * Bun's `mock.module()` replaces a module's exports for the entire process
 * and is NOT automatically restored between files. A bare call at the top
 * of one test file silently changes module behavior in every other file
 * that shares the same Bun worker, producing bugs that look flaky but are
 * really order-dependent.
 *
 * Use `mockModule` from `#test/test-utils.js` instead. It registers an
 * `afterAll` hook that restores the original exports when the file finishes.
 *
 * BAD:
 *   mock.module("#data/config.js", () => ({ default: () => ({ ... }) }));
 *
 * GOOD:
 *   import { mockModule } from "#test/test-utils.js";
 *   await mockModule("#data/config.js", () => ({ default: () => ({ ... }) }));
 *
 * Files allowlisted below stub modules that cannot be loaded in a test
 * harness (e.g. they read `document` at import time). Every consumer has
 * to stub them anyway — no real module exists to restore to, so a bare
 * `mock.module` is the least ceremony for that case.
 */
import { describe, expect, test } from "bun:test";
import { assertNoViolations, createCodeChecker } from "#test/code-scanner.js";
import { TEST_FILES } from "#test/test-utils.js";

const THIS_FILE = "test/unit/code-quality/mock-module-usage.test.js";
const HELPER_FILE = "test/test-utils.js";

// Files that stub DOM-dependent modules and can't use mockModule's restore
const ALLOWED_BARE_MOCK_MODULE = [
  "test/unit/frontend/checkout.test.js",
  "test/unit/frontend/ntfy.test.js",
  "test/unit/frontend/products-cache.test.js",
];

describe("mock-module-usage", () => {
  const { find: findMockModuleCalls, analyze: analyzeMockModuleUsage } =
    createCodeChecker({
      patterns: /\bmock\.module\s*\(/,
      skipPatterns: [/^\/\//, /^\*/],
      files: TEST_FILES(),
      excludeFiles: [THIS_FILE, HELPER_FILE, ...ALLOWED_BARE_MOCK_MODULE],
    });

  test("Identifies bare mock.module() calls", () => {
    const source = `
mock.module("foo", () => ({}));
// mock.module("commented", () => ({}));
await mockModule("bar", () => ({}));
    `;
    const results = findMockModuleCalls(source);
    expect(results.length).toBe(1);
  });

  test("No bare mock.module() calls - use mockModule helper", () => {
    const { violations } = analyzeMockModuleUsage();
    assertNoViolations(violations, {
      singular: "bare mock.module() call",
      fixHint:
        'import { mockModule } from "#test/test-utils.js" and use `await mockModule(...)` instead. The helper registers an afterAll hook that restores the real module so the mock cannot leak into other test files.',
    });
  });
});
