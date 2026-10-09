import { describe, expect, test, vi } from "vitest";

const runToolCapture = vi.fn();
vi.mock("#scripts/lib/run-tool.js", () => ({
  runTool: vi.fn(),
  runToolCapture: (...args) => runToolCapture(...args),
}));

const {
  describeImprovements,
  describeRegressions,
  main,
  parseErrorsByFile,
  runStrictTsc,
} = await import("#scripts/strict-typecheck-ratchet.js");

const { captureCliFailure, noop } = await import("#test/test-utils.js");
const A_ERROR =
  "src/a.js(3,1): error TS7006: Parameter 'x' implicitly has an 'any' type.";

describe("runStrictTsc", () => {
  test("returns the tsc output when diagnostics were reported", () => {
    runToolCapture.mockReturnValueOnce({ status: 2, output: A_ERROR });

    expect(runStrictTsc()).toBe(A_ERROR);
  });

  test("returns the output of a clean run", () => {
    runToolCapture.mockReturnValueOnce({ status: 0, output: "" });

    expect(runStrictTsc()).toBe("");
  });

  test("throws when tsc fails without reporting diagnostics", () => {
    runToolCapture.mockReturnValueOnce({ status: 2, output: "OOM" });

    expect(() => runStrictTsc()).toThrow("without diagnostics");
  });
});

describe("describe helpers", () => {
  const errors = parseErrorsByFile(A_ERROR);

  test("regressions render the offending diagnostics", () => {
    const lines = describeRegressions(
      [{ file: "src/a.js", actual: 1, allowed: 0 }],
      errors,
    );

    expect(lines[0]).toContain("above baseline in 1 file(s)");
    expect(lines.join("\n")).toContain(A_ERROR);
  });

  test("regressions for a file with no recorded errors fail loudly", () => {
    expect(() =>
      describeRegressions(
        [{ file: "src/gone.js", actual: 1, allowed: 0 }],
        errors,
      ),
    ).toThrow("No recorded errors");
  });

  test("improvements render the ready-to-paste baseline", () => {
    const lines = describeImprovements(
      [{ file: "src/b.js", actual: 0, allowed: 3 }],
      errors,
    );

    expect(lines[0]).toContain("dropped below baseline");
    expect(lines.join("\n")).toContain('"src/a.js": 1,');
  });
});

describe("main", () => {
  test("passes and prints the summary when the baseline matches", () => {
    runToolCapture.mockReturnValueOnce({ status: 2, output: A_ERROR });
    const logSpy = vi.spyOn(console, "log").mockImplementation(noop);

    main({ "src/a.js": 1 });

    expect(logSpy).toHaveBeenCalledWith(
      expect.stringContaining(
        "Strict typecheck ratchet passed: 1 known errors",
      ),
    );
    logSpy.mockRestore();
  });

  test("exits 1 and reports when the baseline mismatches", async () => {
    runToolCapture.mockReturnValueOnce({ status: 2, output: A_ERROR });

    const { errors, exitError } = await captureCliFailure(() => main({}));

    expect(exitError).toBe("exit:1");
    expect(errors.join("\n")).toContain("above baseline");
  });
});
