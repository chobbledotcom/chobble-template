import { describe, expect, test } from "bun:test";
import {
  extractErrorsFromOutput,
  printSummary,
  printTruncatedList,
  runStep,
} from "#test/test-runner-utils.js";
import { captureConsole, withMockedProcessExit } from "#test/test-utils.js";
import { mapObject } from "#utils/object-entries.js";

// ============================================
// Test Helpers
// ============================================

/**
 * Creates a standard set of test steps (lint and test)
 */
const createBasicSteps = () => [
  { name: "lint", cmd: "bun", args: ["run", "lint"] },
  { name: "test", cmd: "bun", args: ["test"] },
];

/**
 * Creates results object with the given status and output for each step
 */
const createResults = mapObject((name, config) => [
  name,
  {
    status: config.status ?? 0,
    stdout: config.stdout ?? "",
    stderr: config.stderr ?? "",
  },
]);

/**
 * Captures console output from printSummary, mocking process.exit
 */
const captureSummaryOutput = (steps, results, title) =>
  withMockedProcessExit(null, () => {
    const output = captureConsole(() => printSummary(steps, results, title));
    // captureConsole returns an array of lines, join them into a string
    return output.join("\n");
  });

/**
 * Creates three standard steps (lint, test, build)
 */
const createThreeSteps = () => [
  { name: "lint", cmd: "bun", args: ["run", "lint"] },
  { name: "test", cmd: "bun", args: ["test"] },
  { name: "build", cmd: "bun", args: ["run", "build"] },
];

/**
 * Creates a step that runs a bun script
 */
const createBunScriptStep = (name, script) => ({
  name,
  cmd: "bun",
  args: ["-e", script],
});

/**
 * Helper to create a single build step, results, and capture output
 */
const createBuildTestOutput = (buildConfig) => {
  const steps = [{ name: "build", cmd: "bun", args: ["run", "build"] }];
  const results = createResults({ build: buildConfig });
  return captureSummaryOutput(steps, results);
};

