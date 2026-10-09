import { describe, expect, test, vi } from "vitest";

const runMutationTesting = vi.fn(async () => 0);
vi.mock("#scripts/mutation/runner.js", () => ({
  runMutationTesting: (...args) => runMutationTesting(...args),
}));

const { main, parseArgs } = await import("#scripts/mutation.js");
const { captureCliFailure, mockExitThrow } = await import(
  "#test/test-utils.js"
);

describe("mutation CLI parseArgs", () => {
  test("maps two positionals to a source and a test glob", () => {
    const parsed = parseArgs(["src/a.js", "test/a.test.js"]);

    expect(parsed.sources).toEqual(["src/a.js"]);
    expect(parsed.tests).toEqual(["test/a.test.js"]);
    expect(parsed.error).toBe(null);
    expect(parsed.exhaustive).toBe(false);
  });

  test("collects repeated --source and --test flags", () => {
    const parsed = parseArgs([
      "--source",
      "src/a.js",
      "--source",
      "src/b.js",
      "--test",
      "test/a.test.js",
    ]);

    expect(parsed.sources).toEqual(["src/a.js", "src/b.js"]);
    expect(parsed.tests).toEqual(["test/a.test.js"]);
  });

  test("parses --exhaustive, --timeout, and help flags", () => {
    const parsed = parseArgs(["--exhaustive", "--timeout", "5000", "-h"]);

    expect(parsed.exhaustive).toBe(true);
    expect(parsed.timeout).toBe(5000);
    expect(parsed.help).toBe(true);
  });

  test("rejects positionals mixed with --source/--test flags", () => {
    const parsed = parseArgs(["--source", "src/a.js", "stray.js"]);

    expect(parsed.error).toContain("Unexpected positional argument(s)");
  });

  test("rejects more than two positionals as an unquoted glob", () => {
    const parsed = parseArgs(["a.js", "b.js", "c.js"]);

    expect(parsed.error).toContain("Too many positional arguments");
  });

  test("rejects a negative or non-numeric --timeout", () => {
    expect(parseArgs(["--timeout", "-5"]).error).toContain("Invalid --timeout");
    expect(parseArgs(["--timeout", "soon"]).error).toContain(
      "Invalid --timeout",
    );
  });
});

describe("mutation CLI main", () => {
  test("parses -h and --help alike", () => {
    expect(parseArgs(["-h"]).help).toBe(true);
  });

  test("prints usage and exits 0 for --help", async () => {
    const exitSpy = mockExitThrow();
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => undefined);

    await expect(main(["--help"])).rejects.toThrow("exit:0");
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining("Usage:"));
    logSpy.mockRestore();
    exitSpy.mockRestore();
  });

  test("reports a parse error and exits 1", async () => {
    const { errors, exitError } = await captureCliFailure(() =>
      main(["--timeout", "soon", "a.js", "b.js"]),
    );

    expect(exitError).toBe("exit:1");
    expect(errors.join("\n")).toContain("Invalid --timeout");
  });

  test("exits 1 when a glob matches no source files", async () => {
    const { errors, exitError } = await captureCliFailure(() =>
      main([
        "definitely-missing-*.xyz",
        "test/unit/scripts/mutation-cli.test.js",
      ]),
    );

    expect(exitError).toBe("exit:1");
    expect(errors).toContain("No source files matched.");
  });

  test("exits 1 when a glob matches no test files", async () => {
    const { errors, exitError } = await captureCliFailure(() =>
      main(["src/_lib/utils/slug-utils.js", "definitely-missing-*.xyz"]),
    );

    expect(exitError).toBe("exit:1");
    expect(errors).toContain("No test files matched.");
  });

  test("expands globs and exits with the runner's code", async () => {
    const exitSpy = mockExitThrow();

    await expect(
      main([
        "src/_lib/utils/slug-utils.js",
        "test/unit/utils/slug-utils.test.js",
      ]),
    ).rejects.toThrow("exit:0");
    expect(runMutationTesting).toHaveBeenCalledWith({
      exhaustive: false,
      sourceFiles: [expect.stringContaining("src/_lib/utils/slug-utils.js")],
      testFiles: [
        expect.stringContaining("test/unit/utils/slug-utils.test.js"),
      ],
      timeout: 10_000,
    });
    exitSpy.mockRestore();
  });
});
