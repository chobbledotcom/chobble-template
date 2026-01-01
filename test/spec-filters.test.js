import assert from "node:assert";
import { describe, it } from "node:test";
import { computeSpecs, getSpecIcon } from "#filters/spec-filters.js";

describe("getSpecIcon", () => {
  it("returns empty string for null input", () => {
    assert.strictEqual(
      getSpecIcon(null),
      "",
      "getSpecIcon(null) should return empty string",
    );
  });

  it("returns empty string for undefined input", () => {
    assert.strictEqual(
      getSpecIcon(undefined),
      "",
      "getSpecIcon(undefined) should return empty string",
    );
  });

  it("returns empty string for empty string input", () => {
    assert.strictEqual(
      getSpecIcon(""),
      "",
      "getSpecIcon('') should return empty string",
    );
  });

  it("returns empty string for non-existent spec", () => {
    assert.strictEqual(
      getSpecIcon("nonexistent-spec-name"),
      "",
      "getSpecIcon should return empty string for unknown spec names",
    );
  });

  it("normalizes spec name to lowercase before lookup", () => {
    const lowerResult = getSpecIcon("has dongle");
    const upperResult = getSpecIcon("HAS DONGLE");
    const mixedResult = getSpecIcon("Has Dongle");

    assert.strictEqual(
      lowerResult,
      upperResult,
      "Lowercase and uppercase spec names should return same icon",
    );
    assert.strictEqual(
      lowerResult,
      mixedResult,
      "Lowercase and mixed-case spec names should return same icon",
<<<<<<< HEAD
    );
    assert.ok(
      lowerResult.includes("<svg") || lowerResult.includes("<SVG"),
      "Icon content should contain SVG markup",
    );
=======
    );
    // And it should contain SVG content (tick.svg exists)
    assert.ok(
      lowerResult.includes("<svg") || lowerResult.includes("<SVG"),
      "Icon content should contain SVG markup",
    );
>>>>>>> ca37c59 (Add assertion messages to spec-filters.test.js and remove from exceptions)
  });

  it("trims spec name before lookup", () => {
    const normalResult = getSpecIcon("has dongle");
    const paddedResult = getSpecIcon("  has dongle  ");

    assert.strictEqual(
      normalResult,
      paddedResult,
      "Padded spec name should return same icon as trimmed name",
    );
  });

  it("returns SVG content for existing spec icon", () => {
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
      "computeSpecs should return undefined when specs is missing",
    );
  });

  it("returns undefined when data.specs is null-ish", () => {
    const result = computeSpecs({ specs: null });
    assert.strictEqual(
      result,
      undefined,
      "computeSpecs should return undefined when specs is null",
    );
  });

  it("returns empty array when specs is empty array", () => {
    const result = computeSpecs({ specs: [] });
    assert.deepStrictEqual(
      result,
      [],
      "computeSpecs should return empty array for empty specs input",
    );
  });

  it("adds icon property to each spec", () => {
    const data = {
      specs: [{ name: "has dongle", value: "Yes" }],
    };
    const result = computeSpecs(data);

    assert.strictEqual(result.length, 1, "Result should contain one spec");
    assert.ok("icon" in result[0], "Should have icon property");
    assert.strictEqual(
      result[0].name,
      "has dongle",
      "Spec name should be preserved",
    );
    assert.strictEqual(
      result[0].value,
      "Yes",
      "Spec value should be preserved",
    );
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

    assert.strictEqual(
      result[0].name,
      "test spec",
      "Name property should be preserved",
    );
    assert.strictEqual(
      result[0].value,
      "test value",
      "Value property should be preserved",
    );
    assert.strictEqual(
      result[0].customProp,
      "custom",
      "Custom properties should be preserved",
    );
    assert.deepStrictEqual(
      result[0].nested,
      { a: 1 },
      "Nested objects should be preserved",
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
      "Icon should be empty string for unknown spec",
    );
  });

  it("returns SVG content for specs with matching icon", () => {
    const data = {
      specs: [{ name: "has dongle", value: "Yes" }],
    };
    const result = computeSpecs(data);

    assert.ok(
      result[0].icon.length > 0,
      "Icon should be non-empty for known spec",
    );
    assert.ok(
      result[0].icon.includes("<svg") || result[0].icon.includes("<SVG"),
      "Icon should contain SVG markup",
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

    assert.strictEqual(result.length, 3, "Should return all three specs");
<<<<<<< HEAD
=======
    // First and third should have icons (same icon due to normalization)
>>>>>>> ca37c59 (Add assertion messages to spec-filters.test.js and remove from exceptions)
    assert.ok(result[0].icon.length > 0, "First spec should have icon");
    assert.strictEqual(
      result[1].icon,
      "",
      "Second spec should have empty icon (no match)",
    );
    assert.ok(result[2].icon.length > 0, "Third spec should have icon");
<<<<<<< HEAD
=======
    // First and third icons should be identical
>>>>>>> ca37c59 (Add assertion messages to spec-filters.test.js and remove from exceptions)
    assert.strictEqual(
      result[0].icon,
      result[2].icon,
      "Case-normalized specs should have identical icons",
    );
  });
});
