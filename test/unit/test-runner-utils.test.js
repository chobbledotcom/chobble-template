import fs from "node:fs";
import path from "node:path";
import { describe, expect, test, vi } from "vitest";
import {
  checkMetric,
  checkRecord,
  extractErrorsFromOutput,
  extractUncoveredBranchLines,
  extractUncoveredLines,
  formatUncovered,
  getNonCodeQualityTestFiles,
  parseLcov,
  printSummary,
  printTruncatedList,
  reportCoverageFailures,
  runLanes,
  runStepAsync,
  unitTestsStep,
} from "#test/test-runner-utils.js";
import {
  bracketAsync,
  captureConsole,
  captureConsoleLogAsync,
  withMockedProcessExit,
  withTempDir,
} from "#test/test-utils.js";
import { mapObject } from "#utils/fp/object.js";

// ============================================
// Test Helpers
// ============================================

/**
 * Creates a standard set of test steps (lint and test)
 */
const createBasicSteps = () => [
  { name: "lint", cmd: "npm", args: ["run", "lint"] },
  { name: "test", cmd: "npm", args: ["test"] },
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
  ...createBasicSteps(),
  { name: "build", cmd: "npm", args: ["run", "build"] },
];

/**
 * Creates a step that runs an inline node script
 */
const createNodeScriptStep = (name, script) => ({
  name,
  cmd: process.execPath,
  args: ["-e", script],
});

/**
 * Helper to create a single build step, results, and capture output
 */
const createBuildTestOutput = (buildConfig) => {
  const steps = [{ name: "build", cmd: "npm", args: ["run", "build"] }];
  const results = createResults({ build: buildConfig });
  return captureSummaryOutput(steps, results);
};

