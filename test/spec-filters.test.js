import assert from "node:assert";
import { describe, it } from "node:test";
import { computeSpecs, getSpecIcon } from "#filters/spec-filters.js";

describe("getSpecIcon", () => {
  it("returns empty string for null input", () => {
    assert.strictEqual(
      getSpecIcon(null),
      "",
      "should return empty string for null",
    );
  });

  it("returns empty string for undefined input", () => {
    assert.strictEqual(
      getSpecIcon(undefined),
      "",
      "should return empty string for undefined",
    );
  });

  it("returns empty string for empty string input", () => {
    assert.strictEqual(
      getSpecIcon(""),
      "",
      "should return empty string for empty input",
    );
  });

  it("returns empty string for non-existent spec", () => {
    assert.strictEqual(
      getSpecIcon("nonexistent-spec-name"),
      "",
      "should return empty string for unknown spec",
    );
  });

  it("normalizes spec name to lowercase before lookup", () => {
    // "has dongle" is defined in specs-icons-base.json -> tick.svg
    const lowerResult = getSpecIcon("has dongle");
    const upperResult = getSpecIcon("HAS DONGLE");
    const mixedResult = getSpecIcon("Has Dongle");

    // All should return the same icon content
    assert.strictEqual(
      lowerResult,
      upperResult,
      "lowercase and uppercase should match",
    );
    assert.strictEqual(
      lowerResult,
      mixedResult,
      "lowercase and mixed case should match",
    );
    // And it should contain SVG content (tick.svg exists)
    assert.ok(lowerResult.includes("<svg") || lowerResult.includes("<SVG"));
  });

  it("trims spec name before lookup", () => {
    const normalResult = getSpecIcon("has dongle");
    const paddedResult = getSpecIcon("  has dongle  ");

    assert.strictEqual(
      normalResult,
      paddedResult,
      "trimmed and padded should match",
    );
  });

  it("returns SVG content for existing spec icon", () => {
    // "has dongle" maps to tick.svg which exists
    const result = getSpecIcon("has dongle");
    assert.ok(result.length > 0, "Should return non-empty content");
    assert.ok(
      result.includes("<svg") || result.includes("<SVG"),
      "Should contain SVG markup",
    );
  });
});

describe("computeSpecs", () => {
  it("returns undefined when data.specs is undefined", () => {
    const result = computeSpecs({});
    assert.strictEqual(
      result,
      undefined,
      "should return undefined for missing specs",
    );
  });

  it("returns undefined when data.specs is null-ish", () => {
    const result = computeSpecs({ specs: null });
    assert.strictEqual(
      result,
      undefined,
      "should return undefined for null specs",
    );
  });

  it("returns empty array when specs is empty array", () => {
    const result = computeSpecs({ specs: [] });
    assert.deepStrictEqual(
      result,
      [],
      "should return empty array for empty specs",
    );
  });

  it("adds icon property to each spec", () => {
    const data = {
      specs: [{ name: "has dongle", value: "Yes" }],
    };
    const result = computeSpecs(data);

    assert.strictEqual(result.length, 1, "should return one spec");
    assert.ok("icon" in result[0], "Should have icon property");
    assert.strictEqual(
      result[0].name,
      "has dongle",
      "should preserve spec name",
    );
    assert.strictEqual(result[0].value, "Yes", "should preserve spec value");
  });

  it("preserves all original spec properties", () => {
    const data = {
      specs: [
        {
          name: "test spec",
          value: "test value",
          customProp: "custom",
          nested: { a: 1 },
        },
      ],
    };
    const result = computeSpecs(data);

    assert.strictEqual(result[0].name, "test spec", "should preserve name");
    assert.strictEqual(result[0].value, "test value", "should preserve value");
    assert.strictEqual(
      result[0].customProp,
      "custom",
      "should preserve customProp",
    );
    assert.deepStrictEqual(
      result[0].nested,
      { a: 1 },
      "should preserve nested object",
    );
  });

  it("returns empty string icon for specs without matching icon", () => {
    const data = {
      specs: [{ name: "nonexistent-spec", value: "test" }],
    };
    const result = computeSpecs(data);

    assert.strictEqual(
      result[0].icon,
      "",
      "should return empty icon for unknown spec",
    );
  });

  it("returns SVG content for specs with matching icon", () => {
    const data = {
      specs: [{ name: "has dongle", value: "Yes" }],
    };
    const result = computeSpecs(data);

    assert.ok(result[0].icon.length > 0, "should have non-empty icon");
    assert.ok(
      result[0].icon.includes("<svg") || result[0].icon.includes("<SVG"),
      "should contain SVG markup",
    );
  });

  it("handles multiple specs with mixed icon availability", () => {
    const data = {
      specs: [
        { name: "has dongle", value: "Yes" },
        { name: "no-icon-spec", value: "test" },
        { name: "HAS DONGLE", value: "Also yes" },
      ],
    };
    const result = computeSpecs(data);

    assert.strictEqual(result.length, 3, "should return all three specs");
    // First and third should have icons (same icon due to normalization)
    assert.ok(result[0].icon.length > 0, "first spec should have icon");
    assert.strictEqual(
      result[1].icon,
      "",
      "second spec should have empty icon",
    );
    assert.ok(result[2].icon.length > 0, "third spec should have icon");
    // First and third icons should be identical
    assert.strictEqual(
      result[0].icon,
      result[2].icon,
      "normalized names should have same icon",
    );
  });
});
