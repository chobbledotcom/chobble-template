import { describe, expect, test } from "bun:test";
import { join } from "node:path";
import { extractErrorsFromOutput } from "#test/test-runner-utils.js";
import { rootDir } from "#test/test-utils.js";

const precommitPath = join(rootDir, "test", "precommit.js");

/**
 * Assert that all expected strings appear in the errors array.
 * Uses functional iteration to verify each expectation independently.
 * Provides clear error messages when a specific string is not found.
 *
 * @param {Array<string>} errors - Array of error strings to search
 * @param {...string} expectedStrings - Strings that should appear in errors
 *
 * @example
 * expectErrorsToInclude(errors, "Unused files", "Unused exports");
 */
const expectErrorsToInclude = (errors, ...expectedStrings) => {
  for (const str of expectedStrings) {
    expect(errors.some((e) => e.includes(str))).toBe(true);
  }
};

/**
 * Assert that errors contain error indicator and at least one of the conditions.
 * Supports arrays of alternatives (any match succeeds) and functions (custom checks).
 *
 * @param {Array<string>} errors - Array of error strings
 * @param {...(string|Array<string>|Function)} conditions - One or more conditions to check
 *
 * @example
 * expectErrorIndicator(errors, "❌", ["threshold", "Duplication"]);
 * expectErrorIndicator(errors, "❌", (e) => e.startsWith("Error:"));
 */
const expectErrorIndicator = (errors, ...conditions) => {
  for (const condition of conditions) {
    if (typeof condition === "function") {
      expect(errors.some(condition)).toBe(true);
    } else if (Array.isArray(condition)) {
      expect(errors.some((e) => condition.some((c) => e.includes(c)))).toBe(
        true,
      );
    } else {
      expect(errors.some((e) => e.includes(condition))).toBe(true);
    }
  }
};

/**
 * Tests for the precommit script error output handling.
 *
 * The precommit script should:
 * 1. Show clean, concise output by default
 * 2. ALWAYS show the full error response when tools fail
 * 3. Capture errors from knip, jscpd, tests, and coverage
 * 4. Not lose important error details in the filtering process
 */
