import assert from "node:assert";
import { describe, it } from "node:test";
import { computeSpecs, getSpecIcon } from "#filters/spec-filters.js";

describe("getSpecIcon", () => {
  it("returns empty string for null input", () => {
    assert.strictEqual(getSpecIcon(null), "");
  });

  it("returns empty string for undefined input", () => {
    assert.strictEqual(getSpecIcon(undefined), "");
  });

  it("returns empty string for empty string input", () => {
    assert.strictEqual(getSpecIcon(""), "");
  });

  it("returns empty string for non-existent spec", () => {
    assert.strictEqual(getSpecIcon("nonexistent-spec-name"), "");
  });

  it("normalizes spec name to lowercase before lookup", () => {
    // "has dongle" is defined in specs-icons-base.json -> tick.svg
    const lowerResult = getSpecIcon("has dongle");
    const upperResult = getSpecIcon("HAS DONGLE");
    const mixedResult = getSpecIcon("Has Dongle");

    // All should return the same icon content
    assert.strictEqual(lowerResult, upperResult);
    assert.strictEqual(lowerResult, mixedResult);
    // And it should contain SVG content (tick.svg exists)
    assert.ok(lowerResult.includes("<svg") || lowerResult.includes("<SVG"));
  });

  it("trims spec name before lookup", () => {
    const normalResult = getSpecIcon("has dongle");
    const paddedResult = getSpecIcon("  has dongle  ");

    assert.strictEqual(normalResult, paddedResult);
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
    assert.strictEqual(result, undefined);
  });

  it("returns undefined when data.specs is null-ish", () => {
    const result = computeSpecs({ specs: null });
    assert.strictEqual(result, undefined);
  });

  it("returns empty array when specs is empty array", () => {
    const result = computeSpecs({ specs: [] });
    assert.deepStrictEqual(result, []);
  });

  it("adds icon property to each spec", () => {
    const data = {
      specs: [{ name: "has dongle", value: "Yes" }],
    };
    const result = computeSpecs(data);

    assert.strictEqual(result.length, 1);
    assert.ok("icon" in result[0], "Should have icon property");
    assert.strictEqual(result[0].name, "has dongle");
    assert.strictEqual(result[0].value, "Yes");
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

    assert.strictEqual(result[0].name, "test spec");
    assert.strictEqual(result[0].value, "test value");
    assert.strictEqual(result[0].customProp, "custom");
    assert.deepStrictEqual(result[0].nested, { a: 1 });
  });

  it("returns empty string icon for specs without matching icon", () => {
    const data = {
      specs: [{ name: "nonexistent-spec", value: "test" }],
    };
    const result = computeSpecs(data);

    assert.strictEqual(result[0].icon, "");
  });

  it("returns SVG content for specs with matching icon", () => {
    const data = {
      specs: [{ name: "has dongle", value: "Yes" }],
    };
    const result = computeSpecs(data);

    assert.ok(result[0].icon.length > 0);
    assert.ok(
      result[0].icon.includes("<svg") || result[0].icon.includes("<SVG"),
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

    assert.strictEqual(result.length, 3);
    // First and third should have icons (same icon due to normalization)
    assert.ok(result[0].icon.length > 0);
    assert.strictEqual(result[1].icon, "");
    assert.ok(result[2].icon.length > 0);
    // First and third icons should be identical
    assert.strictEqual(result[0].icon, result[2].icon);
  });
});
