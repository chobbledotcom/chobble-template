import { describe, expect, test, vi } from "vitest";
import { green, write } from "#scripts/lib/colors.js";
import {
  createDotsProgress,
  extractSlowTests,
  extractTestTotal,
} from "#test/precommit/output.js";

describe("precommit colour helpers", () => {
  test("write sends raw text to stdout", () => {
    const writeSpy = vi
      .spyOn(process.stdout, "write")
      .mockImplementation(() => true);

    write(green("ok"));

    expect(writeSpy).toHaveBeenCalledWith("\x1b[32mok\x1b[0m");
    writeSpy.mockRestore();
  });
});

describe("precommit output helpers", () => {
  test("createDotsProgress ignores non-dot chunks until dots pass", () => {
    const progress = createDotsProgress();

    expect(progress(" RUN  v3.2.7 /repo")).toBeUndefined();
    expect(progress("test/unit/example.test.js")).toBeUndefined();
    expect(progress("\u00b7\n\u00b7")).toBe("(2 passed)");
    expect(progress("failure in test/unit/example.test.js")).toBe("(2 passed)");
  });

  test("createDotsProgress includes total when provided", () => {
    const progress = createDotsProgress(4);

    expect(progress("\u00b7\u00b7")).toBe("(2/4 passed)");
  });

  test("extractTestTotal reads the vitest summary total", () => {
    expect(
      extractTestTotal("      Tests  4198 passed | 2 skipped (4200)"),
    ).toBe(4200);
  });

  test("extractTestTotal ignores missing and zero totals", () => {
    expect(extractTestTotal("suite crashed")).toBeUndefined();
    expect(extractTestTotal("      Tests  0 passed (0)")).toBeUndefined();
  });

  test("extractSlowTests returns tests over the threshold", () => {
    const junit = `<?xml version="1.0" encoding="UTF-8"?>
<testsuites>
  <testsuite name="test/unit/example.test.js">
    <testsuite name="slow group">
      <testcase name="fast test" classname="slow group" time="0.500" file="test/unit/example.test.js" line="10" />
      <testcase name="slow &amp; escaped" classname="slow group" time="0.501" file="test/unit/example.test.js" line="11" />
      <testcase name="slowest test" classname="slow group" time="1.250" file="test/unit/example.test.js" line="12" />
    </testsuite>
  </testsuite>
</testsuites>`;

    expect(extractSlowTests(junit, 500)).toEqual([
      {
        name: "slow group > slowest test",
        file: "test/unit/example.test.js",
        line: 12,
        durationMs: 1250,
      },
      {
        name: "slow group > slow & escaped",
        file: "test/unit/example.test.js",
        line: 11,
        durationMs: 501,
      },
    ]);
  });
});
