import { pathToFileURL } from "node:url";
import { describe, expect, test } from "vitest";
import { isMainModule } from "#scripts/lib/is-main-module.js";
import { runTool, runToolCapture } from "#scripts/lib/run-tool.js";

describe("runTool", () => {
  test("returns the tool's real exit code", () => {
    expect(runTool(process.execPath, ["-e", "process.exit(3)"])).toBe(3);
  });

  test("throws when the binary cannot be spawned", () => {
    expect(() => runTool("definitely-not-a-real-binary", [])).toThrow(
      "Failed to run definitely-not-a-real-binary",
    );
  });
});

describe("runToolCapture", () => {
  test("captures combined stdout and stderr alongside the exit code", () => {
    const { status, output } = runToolCapture(process.execPath, [
      "-e",
      "console.log('to-stdout'); console.error('to-stderr'); process.exit(2)",
    ]);

    expect(status).toBe(2);
    expect(output).toContain("to-stdout");
    expect(output).toContain("to-stderr");
  });

  test("throws when the binary cannot be spawned", () => {
    expect(() => runToolCapture("definitely-not-a-real-binary", [])).toThrow(
      "Failed to run definitely-not-a-real-binary",
    );
  });
});

describe("isMainModule", () => {
  test("is false for a module imported by another entry point", () => {
    expect(isMainModule(import.meta.url)).toBe(false);
  });

  test("is true for the URL of the process entry script", () => {
    expect(isMainModule(pathToFileURL(process.argv[1]).href)).toBe(true);
  });
});

describe("signal handling", () => {
  test("throws when the tool dies to a signal", () => {
    expect(() =>
      runTool(process.execPath, ["-e", "process.kill(process.pid, 'SIGKILL')"]),
    ).toThrow("terminated by signal SIGKILL");
  });
});
