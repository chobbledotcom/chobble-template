import { describe, expect, test, vi } from "vitest";
import { parseCliArguments, showHelp } from "#scripts/customise-cms/cli-io.js";

describe("parseCliArguments", () => {
  test("parses flags from process.argv", () => {
    const originalArgv = [...process.argv];
    process.argv.splice(
      0,
      process.argv.length,
      process.execPath,
      "customise-cms",
      "--collections",
      "pages,news",
      "--dry-run",
    );

    const parsed = parseCliArguments();

    process.argv.splice(0, process.argv.length, ...originalArgv);
    expect(parsed.values.collections).toBe("pages,news");
    expect(parsed.values["dry-run"]).toBe(true);
  });
});

describe("showHelp", () => {
  test("prints the help text and exits with status 0", () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => undefined);
    const exitSpy = vi
      .spyOn(process, "exit")
      .mockImplementation(() => undefined);

    showHelp("usage: customise-cms");

    expect(logSpy).toHaveBeenCalledWith("usage: customise-cms");
    expect(exitSpy).toHaveBeenCalledWith(0);
    logSpy.mockRestore();
    exitSpy.mockRestore();
  });
});
