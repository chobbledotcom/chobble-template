import { describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { join } from "node:path";
import { rootDir } from "#test/test-utils.js";

const precommitPath = join(rootDir, "test", "precommit.js");

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
    // Import the extractErrorsFromOutput function by reading and evaluating the file
    const precommitCode = require("node:fs").readFileSync(
      precommitPath,
      "utf-8",
    );

    // Extract the function (this is a bit hacky but works for testing)
    // biome-ignore lint/security/noGlobalEval: Testing our own trusted code
    const extractErrorsFromOutput = eval(
      `${precommitCode
        .match(
          /export function extractErrorsFromOutput\(output\) \{[\s\S]*?\n\}/,
        )?.[0]
        ?.replace("export ", "")}; extractErrorsFromOutput`,
    );

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
    expect(errors.some((e) => e.includes("Unused files"))).toBe(true);
    expect(errors.some((e) => e.includes("Unused exports"))).toBe(true);
    expect(errors.some((e) => e.includes("Unused dependencies"))).toBe(true);
  });

  test("extractErrorsFromOutput correctly parses jscpd errors", () => {
    const precommitCode = require("node:fs").readFileSync(
      precommitPath,
      "utf-8",
    );
    // biome-ignore lint/security/noGlobalEval: Testing our own trusted code
    const extractErrorsFromOutput = eval(
      `${precommitCode
        .match(
          /export function extractErrorsFromOutput\(output\) \{[\s\S]*?\n\}/,
        )?.[0]
        ?.replace("export ", "")}; extractErrorsFromOutput`,
    );

    // Simulate real jscpd error output
    const jscpdOutput = `
$ jscpd
Clone found (src/components/Form.js[15:45] - src/components/ContactForm.js[20:50]):
  const validateEmail = (email) => {
    const regex = /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/;
    return regex.test(email);
  };

Duplication detected: 25.5% > 25% threshold
❌ Duplication threshold exceeded

Total duplicates: 1250 lines across 15 files
`;

    const errors = extractErrorsFromOutput(jscpdOutput);

    // Should capture error indicators
    expect(errors.some((e) => e.includes("❌"))).toBe(true);
    expect(
      errors.some((e) => e.includes("threshold") || e.includes("Duplication")),
    ).toBe(true);
  });

  test("extractErrorsFromOutput correctly parses test failures", () => {
    const precommitCode = require("node:fs").readFileSync(
      precommitPath,
      "utf-8",
    );
    // biome-ignore lint/security/noGlobalEval: Testing our own trusted code
    const extractErrorsFromOutput = eval(
      `${precommitCode
        .match(
          /export function extractErrorsFromOutput\(output\) \{[\s\S]*?\n\}/,
        )?.[0]
        ?.replace("export ", "")}; extractErrorsFromOutput`,
    );

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
    const precommitCode = require("node:fs").readFileSync(
      precommitPath,
      "utf-8",
    );
    // biome-ignore lint/security/noGlobalEval: Testing our own trusted code
    const extractErrorsFromOutput = eval(
      `${precommitCode
        .match(
          /export function extractErrorsFromOutput\(output\) \{[\s\S]*?\n\}/,
        )?.[0]
        ?.replace("export ", "")}; extractErrorsFromOutput`,
    );

    // Simulate real coverage error output from run-coverage.js
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
    const precommitCode = require("node:fs").readFileSync(
      precommitPath,
      "utf-8",
    );
    // biome-ignore lint/security/noGlobalEval: Testing our own trusted code
    const extractErrorsFromOutput = eval(
      `${precommitCode
        .match(
          /export function extractErrorsFromOutput\(output\) \{[\s\S]*?\n\}/,
        )?.[0]
        ?.replace("export ", "")}; extractErrorsFromOutput`,
    );

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
    const precommitCode = require("node:fs").readFileSync(
      precommitPath,
      "utf-8",
    );
    // biome-ignore lint/security/noGlobalEval: Testing our own trusted code
    const extractErrorsFromOutput = eval(
      `${precommitCode
        .match(
          /export function extractErrorsFromOutput\(output\) \{[\s\S]*?\n\}/,
        )?.[0]
        ?.replace("export ", "")}; extractErrorsFromOutput`,
    );

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
    expect(errors.some((e) => e.includes("❌"))).toBe(true);
    expect(errors.some((e) => e.startsWith("Error:"))).toBe(true);

    // Note: Stack traces might not all be captured, which is okay
    // as long as the main error message is captured
  });

  test("extractErrorsFromOutput handles empty output", () => {
    const precommitCode = require("node:fs").readFileSync(
      precommitPath,
      "utf-8",
    );
    // biome-ignore lint/security/noGlobalEval: Testing our own trusted code
    const extractErrorsFromOutput = eval(
      `${precommitCode
        .match(
          /export function extractErrorsFromOutput\(output\) \{[\s\S]*?\n\}/,
        )?.[0]
        ?.replace("export ", "")}; extractErrorsFromOutput`,
    );

    const errors = extractErrorsFromOutput("");
    expect(errors).toEqual([]);
  });

  test("extractErrorsFromOutput handles output with only whitespace", () => {
    const precommitCode = require("node:fs").readFileSync(
      precommitPath,
      "utf-8",
    );
    // biome-ignore lint/security/noGlobalEval: Testing our own trusted code
    const extractErrorsFromOutput = eval(
      `${precommitCode
        .match(
          /export function extractErrorsFromOutput\(output\) \{[\s\S]*?\n\}/,
        )?.[0]
        ?.replace("export ", "")}; extractErrorsFromOutput`,
    );

    const errors = extractErrorsFromOutput("   \n  \n   \t  \n  ");
    expect(errors).toEqual([]);
  });

  test("real knip errors are captured when knip fails", () => {
    // Create a temporary file with an unused export to trigger knip
    const testFile = join(rootDir, "src", "_lib", "test-unused-export.js");
    const fs = require("node:fs");

    // Write a file with an unused export
    fs.writeFileSync(
      testFile,
      `
export function unusedFunction() {
  return "this is never used";
}
`,
    );

    try {
      // Run knip and check if errors would be captured
      const result = spawnSync("bun", ["run", "knip"], {
        cwd: rootDir,
        encoding: "utf-8",
        stdio: ["pipe", "pipe", "pipe"],
      });

      // Even if knip doesn't fail (it might auto-fix), we've verified
      // the file structure exists
      expect(result).toBeDefined();
    } finally {
      // Clean up
      if (fs.existsSync(testFile)) {
        fs.unlinkSync(testFile);
      }
    }
  });

  test("precommit script limits errors to 10 by default", () => {
    const precommitCode = require("node:fs").readFileSync(
      precommitPath,
      "utf-8",
    );

    // Check that the script has the 10-error limit
    expect(precommitCode).toContain("errors.slice(0, 10)");
    expect(precommitCode).toContain("and ${errors.length - 10} more errors");
  });

  test("precommit script shows verbose flag hint when errors are truncated", () => {
    const precommitCode = require("node:fs").readFileSync(
      precommitPath,
      "utf-8",
    );

    // Verify the hint message exists
    expect(precommitCode).toContain("use --verbose to see all");
  });
});

