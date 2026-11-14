/**
 * Tests for assertion helpers
 */
import { describe, test } from "vitest";
import { expectArrayProp } from "#test/test-utils/assertions.js";

describe("expectArrayProp", () => {
  test("compares extracted values in order", () => {
    const byName = expectArrayProp((item) => item.name);

    byName([{ name: "Alpha" }, { name: "Beta" }], ["Alpha", "Beta"]);
  });

  test("matches items where the extracted value is undefined", () => {
    const byMissing = expectArrayProp((item) => item.missing);

    byMissing([{ name: "present" }, {}], [undefined, undefined]);
  });
});
