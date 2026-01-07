import { describe, expect, test } from "bun:test";
import specsIcons from "#data/specs-icons.json" with { type: "json" };

describe("specs-icons", () => {
  // ============================================
  // Structure Validation
  // ============================================
  test("All spec icon values are objects", () => {
    const firstKey = Object.keys(specsIcons)[0];
    const result = specsIcons[firstKey];

    expect(typeof result).toBe("object");
  });

  test("All spec icons have icon property", () => {
    const firstKey = Object.keys(specsIcons)[0];
    const result = specsIcons[firstKey];

    expect("icon" in result).toBe(true);
    expect(typeof result.icon).toBe("string");
  });

  test("Icon property is a string filename", () => {
    for (const value of Object.values(specsIcons)) {
      expect(typeof value).toBe("object");
      expect("icon" in value).toBe(true);
      expect(typeof value.icon).toBe("string");
    }
  });

  test("Highlight property is optional and boolean when present", () => {
    for (const value of Object.values(specsIcons)) {
      if ("highlight" in value) {
        expect(typeof value.highlight).toBe("boolean");
      }
    }
  });
});
