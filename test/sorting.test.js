import assert from "node:assert";
import { describe, it } from "node:test";
import { sortItems } from "#utils/sorting.js";

describe("sortItems", () => {
  it("sorts by order first", () => {
    const items = [
      { data: { order: 2, title: "A" } },
      { data: { order: 1, title: "B" } },
      { data: { order: 3, title: "C" } },
    ];
    const sorted = [...items].sort(sortItems);
    assert.deepStrictEqual(
      sorted.map((i) => i.data.title),
      ["B", "A", "C"],
      "Items should be sorted by order: 1->B, 2->A, 3->C",
    );
  });

  it("sorts by title when order is equal", () => {
    const items = [
      { data: { order: 1, title: "Zebra" } },
      { data: { order: 1, title: "Apple" } },
      { data: { order: 1, title: "Mango" } },
    ];
    const sorted = [...items].sort(sortItems);
    assert.deepStrictEqual(
      sorted.map((i) => i.data.title),
      ["Apple", "Mango", "Zebra"],
      "Items with same order should be sorted alphabetically by title",
    );
  });

  it("treats missing order as 0", () => {
    const items = [
      { data: { order: 1, title: "B" } },
      { data: { title: "A" } },
      { data: { order: -1, title: "C" } },
    ];
    const sorted = [...items].sort(sortItems);
    assert.deepStrictEqual(
      sorted.map((i) => i.data.title),
      ["C", "A", "B"],
      "Missing order should default to 0: -1->C, 0->A, 1->B",
    );
  });

  it("falls back to name if title is missing", () => {
    const items = [
      { data: { order: 1, name: "Zebra" } },
      { data: { order: 1, name: "Apple" } },
    ];
    const sorted = [...items].sort(sortItems);
    assert.deepStrictEqual(
      sorted.map((i) => i.data.name),
      ["Apple", "Zebra"],
      "Should use name for alphabetical sorting when title is missing",
    );
  });

  it("handles missing data gracefully", () => {
    const items = [{ data: { order: 1, title: "B" } }, { data: {} }, {}];
    // Should not throw
    const sorted = [...items].sort(sortItems);
    assert.strictEqual(sorted.length, 3, "Should have 3 items");
    // Items with order 0 (missing) come before order 1
    assert.strictEqual(sorted[2].data?.title, "B", "Item B should be last");
  });
});