describe("test-runner-utils", () => {
  // ============================================
  // runStep Tests
  // ============================================
  describe("runStep", () => {
    // Output is captured in both modes (for error extraction)
    test.each([
      true,
      false,
    ])("Executes command and captures output (verbose=%s)", (verbose) => {
      const step = { name: "test-step", cmd: "echo", args: ["hello"] };

      const result = runStep(step, verbose);

      expect(result.status).toBe(0);
      expect(result.stdout).toContain("hello");
      expect(result.stderr).toBe("");
    });

    test("Captures stdout and stderr in non-verbose mode", () => {
      const step = createBunScriptStep(
        "error-step",
        "console.error('error message'); console.log('output')",
      );

      const result = runStep(step, false);

      expect(result.status).toBe(0);
      expect(result.stdout).toContain("output");
      expect(result.stderr).toContain("error message");
    });

    test("Returns non-zero status for failed command", () => {
      const step = createBunScriptStep("failing-step", "process.exit(1)");

      const result = runStep(step, false);

      expect(result.status).toBe(1);
    });
  });

  // ============================================
  // extractErrorsFromOutput Tests
  // ============================================
  describe("extractErrorsFromOutput", () => {
    test("Extracts lines starting with error indicators", () => {
      const output = `
Some normal output
❌ This is an error
error: Something went wrong
Error: Another problem
normal line
AssertionError: Test failed
      `;

      const errors = extractErrorsFromOutput(output);

      expect(errors).toContain("❌ This is an error");
      expect(errors).toContain("error: Something went wrong");
      expect(errors).toContain("Error: Another problem");
      expect(errors).toContain("AssertionError: Test failed");
      expect(errors).not.toContain("Some normal output");
      expect(errors).not.toContain("normal line");
    });

    test("Extracts FAIL indicators", () => {
      const output = `
Tests running...
FAIL test/example.test.js
3 tests failed
normal line
      `;

      const errors = extractErrorsFromOutput(output);

      expect(errors).toContain("FAIL test/example.test.js");
      expect(errors).toContain("3 tests failed");
    });

    test("Extracts coverage threshold errors", () => {
      const output = `
Coverage: 85.5%
Line coverage below threshold: 90%
Statement coverage below threshold
      `;

      const errors = extractErrorsFromOutput(output);

      expect(errors).toContain("Line coverage below threshold: 90%");
      expect(errors).toContain("Statement coverage below threshold");
    });

    test("Extracts uncovered line errors", () => {
      const output = `
Coverage report
Uncovered lines: 10-15, 25
Some file must have test coverage
      `;

      const errors = extractErrorsFromOutput(output);

      expect(errors).toContain("Uncovered lines: 10-15, 25");
      expect(errors).toContain("Some file must have test coverage");
    });

    test("Extracts tool-specific error patterns", () => {
      const output = `
Unused files (3)
Unused exports (5)
Unlisted dependencies found
Clone found in src/file.js
Duplication detected
Total duplicates: 10
2 tests failed
15 errors found
coverage at 85%
      `;

      const errors = extractErrorsFromOutput(output);

      expect(errors).toContain("Unused files (3)");
      expect(errors).toContain("Unused exports (5)");
      expect(errors).toContain("Unlisted dependencies found");
      expect(errors).toContain("Clone found in src/file.js");
      expect(errors).toContain("Duplication detected");
      expect(errors).toContain("Total duplicates: 10");
      expect(errors).toContain("2 tests failed");
      expect(errors).toContain("15 errors found");
      expect(errors).toContain("coverage at 85%");
    });

    test("Extracts coverage violation details with file paths", () => {
      const output = `
Coverage violations:
src/file.js: 10, 20, 30
src/other.js: funcName, otherFunc
normal output
      `;

      const errors = extractErrorsFromOutput(output);

      expect(errors).toContain("src/file.js: 10, 20, 30");
      expect(errors).toContain("src/other.js: funcName, otherFunc");
    });

    test("Excludes allowlist tracking patterns", () => {
      const output = `
file.js: 5 instance(s)
file.js: 3 usage(s)
file.js: lines 12, 28
src/real-error.js: 10, 20
      `;

      const errors = extractErrorsFromOutput(output);

      expect(errors).not.toContain("file.js: 5 instance(s)");
      expect(errors).not.toContain("file.js: 3 usage(s)");
      expect(errors).not.toContain("file.js: lines 12, 28");
      expect(errors).toContain("src/real-error.js: 10, 20");
    });

    test("Extracts stack trace lines with context", () => {
      const output = `
Error: Something went wrong
    at Object.<anonymous> (src/index.js:5:15)
    at Module._compile (internal/modules/cjs/loader.js:999:30)
    at Function.executeUserCode (src/app.js:42:10)
normal line
      `;

      const errors = extractErrorsFromOutput(output);

      expect(errors).toContain("Error: Something went wrong");
      expect(errors.some((e) => e.includes("at Object.<anonymous>"))).toBe(
        true,
      );
      expect(errors.some((e) => e.includes("at Module._compile"))).toBe(true);
      expect(
        errors.some((e) => e.includes("at Function.executeUserCode")),
      ).toBe(true);
    });

    test("Skips empty lines and common cruft", () => {
      const output = `

$ npm test
/home/user/project
image.jpg
file.png
test.gif
node -e "console.log('test')"
      `;

      const errors = extractErrorsFromOutput(output);

      expect(errors).toEqual([]);
    });

    test("Handles case-insensitive fail patterns", () => {
      const output = `
Test failed with error
tests FAIL
Failed to compile
      `;

      const errors = extractErrorsFromOutput(output);

      expect(errors).toContain("Test failed with error");
      expect(errors).toContain("tests FAIL");
      expect(errors).toContain("Failed to compile");
    });

    test("Excludes '0 fail' from fail patterns", () => {
      const output = `
0 fail
1 failed test
      `;

      const errors = extractErrorsFromOutput(output);

      expect(errors).not.toContain("0 fail");
      expect(errors).toContain("1 failed test");
    });
  });

  // ============================================
  // printSummary Tests
  // ============================================
  describe("printSummary", () => {
    test("Prints summary with all passing steps", () => {
      const steps = createBasicSteps();
      const results = createResults({
        lint: {},
        test: {},
      });

      const output = captureConsole(() => printSummary(steps, results));

      expect(output).toContain("SUMMARY");
      expect(output).toContain("=".repeat(60));
      expect(output).toContain("✅ Passed: lint, test");
      expect(output).not.toContain("❌ Failed");
    });

    test("Prints summary with failing steps and extracted errors", () => {
      const steps = createBasicSteps();
      const results = createResults({
        lint: {},
        test: {
          status: 1,
          stdout: "❌ Test failed\n2 tests failed\nsome normal output",
          stderr: "Error: Assertion failed",
        },
      });

      const output = captureSummaryOutput(steps, results);

      expect(output).toContain("✅ Passed: lint");
      expect(output).toContain("❌ Failed: test");
      expect(output).toContain("test errors:");
      expect(output).toContain("❌ Test failed");
      expect(output).toContain("2 tests failed");
      expect(output).toContain("Error: Assertion failed");
    });

    test("Shows last 15 lines when no specific errors extracted", () => {
      const multiLineOutput = Array.from(
        { length: 20 },
        (_, i) => `line ${i + 1}`,
      ).join("\n");

      const output = createBuildTestOutput({
        status: 1,
        stdout: multiLineOutput,
      });

      expect(output).toContain("No specific errors extracted");
      expect(output).toContain("Last 15 lines of output:");
      expect(output).toContain("line 20");
      expect(output).toContain("line 6");
      expect(output).not.toContain("line 5");
      expect(output).toContain("Run with --verbose");
      expect(output).toContain("Exit code: 1");
    });

    test("Uses stderr when stdout is empty for last lines display", () => {
      const stderr = "Error line 1\nError line 2\nError line 3";

      const output = createBuildTestOutput({
        status: 1,
        stdout: "",
        stderr,
      });

      expect(output).toContain("Error line 1");
      expect(output).toContain("Error line 2");
      expect(output).toContain("Error line 3");
    });

    test("Skips steps that were not run", () => {
      const steps = createThreeSteps();
      const results = createResults({
        lint: {},
        // test was not run (missing from results)
        build: {},
      });

      const output = captureConsole(() => printSummary(steps, results));

      expect(output).toContain("✅ Passed: lint, build");
      expect(output).not.toContain("test");
    });

    test("Uses custom title when provided", () => {
      const steps = [{ name: "lint", cmd: "bun", args: ["run", "lint"] }];
      const results = createResults({
        lint: {},
      });

      const output = captureConsole(() =>
        printSummary(steps, results, "CUSTOM TITLE"),
      );

      expect(output).toContain("CUSTOM TITLE");
      expect(output).not.toContain("SUMMARY");
    });

    test("Handles mix of passed and failed steps", () => {
      const steps = createThreeSteps();
      const results = createResults({
        lint: {},
        test: {
          status: 1,
          stdout: "❌ Test failed",
        },
        build: {},
      });

      const output = captureSummaryOutput(steps, results);

      expect(output).toContain("✅ Passed: lint, build");
      expect(output).toContain("❌ Failed: test");
    });

    test("Filters out empty lines from last lines display", () => {
      const outputWithBlanks = [
        "line 1",
        "",
        "line 2",
        "",
        "",
        "line 3",
        "",
      ].join("\n");

      const output = createBuildTestOutput({
        status: 1,
        stdout: outputWithBlanks,
      });

      expect(output).toContain("line 1");
      expect(output).toContain("line 2");
      expect(output).toContain("line 3");
      // Should not have excessive blank lines in the display
      expect(output).not.toMatch(/\n\s*\n\s*\n\s*\n/);
    });

    test("Handles empty results gracefully", () => {
      const steps = createBasicSteps();
      const results = {};

      const output = captureConsole(() => printSummary(steps, results));

      expect(output).toContain("SUMMARY");
      expect(output).not.toContain("Passed");
      expect(output).not.toContain("Failed");
    });
  });

  // ============================================
  // printTruncatedList Tests
  // ============================================
  describe("printTruncatedList", () => {
    // Helper to create numbered items and capture console output
    const testTruncatedList = (count, options) => {
      const items = Array.from({ length: count }, (_, i) => `item ${i + 1}`);
      return captureConsole(() => printTruncatedList(options)(items));
    };

    test("prints all items when under maxItems", () => {
      const items = ["error 1", "error 2", "error 3"];
      const logs = captureConsole(() => printTruncatedList()(items));

      expect(logs).toEqual(["  error 1", "  error 2", "  error 3"]);
    });

    test("truncates at 10 items by default", () => {
      const logs = testTruncatedList(15);

      expect(logs.length).toBe(11); // 10 items + "more" message
      expect(logs[0]).toBe("  item 1");
      expect(logs[9]).toBe("  item 10");
      expect(logs[10]).toBe("  ... and 5 more (use --verbose to see all)");
    });

    test("respects custom maxItems", () => {
      const items = ["a", "b", "c", "d", "e"];
      const logs = captureConsole(() =>
        printTruncatedList({ maxItems: 3 })(items),
      );

      expect(logs.length).toBe(4);
      expect(logs[3]).toBe("  ... and 2 more (use --verbose to see all)");
    });

    test("respects custom prefix", () => {
      const items = ["item"];
      const logs = captureConsole(() =>
        printTruncatedList({ prefix: ">>> " })(items),
      );

      expect(logs[0]).toBe(">>> item");
    });

    test("respects custom moreLabel", () => {
      const items = Array.from({ length: 12 }, (_, i) => `err ${i}`);
      const logs = captureConsole(() =>
        printTruncatedList({ moreLabel: "errors" })(items),
      );

      expect(logs[10]).toBe("  ... and 2 errors (use --verbose to see all)");
    });

    test("respects custom suffix", () => {
      const items = Array.from({ length: 12 }, (_, i) => `item ${i}`);
      const logs = captureConsole(() =>
        printTruncatedList({ suffix: "(run with -v)" })(items),
      );

      expect(logs[10]).toBe("  ... and 2 more (run with -v)");
    });

    test("handles empty array", () => {
      const logs = captureConsole(() => printTruncatedList()([]));
      expect(logs).toEqual([]);
    });

    test("handles exactly maxItems", () => {
      const logs = testTruncatedList(10);

      expect(logs.length).toBe(10); // No "more" message
      expect(logs[9]).toBe("  item 10");
    });
  });
});
