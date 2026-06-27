import { describe, expect, test } from "bun:test";
import {
  createDotsProgress,
  extractSlowTests,
  extractTestTotal,
} from "#test/precommit/output.js";

describe("precommit output helpers", () => {
  test("createDotsProgress ignores non-dot chunks until dots pass", () => {
    const progress = createDotsProgress();

    expect(progress("bun test v1.3.13")).toBeUndefined();
    expect(progress("test/unit/example.test.js")).toBeUndefined();
    expect(progress(".\n.")).toBe("(2 passed)");
    expect(progress("failure in test/unit/example.test.js")).toBe("(2 passed)");
  });

  test("createDotsProgress includes total when provided", () => {
    const progress = createDotsProgress(4);

    expect(progress("..")).toBe("(2/4 passed)");
  });

  test("extractTestTotal reads bun test summary totals", () => {
    expect(
      extractTestTotal("Ran 4200 tests across 200 files. [45000.00ms]"),
    ).toBe(4200);
  });

  test("extractTestTotal ignores missing and zero totals", () => {
    expect(extractTestTotal("suite crashed")).toBeUndefined();
    expect(
      extractTestTotal("Ran 0 tests across 0 files. [1.00ms]"),
    ).toBeUndefined();
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
