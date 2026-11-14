import { describe, expect, test, vi } from "vitest";
import {
  COMMON_OPTIONS_HELP,
  logErrors,
  optionsBuilder,
  usageError,
} from "#scripts/cli-utils.js";
import { rootDir } from "#test/test-utils.js";

describe("optionsBuilder", () => {
  const values = {
    "output-dir": `${rootDir}/screenshots`,
    "base-url": "http://localhost:9999",
    timeout: "2500",
    output: "shot.png",
    viewport: "mobile",
  };

  test("merges the common options with the tool-specific ones", () => {
    const buildOptions = optionsBuilder((v) => ({ viewport: v.viewport }));

    expect(buildOptions(values)).toEqual({
      outputDir: `${rootDir}/screenshots`,
      baseUrl: "http://localhost:9999",
      timeout: 2500,
      outputPath: "shot.png",
      viewport: "mobile",
    });
  });

  test("keeps absolute output dirs unchanged and parses the timeout", () => {
    const options = optionsBuilder(() => ({}))(values);

    expect(options.outputDir).toBe(`${rootDir}/screenshots`);
    expect(options.timeout).toBe(2500);
  });
});

describe("logErrors", () => {
  test("returns false and prints nothing for an empty error list", () => {
    const errorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);

    expect(logErrors([], (e) => e.pagePath)).toBe(false);
    expect(errorSpy).not.toHaveBeenCalled();
    errorSpy.mockRestore();
  });

  test("returns true and prints each error keyed by the getter", () => {
    const errorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    const errors = [{ pagePath: "/news/", error: "timed out" }];

    expect(logErrors(errors, (e) => e.pagePath)).toBe(true);
    expect(errorSpy).toHaveBeenCalledWith("  /news/: timed out");
    errorSpy.mockRestore();
  });
});

describe("usageError", () => {
  test("prints the message and usage to stderr, then exits 1", () => {
    const errorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    const exitSpy = vi
      .spyOn(process, "exit")
      .mockImplementation(() => undefined);

    usageError("No page path provided", "usage text");

    expect(errorSpy).toHaveBeenCalledWith("Error: No page path provided");
    expect(errorSpy).toHaveBeenCalledWith("usage text");
    expect(exitSpy).toHaveBeenCalledWith(1);
    errorSpy.mockRestore();
    exitSpy.mockRestore();
  });
});

describe("COMMON_OPTIONS_HELP", () => {
  test("documents every shared option flag", () => {
    for (const flag of [
      "--help",
      "--output",
      "--base-url",
      "--timeout",
      "--serve",
      "--port",
    ]) {
      expect(COMMON_OPTIONS_HELP).toContain(flag);
    }
  });
});
