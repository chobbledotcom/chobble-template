import { describe, expect, test } from "bun:test";
import { sortByDateDescending, sortItems } from "#utils/sorting.js";

describe("sorting", () => {
  // Helper to test sorting results by title field
  const testSortByTitle = (items, expectedTitles) => {
    const sorted = [...items].sort(sortItems);
    expect(sorted.map((i) => i.data.title)).toEqual(expectedTitles);
  };

  // ============================================
  // sortItems Tests
  // ============================================
  test("Items with different order values sort by order, ignoring title", () => {
    const items = [
      { data: { order: 2, title: "A" } },
      { data: { order: 1, title: "B" } },
      { data: { order: 3, title: "C" } },
    ];
    testSortByTitle(items, ["B", "A", "C"]);
  });

  test("Items with identical order values fall back to alphabetical title sorting", () => {
    const items = [
      { data: { order: 1, title: "Zebra" } },
      { data: { order: 1, title: "Apple" } },
      { data: { order: 1, title: "Mango" } },
    ];
    testSortByTitle(items, ["Apple", "Mango", "Zebra"]);
  });

  test("Items without an order field are treated as having order 0", () => {
    const items = [
      { data: { order: 1, title: "B" } },
      { data: { title: "A" } },
      { data: { order: -1, title: "C" } },
    ];
    testSortByTitle(items, ["C", "A", "B"]);
  });

  test("Uses name field for alphabetical sorting when title is absent", () => {
    const items = [
      { data: { order: 1, name: "Zebra" } },
      { data: { order: 1, name: "Apple" } },
    ];
    const sorted = [...items].sort(sortItems);
    expect(sorted.map((i) => i.data.name)).toEqual(["Apple", "Zebra"]);
  });

  test("Items with empty data objects are treated as order 0", () => {
    const items = [
      { data: { order: 1, title: "B" } },
      { data: {} },
      { data: { title: "A" } },
    ];
    const sorted = [...items].sort(sortItems);
    // Items with no order/title should come first (order 0, empty string fallback)
    expect(sorted[0].data).toEqual({});
  });

  // ============================================
  // sortByDateDescending Tests
  // ============================================
  test("Items are sorted with most recent dates appearing first", () => {
    const items = [
      { date: "2024-01-01" },
      { date: "2024-06-15" },
      { date: "2024-03-10" },
    ];
    const sorted = [...items].sort(sortByDateDescending);
    expect(sorted.map((i) => i.date)).toEqual([
      "2024-06-15",
      "2024-03-10",
      "2024-01-01",
    ]);
  });

  test("Can be used with slice to get latest N items", () => {
    const items = [
      { date: "2024-01-01" },
      { date: "2024-02-01" },
      { date: "2024-03-01" },
      { date: "2024-04-01" },
    ];
    const latest = [...items].sort(sortByDateDescending).slice(0, 2);
    expect(latest.length).toBe(2);
  });

  test("Latest items are sorted with newest dates first", () => {
    const items = [
      { date: "2024-01-01", title: "Old" },
      { date: "2024-06-15", title: "Newest" },
      { date: "2024-03-10", title: "Middle" },
    ];
    const latest = [...items].sort(sortByDateDescending).slice(0, 3);
    expect(latest[0].title).toBe("Newest");
  });
});
