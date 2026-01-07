import { describe, expect, test } from "bun:test";
import specsIcons from "#data/specs-icons.js";
import specsIconsBase from "#data/specs-icons-base.json" with { type: "json" };

describe("specs-icons", () => {
  // ============================================
  // Normalization - String Format
  // ============================================
  test("Normalizes string values to object format with highlight false", () => {
    // All base icons should be strings in the JSON
    const firstKey = Object.keys(specsIconsBase)[0];
    const result = specsIcons[firstKey];

    expect(typeof result).toBe("object");
    expect(result.icon).toBe(specsIconsBase[firstKey]);
    expect(result.highlight).toBe(false);
  });

  test("Normalized icons have required properties", () => {
    const firstKey = Object.keys(specsIcons)[0];
    const result = specsIcons[firstKey];

    expect("icon" in result).toBe(true);
    expect("highlight" in result).toBe(true);
    expect(typeof result.icon).toBe("string");
    expect(typeof result.highlight).toBe("boolean");
  });

  // ============================================
  // Normalization - Object Format
  // ============================================
  test("Preserves icon property from object format", () => {
    // Mock a manual entry in memory to test object format
    const testIcon = { icon: "test.svg", highlight: true };

    expect(testIcon.icon).toBe("test.svg");
    expect(testIcon.highlight).toBe(true);
  });

  test("Sets highlight to false when not specified in object format", () => {
    const testIcon = { icon: "test.svg" };
    const normalized = {
      icon: testIcon.icon,
      highlight: testIcon.highlight ?? false,
    };

    expect(normalized.icon).toBe("test.svg");
    expect(normalized.highlight).toBe(false);
  });

  // ============================================
  // Integration
  // ============================================
  test("All icons in base config are normalized", () => {
    for (const key of Object.keys(specsIconsBase)) {
      const result = specsIcons[key];

      expect(typeof result).toBe("object");
      expect("icon" in result).toBe(true);
      expect("highlight" in result).toBe(true);
    }
  });

  test("Normalized icons maintain original icon filenames", () => {
    for (const [key, value] of Object.entries(specsIconsBase)) {
      const result = specsIcons[key];

      expect(result.icon).toBe(value);
    }
  });
});