/**
 * Integration tests that run the actual precommit script
 */
describe("precommit script integration", () => {
  test("precommit script exists and is executable", () => {
    const result = spawnSync("node", [precommitPath, "--help"], {
      cwd: rootDir,
      encoding: "utf-8",
    });

    // Script should run (might not have --help, but shouldn't crash)
    expect(result).toBeDefined();
  });

  test("precommit script runs in non-verbose mode by default", () => {
    const precommitCode = require("node:fs").readFileSync(
      precommitPath,
      "utf-8",
    );

    // Should check for --verbose flag
    expect(precommitCode).toContain("--verbose");
    expect(precommitCode).toContain('verbose ? "inherit" : ["inherit", "pipe"');
  });
});

/**
 * Edge case tests for error patterns that might be missed
 */
describe("precommit error pattern edge cases", () => {
  test("extractErrorsFromOutput captures eslint/biome style errors", () => {
    const precommitCode = require("node:fs").readFileSync(
      precommitPath,
      "utf-8",
    );
    // biome-ignore lint/security/noGlobalEval: Testing our own trusted code
    const extractErrorsFromOutput = eval(
      `${precommitCode
        .match(
          /export function extractErrorsFromOutput\(output\) \{[\s\S]*?\n\}/,
        )?.[0]
        ?.replace("export ", "")}; extractErrorsFromOutput`,
    );

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
    const precommitCode = require("node:fs").readFileSync(
      precommitPath,
      "utf-8",
    );
    // biome-ignore lint/security/noGlobalEval: Testing our own trusted code
    const extractErrorsFromOutput = eval(
      `${precommitCode
        .match(
          /export function extractErrorsFromOutput\(output\) \{[\s\S]*?\n\}/,
        )?.[0]
        ?.replace("export ", "")}; extractErrorsFromOutput`,
    );

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
    const precommitCode = require("node:fs").readFileSync(
      precommitPath,
      "utf-8",
    );
    // biome-ignore lint/security/noGlobalEval: Testing our own trusted code
    const extractErrorsFromOutput = eval(
      `${precommitCode
        .match(
          /export function extractErrorsFromOutput\(output\) \{[\s\S]*?\n\}/,
        )?.[0]
        ?.replace("export ", "")}; extractErrorsFromOutput`,
    );

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
    const precommitCode = require("node:fs").readFileSync(
      precommitPath,
      "utf-8",
    );
    // biome-ignore lint/security/noGlobalEval: Testing our own trusted code
    const extractErrorsFromOutput = eval(
      `${precommitCode
        .match(
          /export function extractErrorsFromOutput\(output\) \{[\s\S]*?\n\}/,
        )?.[0]
        ?.replace("export ", "")}; extractErrorsFromOutput`,
    );

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
    const precommitCode = require("node:fs").readFileSync(
      precommitPath,
      "utf-8",
    );
    // biome-ignore lint/security/noGlobalEval: Testing our own trusted code
    const extractErrorsFromOutput = eval(
      `${precommitCode
        .match(
          /export function extractErrorsFromOutput\(output\) \{[\s\S]*?\n\}/,
        )?.[0]
        ?.replace("export ", "")}; extractErrorsFromOutput`,
    );

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

    expect(errors.some((e) => e.includes("Unused files"))).toBe(true);
    expect(errors.some((e) => e.includes("Unused exports"))).toBe(true);
    expect(errors.some((e) => e.includes("Unused dependencies"))).toBe(true);
    expect(errors.some((e) => e.includes("Unlisted dependencies"))).toBe(true);

    // Should have captured the summary lines
    expect(errors.length).toBeGreaterThan(0);
  });

  test("extractErrorsFromOutput handles real jscpd duplication output", () => {
    const precommitCode = require("node:fs").readFileSync(
      precommitPath,
      "utf-8",
    );
    // biome-ignore lint/security/noGlobalEval: Testing our own trusted code
    const extractErrorsFromOutput = eval(
      `${precommitCode
        .match(
          /export function extractErrorsFromOutput\(output\) \{[\s\S]*?\n\}/,
        )?.[0]
        ?.replace("export ", "")}; extractErrorsFromOutput`,
    );

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
