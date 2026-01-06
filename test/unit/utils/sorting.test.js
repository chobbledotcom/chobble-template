import { describe, expect, test } from "bun:test";
import {
  getLatestItems,
  sortByDateDescending,
  sortItems,
} from "#utils/sorting.js";

describe("sorting", () => {
  // ============================================
  // sortItems Tests
  // ============================================
  test("Items with different order values sort by order, ignoring title", () => {
    const items = [
      { data: { order: 2, title: "A" } },
      { data: { order: 1, title: "B" } },
      { data: { order: 3, title: "C" } },
    ];
    const sorted = [...items].sort(sortItems);
    expect(sorted.map((i) => i.data.title)).toEqual(["B", "A", "C"]);
  });

  test("Items with identical order values fall back to alphabetical title sorting", () => {
    const items = [
      { data: { order: 1, title: "Zebra" } },
      { data: { order: 1, title: "Apple" } },
      { data: { order: 1, title: "Mango" } },
    ];
    const sorted = [...items].sort(sortItems);
    expect(sorted.map((i) => i.data.title)).toEqual([
      "Apple",
      "Mango",
      "Zebra",
    ]);
  });

  test("Items without an order field are treated as having order 0", () => {
    const items = [
      { data: { order: 1, title: "B" } },
      { data: { title: "A" } },
      { data: { order: -1, title: "C" } },
    ];
    const sorted = [...items].sort(sortItems);
    expect(sorted.map((i) => i.data.title)).toEqual(["C", "A", "B"]);
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
    const items = [{ data: { order: 1, title: "B" } }, { data: {} }, {}];
    // This should not throw
    const sorted = [...items].sort(sortItems);
    expect(sorted.length).toBe(3);
  });

  test("Items with missing data are treated as order 0 and placed before order 1", () => {
    const items = [{ data: { order: 1, title: "B" } }, { data: {} }, {}];
    const sorted = [...items].sort(sortItems);
    expect(sorted[2].data?.title).toBe("B");
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

  // ============================================
  // getLatestItems Tests
  // ============================================
  test("Returns only the specified number of items", () => {
    const items = [
      { date: "2024-01-01" },
      { date: "2024-02-01" },
      { date: "2024-03-01" },
      { date: "2024-04-01" },
    ];
    const latest = getLatestItems(items, 2);
    expect(latest.length).toBe(2);
  });

  test("Returned items are sorted with newest dates first", () => {
    const items = [
      { date: "2024-01-01", title: "Old" },
      { date: "2024-06-15", title: "Newest" },
      { date: "2024-03-10", title: "Middle" },
    ];
    const latest = getLatestItems(items, 3);
    expect(latest[0].title).toBe("Newest");
  });

  test("Returns 3 items when no limit is specified", () => {
    const items = [
      { date: "2024-01-01" },
      { date: "2024-02-01" },
      { date: "2024-03-01" },
      { date: "2024-04-01" },
      { date: "2024-05-01" },
    ];
    const latest = getLatestItems(items);
    expect(latest.length).toBe(3);
  });

  test("Returns empty array when input is null", () => {
    const latest = getLatestItems(null);
    expect(latest).toEqual([]);
  });

  test("Returns empty array when input array is empty", () => {
    const latest = getLatestItems([]);
    expect(latest).toEqual([]);
  });
});
