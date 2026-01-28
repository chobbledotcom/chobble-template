/**
 * Tests for mock filter attribute functions
 *
 * Tests the mock filter attribute generation and the getFilterAttributes wrapper
 * used in FAST_INACCURATE_BUILDS mode.
 */
import { describe, expect, test } from "bun:test";
import {
  generateMockFilterAttributes,
  getFilterAttributes,
} from "#utils/mock-filter-attributes.js";

/**
 * Assert that result has correct mock attribute structure
 * @param {Array<{name: string, value: string}>} result
 */
const assertValidMockAttributes = (result) => {
  expect(result).toHaveLength(2);
  expect(result[0].name).toBe("Foo Attribute");
  expect(result[1].name).toBe("Bar Attribute");
  expect(["foo", "bar"]).toContain(result[0].value);
  expect(["foo", "bar"]).toContain(result[1].value);
};

describe("generateMockFilterAttributes", () => {
  test("Returns valid mock attributes for standard path", () => {
    assertValidMockAttributes(
      generateMockFilterAttributes("/products/test.md"),
    );
  });

  test("Returns consistent values for same inputPath", () => {
    const result1 = generateMockFilterAttributes("/products/test.md");
    const result2 = generateMockFilterAttributes("/products/test.md");
    expect(result1[0].value).toBe(result2[0].value);
    expect(result1[1].value).toBe(result2[1].value);
  });

  test("Hash produces variety across different paths", () => {
    const paths = ["/a.md", "/b.md", "/c.md", "/d.md", "/e.md", "/f.md"];
    const results = paths.map((p) => generateMockFilterAttributes(p));
    // Verify hash distribution produces both foo and bar across paths
    const allValues = results.flatMap((r) => [r[0].value, r[1].value]);
    expect(allValues).toContain("foo");
    expect(allValues).toContain("bar");
  });

  test.each([
    ["empty string", ""],
    ["undefined", undefined],
  ])("Handles %s inputPath gracefully", (_label, input) => {
    assertValidMockAttributes(generateMockFilterAttributes(input));
  });
});

describe("getFilterAttributes", () => {
  test("Returns undefined when filterAttributes is undefined", () => {
    expect(getFilterAttributes(undefined, "/products/test.md")).toBeUndefined();
  });

  test("Returns null when filterAttributes is null", () => {
    expect(getFilterAttributes(null, "/products/test.md")).toBeNull();
  });

  test("Returns original attributes when FAST_INACCURATE_BUILDS is off", () => {
    // FAST_INACCURATE_BUILDS is false during normal test runs
    const original = [{ name: "Real", value: "Value" }];
    const result = getFilterAttributes(original, "/products/test.md");
    expect(result).toBe(original);
  });
});
