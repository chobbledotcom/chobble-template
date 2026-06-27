import { describe, expect, test } from "bun:test";
import { extractSlowTests, extractTestTotal } from "#test/precommit/output.js";

describe("precommit output helpers", () => {
  test("extractTestTotal reads bun test summary totals", () => {
    expect(
      extractTestTotal("Ran 4200 tests across 200 files. [45000.00ms]"),
    ).toBe(4200);
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
