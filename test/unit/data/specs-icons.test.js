import { describe, expect, test } from "bun:test";
import specsIcons from "#data/specs-icons.json" with { type: "json" };

describe("specs-icons", () => {
  test("All entries are objects with a string icon property", () => {
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
