import {
  createTestRunner,
  expectDeepEqual,
  expectStrictEqual,
} from "#test/test-utils.js";
import {
  getLatestItems,
  sortByDateDescending,
  sortItems,
} from "#utils/sorting.js";

const testCases = [
  // ============================================
  // sortItems Tests
  // ============================================
  {
    name: "sortItems-sorts-by-order-first",
    description:
      "Items with different order values sort by order, ignoring title",
    test: () => {
      const items = [
        { data: { order: 2, title: "A" } },
        { data: { order: 1, title: "B" } },
        { data: { order: 3, title: "C" } },
      ];
      const sorted = [...items].sort(sortItems);
      expectDeepEqual(
        sorted.map((i) => i.data.title),
        ["B", "A", "C"],
        "Should sort by order: 1->B, 2->A, 3->C",
      );
    },
  },
  {
    name: "sortItems-sorts-alphabetically-when-order-equal",
    description:
      "Items with identical order values fall back to alphabetical title sorting",
    test: () => {
      const items = [
        { data: { order: 1, title: "Zebra" } },
        { data: { order: 1, title: "Apple" } },
        { data: { order: 1, title: "Mango" } },
      ];
      const sorted = [...items].sort(sortItems);
      expectDeepEqual(
        sorted.map((i) => i.data.title),
        ["Apple", "Mango", "Zebra"],
        "Items with same order should be sorted alphabetically by title",
      );
    },
  },
  {
    name: "sortItems-treats-missing-order-as-zero",
    description: "Items without an order field are treated as having order 0",
    test: () => {
      const items = [
        { data: { order: 1, title: "B" } },
        { data: { title: "A" } },
        { data: { order: -1, title: "C" } },
      ];
      const sorted = [...items].sort(sortItems);
      expectDeepEqual(
        sorted.map((i) => i.data.title),
        ["C", "A", "B"],
        "Missing order should default to 0: -1->C, 0->A, 1->B",
      );
    },
  },
  {
    name: "sortItems-falls-back-to-name-when-title-missing",
    description:
      "Uses name field for alphabetical sorting when title is absent",
    test: () => {
      const items = [
        { data: { order: 1, name: "Zebra" } },
        { data: { order: 1, name: "Apple" } },
      ];
      const sorted = [...items].sort(sortItems);
      expectDeepEqual(
        sorted.map((i) => i.data.name),
        ["Apple", "Zebra"],
        "Should use name for alphabetical sorting when title is missing",
      );
    },
  },
  {
    name: "sortItems-does-not-throw-on-missing-data",
    description:
      "Handles items with missing or empty data objects without throwing",
    test: () => {
      const items = [{ data: { order: 1, title: "B" } }, { data: {} }, {}];
      // This should not throw
      const sorted = [...items].sort(sortItems);
      expectStrictEqual(
        sorted.length,
        3,
        "Should handle all items without throwing",
      );
    },
  },
  {
    name: "sortItems-places-items-with-missing-data-before-ordered",
    description:
      "Items with missing data are treated as order 0 and placed before order 1",
    test: () => {
      const items = [{ data: { order: 1, title: "B" } }, { data: {} }, {}];
      const sorted = [...items].sort(sortItems);
      expectStrictEqual(
        sorted[2].data?.title,
        "B",
        "Item with order 1 should be last (after items with implicit order 0)",
      );
    },
  },

  // ============================================
  // sortByDateDescending Tests
  // ============================================
  {
    name: "sortByDateDescending-sorts-newest-first",
    description: "Items are sorted with most recent dates appearing first",
    test: () => {
      const items = [
        { date: "2024-01-01" },
        { date: "2024-06-15" },
        { date: "2024-03-10" },
      ];
      const sorted = [...items].sort(sortByDateDescending);
      expectDeepEqual(
        sorted.map((i) => i.date),
        ["2024-06-15", "2024-03-10", "2024-01-01"],
        "Items should be sorted newest to oldest",
      );
    },
  },

  // ============================================
  // getLatestItems Tests
  // ============================================
  {
    name: "getLatestItems-limits-results-to-count",
    description: "Returns only the specified number of items",
    test: () => {
      const items = [
        { date: "2024-01-01" },
        { date: "2024-02-01" },
        { date: "2024-03-01" },
        { date: "2024-04-01" },
      ];
      const latest = getLatestItems(items, 2);
      expectStrictEqual(
        latest.length,
        2,
        "Should return only 2 items when limit is 2",
      );
    },
  },
  {
    name: "getLatestItems-returns-newest-first",
    description: "Returned items are sorted with newest dates first",
    test: () => {
      const items = [
        { date: "2024-01-01", title: "Old" },
        { date: "2024-06-15", title: "Newest" },
        { date: "2024-03-10", title: "Middle" },
      ];
      const latest = getLatestItems(items, 3);
      expectStrictEqual(
        latest[0].title,
        "Newest",
        "First item should be the newest",
      );
    },
  },
  {
    name: "getLatestItems-defaults-to-three-items",
    description: "Returns 3 items when no limit is specified",
    test: () => {
      const items = [
        { date: "2024-01-01" },
        { date: "2024-02-01" },
        { date: "2024-03-01" },
        { date: "2024-04-01" },
        { date: "2024-05-01" },
      ];
      const latest = getLatestItems(items);
      expectStrictEqual(
        latest.length,
        3,
        "Should default to 3 items when limit not specified",
      );
    },
  },
  {
    name: "getLatestItems-handles-null-input",
    description: "Returns empty array when input is null",
    test: () => {
      const latest = getLatestItems(null);
      expectDeepEqual(latest, [], "Should return empty array for null input");
    },
  },
  {
    name: "getLatestItems-handles-empty-array",
    description: "Returns empty array when input array is empty",
    test: () => {
      const latest = getLatestItems([]);
      expectDeepEqual(latest, [], "Should return empty array for empty input");
    },
  },
];

export default createTestRunner("sorting", testCases);
