import assert from "node:assert";
import { describe, it } from "node:test";
import { sortByOrderThenTitle } from "#utils/sorting.js";

describe("sortByOrderThenTitle", () => {
  it("sorts by order first", () => {
    const items = [
      { data: { order: 2, title: "A" } },
      { data: { order: 1, title: "B" } },
      { data: { order: 3, title: "C" } },
    ];
    const sorted = [...items].sort(sortByOrderThenTitle);
    assert.deepStrictEqual(
      sorted.map((i) => i.data.title),
      ["B", "A", "C"],
    );
  });

  it("sorts by title when order is equal", () => {
    const items = [
      { data: { order: 1, title: "Zebra" } },
      { data: { order: 1, title: "Apple" } },
      { data: { order: 1, title: "Mango" } },
    ];
    const sorted = [...items].sort(sortByOrderThenTitle);
    assert.deepStrictEqual(
      sorted.map((i) => i.data.title),
      ["Apple", "Mango", "Zebra"],
    );
  });

  it("treats missing order as 0", () => {
    const items = [
      { data: { order: 1, title: "B" } },
      { data: { title: "A" } },
      { data: { order: -1, title: "C" } },
    ];
    const sorted = [...items].sort(sortByOrderThenTitle);
    assert.deepStrictEqual(
      sorted.map((i) => i.data.title),
      ["C", "A", "B"],
    );
  });

  it("falls back to name if title is missing", () => {
    const items = [
      { data: { order: 1, name: "Zebra" } },
      { data: { order: 1, name: "Apple" } },
    ];
    const sorted = [...items].sort(sortByOrderThenTitle);
    assert.deepStrictEqual(
      sorted.map((i) => i.data.name),
      ["Apple", "Zebra"],
    );
  });

  it("handles missing data gracefully", () => {
    const items = [{ data: { order: 1, title: "B" } }, { data: {} }, {}];
    // Should not throw
    const sorted = [...items].sort(sortByOrderThenTitle);
    assert.strictEqual(sorted.length, 3);
    // Items with order 0 (missing) come before order 1
    assert.strictEqual(sorted[2].data?.title, "B");
  });
});
