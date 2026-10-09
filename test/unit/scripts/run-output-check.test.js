/**
 * The shared body of `check:links` and `check:a11y`: where the check looks
 * when the command line says nothing, and that the check's verdict becomes the
 * process's exit code rather than being swallowed.
 */
import path from "node:path";
import { afterEach, describe, expect, test, vi } from "vitest";
import { runOutputCheck } from "#scripts/lib/run-output-check.js";
import { mockExitThrow } from "#test/test-utils.js";

/** Run a check, capturing the exit code it asked for and the directory it got. */
const run = async (status, argv) => {
  const exitSpy = mockExitThrow();
  const check = vi.fn().mockResolvedValue(status);
  const [outcome] = await Promise.allSettled([runOutputCheck(check, argv)]);
  exitSpy.mockRestore();
  return {
    exitedWith: outcome.status === "rejected" ? outcome.reason.message : null,
    checkedDir: check.mock.calls[0][0],
  };
};

afterEach(() => {
  vi.restoreAllMocks();
});

describe("runOutputCheck", () => {
  test("checks the directory named on the command line", async () => {
    const { checkedDir } = await run(0, ["build/output"]);
    expect(checkedDir).toBe(path.resolve("build/output"));
  });

  test("checks the build's own output directory when none is named", async () => {
    const { checkedDir } = await run(0, []);
    expect(checkedDir).toBe(path.resolve("_site"));
  });

  test("exits 0 when the check passes", async () => {
    expect((await run(0, [])).exitedWith).toBe("exit:0");
  });

  test("exits non-zero when the check fails, so a pipeline stops", async () => {
    expect((await run(1, [])).exitedWith).toBe("exit:1");
  });
});
