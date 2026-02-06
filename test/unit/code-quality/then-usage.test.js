import { describe, expect, test } from "bun:test";
import {
  assertNoViolations,
  combineFileLists,
  createCodeChecker,
} from "#test/code-scanner.js";
import { SRC_JS_FILES, TEST_FILES } from "#test/test-utils.js";

const THIS_FILE = "test/unit/code-quality/then-usage.test.js";

describe("then-usage", () => {
  // Create checker inside describe block to ensure imports are resolved
  const { find: findThenCalls, analyze: analyzeThenUsage } = createCodeChecker({
    patterns: /\.then\s*\(/,
    skipPatterns: [/^\/\//, /^\*/],
    files: combineFileLists([SRC_JS_FILES(), TEST_FILES()]),
    excludeFiles: [THIS_FILE],
  });

  test("Correctly identifies .then() calls in source code", () => {
    const source = `
const a = 1;
fetch(url).then((res) => res.json());
promise.then(handleSuccess);
// promise.then(comment);
await asyncFunction();
    `;
    const results = findThenCalls(source);
    expect(results.length).toBe(2);
  });

  test("No .then() chains - use async/await instead", () => {
    const { violations } = analyzeThenUsage();
    assertNoViolations(violations, {
      singular: ".then() call",
      fixHint: "use async/await instead of .then() chains",
    });
  });
});
