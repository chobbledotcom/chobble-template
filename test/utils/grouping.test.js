import { describe, test, expect } from "bun:test";
import {
  buildFirstOccurrenceLookup,
  buildReverseIndex,
  createLookup,
  groupBy,
  groupValuesBy,
} from "#utils/grouping.js";

describe("grouping", () => {
  // ============================================
  // buildReverseIndex Tests
  // ============================================
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

  // ============================================
  // groupValuesBy Tests
  // ============================================
  test("Groups key-value pairs by key with unique values", () => {
    const pairs = [
      ["size", "small"],
      ["size", "large"],
      ["color", "red"],
      ["size", "medium"],
    ];

    const grouped = groupValuesBy(pairs);

    expect(grouped.get("size").size).toBe(3);
    expect(grouped.get("color").size).toBe(1);
    expect(grouped.get("size").has("small")).toBe(true);
    expect(grouped.get("size").has("large")).toBe(true);
  });

  test("Deduplicates repeated values for same key", () => {
    const pairs = [
      ["size", "small"],
      ["size", "small"],
      ["size", "small"],
    ];

    const grouped = groupValuesBy(pairs);

    expect(grouped.get("size").size).toBe(1);
  });

  test("Returns empty Map for empty pairs array", () => {
    const grouped = groupValuesBy([]);

    expect(grouped.size).toBe(0);
  });

  // ============================================
  // buildFirstOccurrenceLookup Tests
  // ============================================
  test("Only first occurrence of each key is kept", () => {
    const items = [
      { attrs: [{ slug: "red", display: "Red" }] },
      { attrs: [{ slug: "red", display: "OVERRIDE" }] },
      { attrs: [{ slug: "blue", display: "Blue" }] },
    ];

    const lookup = buildFirstOccurrenceLookup(items, (item) =>
      item.attrs.map((a) => [a.slug, a.display]),
    );

    expect(lookup.red).toBe("Red");
    expect(lookup.blue).toBe("Blue");
  });

  test("Handles items that produce multiple key-value pairs", () => {
    const items = [
      {
        attrs: [
          { k: "a", v: 1 },
          { k: "b", v: 2 },
        ],
      },
      { attrs: [{ k: "c", v: 3 }] },
    ];

    const lookup = buildFirstOccurrenceLookup(items, (item) =>
      item.attrs.map((a) => [a.k, a.v]),
    );

    expect(lookup.a).toBe(1);
    expect(lookup.b).toBe(2);
    expect(lookup.c).toBe(3);
  });

  test("Returns empty object for empty items array", () => {
    const lookup = buildFirstOccurrenceLookup([], () => []);

    expect(lookup).toEqual({});
  });

  // ============================================
  // groupBy Tests
  // ============================================
  test("Groups items by single extracted key", () => {
    const events = [
      { date: "2024-01-15", title: "A" },
      { date: "2024-01-15", title: "B" },
      { date: "2024-02-20", title: "C" },
    ];

    const byDate = groupBy(events, (e) => e.date);

    expect(byDate.get("2024-01-15").length).toBe(2);
    expect(byDate.get("2024-02-20").length).toBe(1);
  });

  test("Items with null/undefined keys are excluded", () => {
    const items = [
      { type: "a", name: "A" },
      { type: null, name: "B" },
      { type: undefined, name: "C" },
      { type: "a", name: "D" },
    ];

    const byType = groupBy(items, (i) => i.type);

    expect(byType.get("a").length).toBe(2);
    expect(byType.size).toBe(1);
  });

  test("Returns empty Map for empty items array", () => {
    const grouped = groupBy([], (i) => i.key);

    expect(grouped.size).toBe(0);
  });

  test("Items within groups maintain insertion order", () => {
    const items = [
      { type: "x", order: 1 },
      { type: "x", order: 2 },
      { type: "x", order: 3 },
    ];

    const grouped = groupBy(items, (i) => i.type);

    expect(grouped.get("x")[0].order).toBe(1);
    expect(grouped.get("x")[2].order).toBe(3);
  });

  // ============================================
  // createLookup Tests
  // ============================================
  test("Returns items from index when key exists", () => {
    const index = new Map([
      ["widgets", [{ id: 1 }, { id: 2 }]],
      ["gadgets", [{ id: 3 }]],
    ]);

    const lookup = createLookup(index);

    expect(lookup("widgets").length).toBe(2);
    expect(lookup("gadgets")[0].id).toBe(3);
  });

  test("Returns empty array when key not in index", () => {
    const index = new Map([["existing", [{ id: 1 }]]]);

    const lookup = createLookup(index);

    expect(lookup("missing")).toEqual([]);
  });

  test("Works correctly with buildReverseIndex output", () => {
    const products = [
      { name: "A", categories: ["tools"] },
      { name: "B", categories: ["tools", "hardware"] },
    ];

    const index = buildReverseIndex(products, (p) => p.categories);
    const getByCategory = createLookup(index);

    expect(getByCategory("tools").length).toBe(2);
    expect(getByCategory("hardware").length).toBe(1);
    expect(getByCategory("nonexistent")).toEqual([]);
  });
});