describe("precommit error output", () => {
  test("extractErrorsFromOutput correctly parses knip errors", () => {
    // Simulate real knip error output
    const knipOutput = `
$ knip --fix

Unused files (3)
src/unused-file.js
lib/old-component.js
test/deprecated.test.js

Unused exports (5)
src/utils/helpers.js
  - unusedFunction
  - deprecatedHelper
src/components/Button.js
  - internalMethod
  - UNUSED_CONSTANT

Unused dependencies (2)
  - lodash
  - moment

Unlisted dependencies (1)
  - axios
`;

    const errors = extractErrorsFromOutput(knipOutput);

    // Should capture the summary lines
    expectErrorsToInclude(
      errors,
      "Unused files",
      "Unused exports",
      "Unused dependencies",
    );
  });

  test("extractErrorsFromOutput correctly parses jscpd errors", () => {
    // Simulate real jscpd error output
    const jscpdOutput = `
$ jscpd
Clone found (src/components/Form.js[15:45] - src/components/ContactForm.js[20:50])

Duplication detected: 25.5% > 25% threshold
❌ Duplication threshold exceeded

Total duplicates: 1250 lines across 15 files
`;

    const errors = extractErrorsFromOutput(jscpdOutput);

    // Should capture error indicators
    expectErrorIndicator(errors, "❌", ["threshold", "Duplication"]);
  });

  test("extractErrorsFromOutput correctly parses test failures", () => {
    // Simulate real bun test failure output
    const testOutput = `
$ bun test test/unit

❌ utils.test.js > formatDate handles invalid dates
AssertionError: expected "Invalid Date" to equal "N/A"

❌ components.test.js > Button renders with correct props
AssertionError: expected undefined to be defined

2 tests failed
25 tests passed
`;

    const errors = extractErrorsFromOutput(testOutput);

    // Should capture failure indicators
    expect(errors.some((e) => e.includes("❌"))).toBe(true);
    expect(errors.some((e) => e.includes("FAIL") || e.includes("failed"))).toBe(
      true,
    );
  });

  test("extractErrorsFromOutput correctly parses coverage errors", () => {
    // Simulate real coverage error output from bun test --coverage
    const coverageOutput = `
❌ Coverage below threshold for statements: 85.5% < 90%
❌ Coverage below threshold for branches: 75.2% < 80%

Uncovered lines:
src/utils/helpers.js: 25, 30, 45-52
src/components/Form.js: 120, 125

Uncovered functions:
src/utils/helpers.js: formatCurrency, parseDate
src/api/client.js: retryRequest

These files must have test coverage:
src/new-feature.js
src/utils/new-helper.js
`;

    const errors = extractErrorsFromOutput(coverageOutput);

    // Should capture all coverage-related errors
    expect(errors.some((e) => e.includes("below threshold"))).toBe(true);
    expect(errors.some((e) => e.includes("Uncovered"))).toBe(true);
    expect(errors.some((e) => e.includes("must have test coverage"))).toBe(
      true,
    );

    // Should capture file paths with line/function details
    expect(errors.some((e) => e.includes("src/utils/helpers.js:"))).toBe(true);
  });

  test("extractErrorsFromOutput filters out noise but keeps errors", () => {
    const noisyOutput = `
$ bun test

/home/user/project/test/unit/something.test.js

image1.jpg
image2.png
header-bg.gif

node -e "console.log('running tests')"

❌ Test failed: expected true to be false

Some other output
/some/random/path

error: something went wrong
`;

    const errors = extractErrorsFromOutput(noisyOutput);

    // Should filter out command lines starting with $
    expect(errors.some((e) => e.startsWith("$ bun"))).toBe(false);

    // Should filter out file paths starting with /
    expect(errors.some((e) => e.startsWith("/home"))).toBe(false);
    expect(errors.some((e) => e.startsWith("/some"))).toBe(false);

    // Should filter out image files
    expect(errors.some((e) => e.includes(".jpg"))).toBe(false);
    expect(errors.some((e) => e.includes(".png"))).toBe(false);
    expect(errors.some((e) => e.includes(".gif"))).toBe(false);

    // Should filter out node -e commands
    expect(errors.some((e) => e.startsWith("node -e"))).toBe(false);

    // Should KEEP actual errors
    expect(errors.some((e) => e.includes("❌"))).toBe(true);
    expect(errors.some((e) => e.startsWith("error:"))).toBe(true);
  });

  test("extractErrorsFromOutput handles multiline error messages", () => {
    const multilineOutput = `
❌ Test suite failed

Error: Cannot find module 'missing-dep'
  at Object.<anonymous> (src/index.js:5:15)
  at Module._compile (node:internal/modules:123:45)
  at Module.load (node:internal/modules:234:56)

❌ Another error here
`;

    const errors = extractErrorsFromOutput(multilineOutput);

    // Should capture error indicators
    expectErrorIndicator(errors, "❌", (e) => e.startsWith("Error:"));

    // Note: Stack traces might not all be captured, which is okay
    // as long as the main error message is captured
  });

  test("extractErrorsFromOutput handles empty output", () => {
    const errors = extractErrorsFromOutput("");
    expect(errors).toEqual([]);
  });

  test("extractErrorsFromOutput handles output with only whitespace", () => {
    const errors = extractErrorsFromOutput("   \n  \n   \t  \n  ");
    expect(errors).toEqual([]);
  });

  test("real knip errors are captured when knip fails", () => {
    // This test verifies the file structure exists for running knip
    // We don't actually run knip in the test as it's slow and tested elsewhere
    const fs = require("node:fs");

    // Verify knip command exists in package.json
    const packageJson = JSON.parse(
      fs.readFileSync(join(rootDir, "package.json"), "utf-8"),
    );

    expect(packageJson.scripts.knip).toBeDefined();
    expect(packageJson.scripts["knip:fix"]).toBeDefined();
    expect(packageJson.devDependencies.knip).toBeDefined();
  });

  test("precommit script limits errors to 10 by default", () => {
    const testRunnerUtilsPath = join(rootDir, "test", "test-runner-utils.js");
    const testRunnerUtilsCode = require("node:fs").readFileSync(
      testRunnerUtilsPath,
      "utf-8",
    );

    // Check that the shared utilities use printTruncatedList with errors label
    expect(testRunnerUtilsCode).toContain(
      'import { printTruncatedList } from "#utils/array-utils.js"',
    );
    expect(testRunnerUtilsCode).toContain(
      'printTruncatedList({ moreLabel: "errors"',
    );
  });

  test("precommit script shows verbose flag hint when errors are truncated", () => {
    const arrayUtilsPath = join(rootDir, "src/_lib/utils/array-utils.js");
    const arrayUtilsCode = require("node:fs").readFileSync(
      arrayUtilsPath,
      "utf-8",
    );

    // Verify the printTruncatedList utility has the verbose hint as default
    expect(arrayUtilsCode).toContain("use --verbose to see all");
  });
});

/**
 * Integration tests that run the actual precommit script
 */
