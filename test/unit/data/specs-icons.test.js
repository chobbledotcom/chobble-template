import { describe, expect, test } from "bun:test";
import specsIcons from "#data/specs-icons.js";
import specsIconsBase from "#data/specs-icons-base.json" with { type: "json" };

describe("specs-icons", () => {
  // ============================================
  // Structure Validation
  // ============================================
  test("All spec icon values are objects", () => {
    const firstKey = Object.keys(specsIconsBase)[0];
    const result = specsIcons[firstKey];

    expect(typeof result).toBe("object");
  });

  test("All spec icons have icon property", () => {
    const firstKey = Object.keys(specsIcons)[0];
    const result = specsIcons[firstKey];

    expect("icon" in result).toBe(true);
    expect(typeof result.icon).toBe("string");
  });

  test("Base config uses object format with icon property", () => {
    const firstKey = Object.keys(specsIconsBase)[0];
    const baseValue = specsIconsBase[firstKey];

    expect(typeof baseValue).toBe("object");
    expect("icon" in baseValue).toBe(true);
    expect(typeof baseValue.icon).toBe("string");
  });

  // ============================================
  // Merging
  // ============================================
  test("Merges base and user icons", () => {
    for (const key of Object.keys(specsIconsBase)) {
      expect(key in specsIcons).toBe(true);
    }
  });

  test("Preserves icon filenames from base config", () => {
    for (const [key, value] of Object.entries(specsIconsBase)) {
      const result = specsIcons[key];

      expect(result.icon).toBe(value.icon);
    }
  });
});
