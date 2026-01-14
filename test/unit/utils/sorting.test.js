import { describe, expect, test } from "bun:test";
import {
  compareBy,
  descending,
  sortByDateDescending,
  sortItems,
  sortNavigationItems,
} from "#utils/sorting.js";

// ============================================
// Factory Functions - create test data concisely
// ============================================

const dataItem = (order, title) => ({ data: { order, title } });
const dataItemWithName = (order, name) => ({ data: { order, name } });
const emptyDataItem = () => ({ data: {} });
const titleOnlyItem = (title) => ({ data: { title } });
const dateItem = (date, title) => (title ? { date, title } : { date });
const valueItem = (value) => ({ value });
const ageItem = (age) => ({ age });
const navItem = (order, key, title) => ({
  data: { eleventyNavigation: { order, key }, title },
});
const navItemNoOrder = (key, title) => ({
  data: { eleventyNavigation: { key }, title },
});
const navItemNoKey = (order, title) => ({
  data: { eleventyNavigation: { order }, title },
});

// ============================================
// Assertion Helpers
// ============================================

// Curried: (comparator) => (extractor) => (items, expected) => assertion
const expectSorted = (comparator) => (extractor) => (items, expected) =>
  expect([...items].sort(comparator).map(extractor)).toEqual(expected);

// Pre-built assertions for common cases
const expectItemsByTitle = expectSorted(sortItems)((i) => i.data.title);
const expectItemsByName = expectSorted(sortItems)((i) => i.data.name);
const expectDatesSorted = expectSorted(sortByDateDescending)((i) => i.date);
const expectNavByKey = expectSorted(sortNavigationItems)(
  (i) => i.data.eleventyNavigation.key,
);
const expectNavByTitle = expectSorted(sortNavigationItems)((i) => i.data.title);

// Test that a comparator returns 0 for equal values
const expectZeroForEqual = (comparator) =>
  expect(comparator(valueItem(5), valueItem(5))).toBe(0);

// Sort age items and verify order
const expectAgesSorted = (comparator, expected) =>
  expectSorted(comparator)((i) => i.age)(
    [ageItem(10), ageItem(30), ageItem(20)],
    expected,
  );

describe("sorting", () => {
  // ============================================
  // sortItems Tests
  // ============================================
  test("Items with different order values sort by order, ignoring title", () => {
    expectItemsByTitle(
      [dataItem(2, "A"), dataItem(1, "B"), dataItem(3, "C")],
      ["B", "A", "C"],
    );
  });

  test("Items with identical order values fall back to alphabetical title sorting", () => {
    const items = [
      dataItem(1, "Zebra"),
      dataItem(1, "Apple"),
      dataItem(1, "Mango"),
    ];
    expectItemsByTitle(items, ["Apple", "Mango", "Zebra"]);
  });

  test("Items without an order field are treated as having order 0", () => {
    expectItemsByTitle(
      [dataItem(1, "B"), titleOnlyItem("A"), dataItem(-1, "C")],
      ["C", "A", "B"],
    );
  });

  test("Uses name field for alphabetical sorting when title is absent", () => {
    expectItemsByName(
      [dataItemWithName(1, "Zebra"), dataItemWithName(1, "Apple")],
      ["Apple", "Zebra"],
    );
  });

  test("Handles items with missing or empty data objects without throwing", () => {
    const items = [dataItem(1, "B"), emptyDataItem()];
    const sorted = [...items].sort(sortItems);
    expect(sorted.length).toBe(2);
  });

  test("Items with empty data objects are treated as order 0", () => {
    const items = [dataItem(1, "B"), emptyDataItem(), titleOnlyItem("A")];
    const sorted = [...items].sort(sortItems);
    expect(sorted[0].data).toEqual({});
  });

  // ============================================
  // sortByDateDescending Tests
  // ============================================
  test("Items are sorted with most recent dates appearing first", () => {
    expectDatesSorted(
      [dateItem("2024-01-01"), dateItem("2024-06-15"), dateItem("2024-03-10")],
      ["2024-06-15", "2024-03-10", "2024-01-01"],
    );
  });

  test("Can be used with slice to get latest N items", () => {
    const items = ["01", "02", "03", "04"].map((d) => dateItem(`2024-${d}-01`));
    const latest = [...items].sort(sortByDateDescending).slice(0, 2);
    expect(latest.length).toBe(2);
  });

  test("Latest items are sorted with newest dates first", () => {
    const items = [
      dateItem("2024-01-01", "Old"),
      dateItem("2024-06-15", "Newest"),
      dateItem("2024-03-10", "Middle"),
    ];
    const sorted = [...items].sort(sortByDateDescending);
    expect(sorted[0].title).toBe("Newest");
  });

  // ============================================
  // compareBy Tests
  // ============================================
  test("compareBy creates comparator that sorts ascending by extracted numeric values", () => {
    expectAgesSorted(compareBy((i) => i.age), [10, 20, 30]);
  });

  test("compareBy handles negative numbers correctly", () => {
    const byValue = compareBy((i) => i.value);
    const sorted = [-5, 10, -20, 0].map(valueItem).sort(byValue);
    expect(sorted.map((i) => i.value)).toEqual([-20, -5, 0, 10]);
  });

  test("compareBy returns 0 for equal values", () => {
    expectZeroForEqual(compareBy((i) => i.value));
  });

  test("compareBy works with Date.getTime for date sorting", () => {
    const byCreated = compareBy((i) => i.created.getTime());
    const items = ["2024-03-01", "2024-01-01", "2024-02-01"].map((d) => ({
      created: new Date(d),
    }));
    const sorted = items.sort(byCreated);
    expect(sorted[0].created.getTime()).toBe(new Date("2024-01-01").getTime());
    expect(sorted[2].created.getTime()).toBe(new Date("2024-03-01").getTime());
  });

  // ============================================
  // descending Tests
  // ============================================
  test("descending reverses ascending comparator to sort descending", () => {
    expectAgesSorted(descending(compareBy((i) => i.age)), [30, 20, 10]);
  });

  test("descending preserves 0 for equal values", () => {
    expectZeroForEqual(descending(compareBy((i) => i.value)));
  });

  test("descending can be applied to custom comparators", () => {
    const byLengthDesc = descending((a, b) => a.length - b.length);
    expect(["a", "aaa", "aa"].sort(byLengthDesc)).toEqual(["aaa", "aa", "a"]);
  });

  // ============================================
  // sortNavigationItems Tests
  // ============================================
  test("sortNavigationItems sorts by eleventyNavigation.order ascending", () => {
    expectNavByKey(
      [
        navItem(3, "C", "Item C"),
        navItem(1, "A", "Item A"),
        navItem(2, "B", "Item B"),
      ],
      ["A", "B", "C"],
    );
  });

  test("sortNavigationItems falls back to key when orders are equal", () => {
    expectNavByKey(
      [
        navItem(1, "Zebra", "Z"),
        navItem(1, "Apple", "A"),
        navItem(1, "Mango", "M"),
      ],
      ["Apple", "Mango", "Zebra"],
    );
  });

  test("sortNavigationItems defaults missing order to 999", () => {
    expectNavByKey(
      [
        navItemNoOrder("NoOrder", "No Order"),
        navItem(1, "First", "F"),
        navItem(500, "Middle", "M"),
      ],
      ["First", "Middle", "NoOrder"],
    );
  });

  test("sortNavigationItems falls back to title when key is missing", () => {
    expectNavByTitle(
      [navItemNoKey(1, "Zebra Title"), navItemNoKey(1, "Apple Title")],
      ["Apple Title", "Zebra Title"],
    );
  });
});
