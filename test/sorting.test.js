import assert from "node:assert";
import { describe, it } from "node:test";
import {
  getLatestItems,
  sortByDateDescending,
  sortItems,
} from "#utils/sorting.js";

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

describe("sortByDateDescending", () => {
  it("sorts newest dates first", () => {
    const items = [
      { date: "2024-01-01" },
      { date: "2024-06-15" },
      { date: "2024-03-10" },
    ];
    const sorted = [...items].sort(sortByDateDescending);
    assert.deepStrictEqual(
      sorted.map((i) => i.date),
      ["2024-06-15", "2024-03-10", "2024-01-01"],
      "Items should be sorted newest to oldest",
    );
  });
});

describe("getLatestItems", () => {
  it("returns limited items sorted by date descending", () => {
    const items = [
      { date: "2024-01-01", title: "Old" },
      { date: "2024-06-15", title: "Newest" },
      { date: "2024-03-10", title: "Middle" },
    ];
    const latest = getLatestItems(items, 2);
    assert.strictEqual(latest.length, 2, "Should return only 2 items");
    assert.strictEqual(
      latest[0].title,
      "Newest",
      "First item should be the newest",
    );
  });

  it("defaults to 3 items when limit not specified", () => {
    const items = [
      { date: "2024-01-01" },
      { date: "2024-02-01" },
      { date: "2024-03-01" },
      { date: "2024-04-01" },
      { date: "2024-05-01" },
    ];
    const latest = getLatestItems(items);
    assert.strictEqual(latest.length, 3, "Should default to 3 items");
  });

  it("handles null input", () => {
    const latest = getLatestItems(null);
    assert.deepStrictEqual(latest, [], "Should return empty array for null");
  });
});
