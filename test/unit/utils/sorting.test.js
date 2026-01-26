import { describe, expect, test } from "bun:test";
import { data } from "#test/test-utils.js";
import { compareBy, descending } from "#toolkit/fp/sorting.js";
import {
  sortByDateDescending,
  sortItems,
  sortNavigationItems,
} from "#utils/sorting.js";

// ============================================
// Curried Data Factories
// ============================================

/** Item factory for order/title sorting */
const orderedItem = data({})("title", "order");

/** Navigation item factory */
const navItem = data({})("eleventyNavigation", "title");

// Generic helper: sort items and assert extracted values match expected
const expectSortedValues = (items, comparator, extractor, expected) =>
  expect([...items].sort(comparator).map(extractor)).toEqual(expected);

describe("sorting", () => {
  // ============================================
  // sortItems Tests
  // ============================================
  test("Items with different order values sort by order, ignoring title", () => {
    const items = orderedItem(["A", 2], ["B", 1], ["C", 3]);
    expectSortedValues(items, sortItems, (i) => i.data.title, ["B", "A", "C"]);
  });

  test("Items with identical order values fall back to alphabetical title sorting", () => {
    const items = orderedItem(["Zebra", 1], ["Apple", 1], ["Mango", 1]);
    expectSortedValues(items, sortItems, (i) => i.data.title, [
      "Apple",
      "Mango",
      "Zebra",
    ]);
  });

  test("Items with order 0 sort before items with positive order", () => {
    const items = orderedItem(["B", 1], ["A", 0], ["C", -1]);
    expectSortedValues(items, sortItems, (i) => i.data.title, ["C", "A", "B"]);
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
  // Common extractor for nav key
  const extractNavKey = (i) => i.data.eleventyNavigation.key;

  test("sortNavigationItems sorts by eleventyNavigation.order ascending", () => {
    const items = navItem(
      [{ order: 3, key: "C" }, "Item C"],
      [{ order: 1, key: "A" }, "Item A"],
      [{ order: 2, key: "B" }, "Item B"],
    );
    expectSortedValues(items, sortNavigationItems, extractNavKey, [
      "A",
      "B",
      "C",
    ]);
  });

  test("sortNavigationItems falls back to key when orders are equal", () => {
    const items = navItem(
      [{ order: 1, key: "Zebra" }, "Z"],
      [{ order: 1, key: "Apple" }, "A"],
      [{ order: 1, key: "Mango" }, "M"],
    );
    expectSortedValues(items, sortNavigationItems, extractNavKey, [
      "Apple",
      "Mango",
      "Zebra",
    ]);
  });

  test("sortNavigationItems defaults missing order to 999", () => {
    const items = navItem(
      [{ key: "NoOrder" }, "No Order"],
      [{ order: 1, key: "First" }, "F"],
      [{ order: 500, key: "Middle" }, "M"],
    );
    expectSortedValues(items, sortNavigationItems, extractNavKey, [
      "First",
      "Middle",
      "NoOrder",
    ]);
  });

  test("sortNavigationItems falls back to title when key is missing", () => {
    const items = navItem(
      [{ order: 1 }, "Zebra Title"],
      [{ order: 1 }, "Apple Title"],
    );
    expectSortedValues(items, sortNavigationItems, (i) => i.data.title, [
      "Apple Title",
      "Zebra Title",
    ]);
  });
});
