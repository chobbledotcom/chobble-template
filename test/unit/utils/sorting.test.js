import { describe, expect, test } from "bun:test";
import {
  compareBy,
  descending,
  sortByDateDescending,
  sortItems,
  sortNavigationItems,
} from "#utils/sorting.js";

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

  test("Handles items with missing or empty data objects without throwing", () => {
    const items = [{ data: { order: 1, title: "B" } }, { data: {} }];
    // This should not throw
    const sorted = [...items].sort(sortItems);
    expect(sorted.length).toBe(2);
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

  // ============================================
  // compareBy Tests
  // ============================================
  test("compareBy creates comparator that sorts ascending by extracted numeric values", () => {
    const items = [{ age: 30 }, { age: 10 }, { age: 20 }];
    const byAge = compareBy((item) => item.age);
    const sorted = [...items].sort(byAge);
    expect(sorted.map((i) => i.age)).toEqual([10, 20, 30]);
  });

  test("compareBy handles negative numbers correctly", () => {
    const items = [{ value: -5 }, { value: 10 }, { value: -20 }, { value: 0 }];
    const byValue = compareBy((item) => item.value);
    const sorted = [...items].sort(byValue);
    expect(sorted.map((i) => i.value)).toEqual([-20, -5, 0, 10]);
  });

  test("compareBy returns 0 for equal values", () => {
    const byValue = compareBy((item) => item.value);
    const a = { value: 5 };
    const b = { value: 5 };
    expect(byValue(a, b)).toBe(0);
  });

  test("compareBy works with Date.getTime for date sorting", () => {
    const items = [
      { created: new Date("2024-03-01") },
      { created: new Date("2024-01-01") },
      { created: new Date("2024-02-01") },
    ];
    const byDate = compareBy((item) => item.created.getTime());
    const sorted = [...items].sort(byDate);
    expect(sorted[0].created.getTime()).toBe(new Date("2024-01-01").getTime());
    expect(sorted[2].created.getTime()).toBe(new Date("2024-03-01").getTime());
  });

  // ============================================
  // descending Tests
  // ============================================
  test("descending reverses ascending comparator to sort descending", () => {
    const items = [{ age: 10 }, { age: 30 }, { age: 20 }];
    const byAgeAsc = compareBy((item) => item.age);
    const byAgeDesc = descending(byAgeAsc);
    const sorted = [...items].sort(byAgeDesc);
    expect(sorted.map((i) => i.age)).toEqual([30, 20, 10]);
  });

  test("descending preserves 0 for equal values", () => {
    const byValue = compareBy((item) => item.value);
    const byValueDesc = descending(byValue);
    const a = { value: 5 };
    const b = { value: 5 };
    expect(byValueDesc(a, b)).toBe(0);
  });

  test("descending can be applied to custom comparators", () => {
    const byLength = (a, b) => a.length - b.length;
    const byLengthDesc = descending(byLength);
    const items = ["a", "aaa", "aa"];
    const sorted = [...items].sort(byLengthDesc);
    expect(sorted).toEqual(["aaa", "aa", "a"]);
  });

  // ============================================
  // sortNavigationItems Tests
  // ============================================
  test("sortNavigationItems sorts by eleventyNavigation.order ascending", () => {
    const items = [
      { data: { eleventyNavigation: { order: 3, key: "C" }, title: "Item C" } },
      { data: { eleventyNavigation: { order: 1, key: "A" }, title: "Item A" } },
      { data: { eleventyNavigation: { order: 2, key: "B" }, title: "Item B" } },
    ];
    const sorted = [...items].sort(sortNavigationItems);
    expect(sorted.map((i) => i.data.eleventyNavigation.key)).toEqual([
      "A",
      "B",
      "C",
    ]);
  });

  test("sortNavigationItems falls back to key when orders are equal", () => {
    const items = [
      { data: { eleventyNavigation: { order: 1, key: "Zebra" }, title: "Z" } },
      { data: { eleventyNavigation: { order: 1, key: "Apple" }, title: "A" } },
      { data: { eleventyNavigation: { order: 1, key: "Mango" }, title: "M" } },
    ];
    const sorted = [...items].sort(sortNavigationItems);
    expect(sorted.map((i) => i.data.eleventyNavigation.key)).toEqual([
      "Apple",
      "Mango",
      "Zebra",
    ]);
  });

  test("sortNavigationItems defaults missing order to 999", () => {
    const items = [
      { data: { eleventyNavigation: { key: "NoOrder" }, title: "No Order" } },
      { data: { eleventyNavigation: { order: 1, key: "First" }, title: "F" } },
      {
        data: { eleventyNavigation: { order: 500, key: "Middle" }, title: "M" },
      },
    ];
    const sorted = [...items].sort(sortNavigationItems);
    expect(sorted.map((i) => i.data.eleventyNavigation.key)).toEqual([
      "First",
      "Middle",
      "NoOrder",
    ]);
  });

  test("sortNavigationItems falls back to title when key is missing", () => {
    const items = [
      { data: { eleventyNavigation: { order: 1 }, title: "Zebra Title" } },
      { data: { eleventyNavigation: { order: 1 }, title: "Apple Title" } },
    ];
    const sorted = [...items].sort(sortNavigationItems);
    expect(sorted.map((i) => i.data.title)).toEqual([
      "Apple Title",
      "Zebra Title",
    ]);
  });
});