describe("test-runner-utils", () => {
  // ============================================
  // extractErrorsFromOutput Tests
  // ============================================
  describe("extractErrorsFromOutput", () => {
    test.each([
      "   ",
      "  jscpd found duplicated code.  ",
      "  Do not use duplicated code  ",
    ])("ends clone blocks before %j", (terminator) => {
      const output = [
        "normal output",
        "  ❌ Clone found  ",
        "    src/first.js: 1-5  ",
        "    src/second.js: 2-6  ",
        terminator,
        "Error: separate failure",
      ].join("\n");

      expect(extractErrorsFromOutput(output)).toEqual([
        "  ❌ Clone found\n    src/first.js: 1-5\n    src/second.js: 2-6",
        "Error: separate failure",
      ]);
    });

    test("keeps an unterminated clone block through the end of output", () => {
      expect(
        extractErrorsFromOutput(
          "❌ Clone found\n  src/first.js: 1-5\n  src/second.js: 2-6",
        ),
      ).toEqual(["❌ Clone found\n  src/first.js: 1-5\n  src/second.js: 2-6"]);
    });

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
      const steps = [{ name: "lint", cmd: "npm", args: ["run", "lint"] }];
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
      const emptyRunSteps = createBasicSteps();

      const output = captureConsole(() => printSummary(emptyRunSteps, {}));

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

  // ============================================
  // lcov parsing Tests
  // ============================================
  describe("lcov parsing", () => {
    describe("extractUncoveredLines", () => {
      test("collects line numbers from DA:N,0 entries", () => {
        const record = ["DA:3,0", "DA:4,2", "DA:10,0", "DA:11,1"].join("\n");

        expect(extractUncoveredLines(record)).toEqual([3, 10]);
      });

      test("ignores DA entries with non-zero hit counts", () => {
        const record = ["DA:1,5", "DA:2,3", "DA:3,1"].join("\n");

        expect(extractUncoveredLines(record)).toEqual([]);
      });

      test("returns empty array when record has no DA lines", () => {
        const record = "SF:src/foo.js\nLH:0\nLF:0";

        expect(extractUncoveredLines(record)).toEqual([]);
      });
    });

    describe("extractUncoveredBranchLines", () => {
      test("collects lines from BRDA entries with zero and dash hits", () => {
        const record = ["BRDA:5,0,0,0", "BRDA:7,0,0,-", "BRDA:9,0,0,2"].join(
          "\n",
        );

        expect(extractUncoveredBranchLines(record)).toEqual([5, 7]);
      });

      test("dedupes multiple uncovered branches on the same line", () => {
        const record = ["BRDA:12,0,0,0", "BRDA:12,0,1,0", "BRDA:12,0,2,-"].join(
          "\n",
        );

        expect(extractUncoveredBranchLines(record)).toEqual([12]);
      });

      test("ignores BRDA entries with positive hit counts", () => {
        const record = ["BRDA:3,0,0,4", "BRDA:3,0,1,1"].join("\n");

        expect(extractUncoveredBranchLines(record)).toEqual([]);
      });
    });

    describe("formatUncovered", () => {
      test("returns empty string for empty list", () => {
        expect(formatUncovered("lines", [])).toBe("");
      });

      test("formats non-empty list as indented suffix", () => {
        expect(formatUncovered("lines", [3, 7, 12])).toBe(
          "\n      uncovered lines: 3, 7, 12",
        );
      });
    });

    describe("checkMetric", () => {
      test("returns undefined when hit equals found", () => {
        const record = "LH:10\nLF:10";

        expect(
          checkMetric(record, "LH", "LF", "src/foo.js", "lines", ""),
        ).toBeUndefined();
      });

      test("returns formatted failure string when hit is less than found", () => {
        const record = "LH:8\nLF:10";
        const suffix = "\n      uncovered lines: 3, 7";

        expect(
          checkMetric(record, "LH", "LF", "src/foo.js", "lines", suffix),
        ).toBe(`src/foo.js: 8/10 lines covered${suffix}`);
      });

      test("returns undefined when metric keys are absent from record", () => {
        const record = "SF:src/foo.js";

        expect(
          checkMetric(record, "LH", "LF", "src/foo.js", "lines", ""),
        ).toBeUndefined();
      });
    });

    describe("checkRecord", () => {
      test("collects line and branch failures for partially covered record", () => {
        const record = [
          "SF:src/foo.js",
          "DA:3,0",
          "DA:4,1",
          "BRDA:5,0,0,0",
          "BRDA:5,0,1,2",
          "LH:1",
          "LF:2",
          "BRH:1",
          "BRF:2",
        ].join("\n");

        const { lineFailures, branchFailures } = checkRecord(
          record,
          "src/foo.js",
        );

        expect(lineFailures).toEqual([
          "src/foo.js: 1/2 lines covered\n      uncovered lines: 3",
        ]);
        expect(branchFailures).toEqual([
          "src/foo.js: 1/2 branches covered\n      uncovered branches: 5",
        ]);
      });

      test("collects nothing when record is fully covered", () => {
        const record = [
          "SF:src/bar.js",
          "DA:1,3",
          "DA:2,1",
          "LH:2",
          "LF:2",
          "BRH:2",
          "BRF:2",
        ].join("\n");

        const { lineFailures, branchFailures } = checkRecord(
          record,
          "src/bar.js",
        );

        expect(lineFailures).toEqual([]);
        expect(branchFailures).toEqual([]);
      });
    });

    describe("parseLcov", () => {
      const makeRecord = (file, lh, lf) =>
        [`SF:${file}`, `LH:${lh}`, `LF:${lf}`, "end_of_record"].join("\n");

      test("parses multiple records and collects per-file failures", () => {
        const lcov = [
          makeRecord("src/a.js", 1, 2),
          makeRecord("src/b.js", 3, 3),
          makeRecord("src/c.js", 0, 5),
        ].join("\n");

        const { lineFailures, branchFailures } = parseLcov(lcov, []);

        expect(lineFailures).toEqual([
          "src/a.js: 1/2 lines covered",
          "src/c.js: 0/5 lines covered",
        ]);
        expect(branchFailures).toEqual([]);
      });

      test("skips records whose path matches the exclude list", () => {
        const lcov = [
          makeRecord("src/keep.js", 1, 2),
          makeRecord("src/skip.js", 0, 4),
        ].join("\n");

        const { lineFailures } = parseLcov(lcov, ["src/skip.js"]);

        expect(lineFailures).toEqual(["src/keep.js: 1/2 lines covered"]);
      });

      test("returns empty arrays when every record is fully covered", () => {
        const lcov = [
          makeRecord("src/a.js", 5, 5),
          makeRecord("src/b.js", 2, 2),
        ].join("\n");

        const result = parseLcov(lcov, []);

        expect(result.lineFailures).toEqual([]);
        expect(result.branchFailures).toEqual([]);
      });
    });

    describe("reportCoverageFailures", () => {
      const writeLcovFixture = (tempDir, lcovLines) => {
        const lcovPath = path.join(tempDir, "lcov.info");
        fs.writeFileSync(lcovPath, [...lcovLines, ""].join("\n"));
        return lcovPath;
      };

      test("prints per-file gaps and returns true when lcov has failures", () =>
        withTempDir("coverage-gaps", (tempDir) => {
          const lcovPath = writeLcovFixture(tempDir, [
            "SF:src/a.js",
            "DA:1,0",
            "LH:0",
            "LF:1",
            "end_of_record",
          ]);

          const logs = captureConsole(() => {
            const returned = reportCoverageFailures(lcovPath);
            expect(returned).toBe(true);
          });

          expect(logs.some((l) => l.includes("Per-file coverage gaps"))).toBe(
            true,
          );
          expect(
            logs.some((l) => l.includes("src/a.js: 0/1 lines covered")),
          ).toBe(true);
        }));

      test("returns false when lcov file does not exist", () => {
        expect(reportCoverageFailures("/nonexistent/lcov.info")).toBe(false);
      });

      test("returns false when every record in lcov is fully covered", () =>
        withTempDir("coverage-clean", (tempDir) => {
          const lcovPath = writeLcovFixture(tempDir, [
            "SF:src/a.js",
            "LH:1",
            "LF:1",
            "end_of_record",
          ]);

          const returned = reportCoverageFailures(lcovPath);

          expect(returned).toBe(false);
        }));
    });
  });
});

describe("step definitions", () => {
  test("unitTestsStep adds the verbose reporter only when asked", () => {
    expect(unitTestsStep(true).args).toContain("--reporter=verbose");
    expect(unitTestsStep(false).args).not.toContain("--reporter=verbose");
  });

  test("getNonCodeQualityTestFiles excludes the code-quality suite", () => {
    const files = getNonCodeQualityTestFiles("test/unit/**/*.test.js");

    expect(files.length).toBeGreaterThan(0);
    expect(files.some((f) => f.includes("code-quality"))).toBe(false);
  });
});

describe("runStepAsync", () => {
  // Real child processes can take longer than the default test timeout.
  test.each([
    [false, "process.exit(0)", "", ""],
    [true, "process.exit(0)", "", ""],
    [
      false,
      "process.stdout.write('out'); process.stderr.write('err')",
      "out",
      "err",
    ],
  ])(
    "does not forward output with verbose=%s for %s",
    async (verbose, script, stdout, stderr) => {
      await bracketAsync(
        () => [
          vi.spyOn(process.stdout, "write").mockImplementation(() => true),
          vi.spyOn(process.stderr, "write").mockImplementation(() => true),
        ],
        (spies) => {
          for (const spy of spies) spy.mockRestore();
        },
      )(null, async ([stdoutSpy, stderrSpy]) => {
        const result = await runStepAsync(
          createNodeScriptStep("silent-step", script),
          verbose,
        );
        expect(result).toEqual({ status: 0, stdout, stderr });
        expect(stdoutSpy).not.toHaveBeenCalled();
        expect(stderrSpy).not.toHaveBeenCalled();
      });
    },
    30_000,
  );

  test("captures output and exit status", async () => {
    const step = createNodeScriptStep(
      "async-step",
      "console.log('out'); console.error('err')",
    );

    const result = await runStepAsync(step, false);

    expect(result.status).toBe(0);
    expect(result.stdout).toContain("out");
    expect(result.stderr).toContain("err");
  }, 30_000);

  test("passes output through in verbose mode and reports the exit status", async () => {
    const stdoutSpy = vi
      .spyOn(process.stdout, "write")
      .mockImplementation(() => true);
    const stderrSpy = vi
      .spyOn(process.stderr, "write")
      .mockImplementation(() => true);
    const step = createNodeScriptStep(
      "fail-step",
      "console.log('vout'); console.error('verr'); process.exit(3)",
    );

    const result = await runStepAsync(step, true);

    expect(result.status).toBe(3);
    expect(stdoutSpy).toHaveBeenCalledWith(expect.stringContaining("vout"));
    expect(stderrSpy).toHaveBeenCalledWith(expect.stringContaining("verr"));
    stdoutSpy.mockRestore();
    stderrSpy.mockRestore();
  }, 30_000);
});

describe("runLanes", () => {
  test("runs lanes in parallel and stops a lane at its first failure", async () => {
    const ok = createNodeScriptStep("lane-ok", "console.log('fine')");
    const fail = createNodeScriptStep("lane-fail", "process.exit(1)");
    const never = createNodeScriptStep(
      "lane-never",
      "console.log('unreachable')",
    );
    const exitSpy = vi
      .spyOn(process, "exit")
      .mockImplementation(() => undefined);

    const output = await captureConsoleLogAsync(async () => {
      const results = await runLanes({
        lanes: [[ok], [fail, never]],
        verbose: false,
        title: "RUNLANES TEST",
      });

      expect(results["lane-ok"].status).toBe(0);
      expect(results["lane-fail"].status).toBe(1);
      expect(results["lane-never"]).toBeUndefined();
    });

    expect(output.join("\n")).toContain("RUNLANES TEST");
    exitSpy.mockRestore();
  }, 30_000);
});

describe("coverage failure diagnostics", () => {
  test("printSummary points coverage failures at the ignore list", () => {
    const steps = [{ name: "tests:unit", cmd: "npx", args: [] }];
    const results = {
      "tests:unit": {
        status: 1,
        stdout: [
          "120 pass",
          "0 fail",
          "File | % Funcs | % Lines | Uncovered Lines",
        ].join("\n"),
        stderr: "",
      },
    };

    const output = captureSummaryOutput(steps, results, "COVERAGE SUMMARY");

    expect(output).toContain(
      "Excluded files are listed in test/coverage-ignore.js.",
    );
  });

  test("extractErrorsFromOutput keeps coverage table rows with uncovered lines", () => {
    const output = [
      "src/foo.js | 90.00 | 85.00 | 12,14",
      "src/bar.js | 100.00 | 100.00 | ",
    ].join("\n");

    const errors = extractErrorsFromOutput(output);

    expect(errors).toContain("src/foo.js | 90.00 | 85.00 | 12,14");
    expect(errors.some((e) => e.includes("src/bar.js"))).toBe(false);
  });
});
