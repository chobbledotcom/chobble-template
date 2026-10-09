import { describe, expect, test } from "vitest";
import { buildReverseIndex } from "#utils/fp/grouping.js";

describe("grouping", () => {
  describe("buildReverseIndex", () => {
    test("Builds index from items with multiple keys each", () => {
      const products = [
        { name: "Widget", categories: ["tools", "hardware"] },
        { name: "Gadget", categories: ["tools", "electronics"] },
        { name: "Gizmo", categories: ["electronics"] },
      ];

      const index = buildReverseIndex(products, (p) => p.categories);

      expect(index.get("tools").length).toBe(2);
      expect(index.get("electronics").length).toBe(2);
      expect(index.get("hardware").length).toBe(1);
    });

    test("Handles items that return empty key arrays", () => {
      const items = [
        { name: "A", tags: ["x"] },
        { name: "B", tags: [] },
        { name: "C", tags: ["x", "y"] },
      ];

      const index = buildReverseIndex(items, (i) => i.tags);

      expect(index.get("x").length).toBe(2);
      expect(index.get("y").length).toBe(1);
      expect(index.has("B")).toBe(false);
    });

    test("Returns empty Map for empty items array", () => {
      const index = buildReverseIndex([], (i) => i.keys || []);

      expect(index.size).toBe(0);
    });

    test("Index entries reference original item objects", () => {
      const items = [
        { id: 1, keys: ["a"] },
        { id: 2, keys: ["a"] },
      ];

      const index = buildReverseIndex(items, (i) => i.keys);

      expect(index.get("a")[0]).toBe(items[0]);
      expect(index.get("a")[1]).toBe(items[1]);
    });
  });
});