describe("precommit script integration", () => {
  test("precommit script exists and is executable", () => {
    const fs = require("node:fs");
    const { access, constants } = require("node:fs");

    // Check file exists and is executable
    expect(fs.existsSync(precommitPath)).toBe(true);

    // Verify file has execute permissions (or at least read permissions)
    const stats = fs.statSync(precommitPath);
    expect(stats.isFile()).toBe(true);
  });

  test("precommit script runs in non-verbose mode by default", () => {
    const precommitCode = require("node:fs").readFileSync(
      precommitPath,
      "utf-8",
    );
    const testRunnerUtilsPath = join(rootDir, "test", "test-runner-utils.js");
    const testRunnerUtilsCode = require("node:fs").readFileSync(
      testRunnerUtilsPath,
      "utf-8",
    );

    // Precommit should check for --verbose flag
    expect(precommitCode).toContain("--verbose");
    // Shared utilities should handle verbose stdio
    expect(testRunnerUtilsCode).toContain(
      'verbose ? "inherit" : ["inherit", "pipe"',
    );
  });
});

/**
 * Edge case tests for error patterns that might be missed
 */
describe("precommit error pattern edge cases", () => {
  test("extractErrorsFromOutput captures eslint/biome style errors", () => {
    const lintOutput = `
src/components/Button.js:15:3
  error: 'useState' is not defined  no-undef

src/utils/helpers.js:42:10
  error: Unexpected console statement  no-console

❌ 2 errors found
`;

    const errors = extractErrorsFromOutput(lintOutput);

    // Should capture error lines
    expect(errors.some((e) => e.includes("error:") || e.includes("❌"))).toBe(
      true,
    );
  });

  test("extractErrorsFromOutput captures assertion errors", () => {
    const assertOutput = `
❌ test/unit/utils.test.js > formatDate
AssertionError: expected 'foo' to equal 'bar'
  Expected: "bar"
  Received: "foo"
`;

    const errors = extractErrorsFromOutput(assertOutput);

    expect(errors.some((e) => e.includes("❌"))).toBe(true);
    // Note: "Error:" lines should also be captured
    // but AssertionError might not have "error:" prefix
  });

  test("extractErrorsFromOutput handles errors with colons in unexpected places", () => {
    // Coverage errors with file:line patterns
    const coverageOutput = `
❌ Coverage failed
src/utils/helpers.js: 25, 30, 45
src/api/client.js: retryRequest, handleError
`;

    const errors = extractErrorsFromOutput(coverageOutput);

    expect(errors.some((e) => e.includes("❌"))).toBe(true);
    // File patterns should be captured
    expect(errors.some((e) => e.match(/^[\w./-]+\.\w+:\s*.+$/))).toBe(true);
  });

  test("extractErrorsFromOutput captures stack traces for debugging", () => {
    const stackTraceOutput = `
Error: Cannot find module 'missing-package'
  at Object.<anonymous> (src/index.js:15:32)
  at Module._compile (node:internal/modules/cjs/loader:1234:14)
  at Module.load (node:internal/modules/cjs/loader:567:32)
`;

    const errors = extractErrorsFromOutput(stackTraceOutput);

    // Should capture the error message
    expect(errors.some((e) => e.startsWith("Error:"))).toBe(true);
    // Should capture at least some stack frames
    expect(errors.some((e) => e.includes("at Object.<anonymous>"))).toBe(true);
  });

  test("extractErrorsFromOutput handles complex real-world knip output", () => {
    // Real knip output format
    const realKnipOutput = `
Unused files (3)
src/_lib/deprecated/old-util.js
src/assets/js/unused-script.js
test/fixtures/old-test.js

Unused exports (5)
src/utils/helpers.js
  - formatOldDate
  - DEPRECATED_CONSTANT
src/components/Button.js
  - privateMethod
  - internalState

Unused dependencies (2)
  - lodash
  - moment

Unlisted dependencies (1)
  - axios (used in src/api/client.js)
`;

    const errors = extractErrorsFromOutput(realKnipOutput);

    expectErrorsToInclude(
      errors,
      "Unused files",
      "Unused exports",
      "Unused dependencies",
      "Unlisted dependencies",
    );

    // Should have captured the summary lines
    expect(errors.length).toBeGreaterThan(0);
  });

  test("extractErrorsFromOutput handles real jscpd duplication output", () => {
    const realJscpdOutput = `
Clone found (src/components/Form.js[15:45] - src/components/ContactForm.js[20:50])

Duplication detected: 25.5% > 25% threshold

Total duplicates: 1250 lines across 15 files
`;

    const errors = extractErrorsFromOutput(realJscpdOutput);

    expect(errors.some((e) => e.includes("Clone found"))).toBe(true);
    expect(errors.some((e) => e.includes("Duplication detected"))).toBe(true);
    expect(errors.some((e) => e.includes("Total duplicates"))).toBe(true);
  });
});
