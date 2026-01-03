import {
  createTestRunner,
  expectDeepEqual,
  expectStrictEqual,
  expectTrue,
} from "#test/test-utils.js";
import {
  buildFirstOccurrenceLookup,
  buildReverseIndex,
  createLookup,
  groupBy,
  groupValuesBy,
} from "#utils/grouping.js";

const testCases = [
  // ============================================
  // buildReverseIndex Tests
  // ============================================
  {
    name: "buildReverseIndex-basic-multi-key",
    description: "Builds index from items with multiple keys each",
    test: () => {
      const products = [
        { name: "Widget", categories: ["tools", "hardware"] },
        { name: "Gadget", categories: ["tools", "electronics"] },
        { name: "Gizmo", categories: ["electronics"] },
      ];

      const index = buildReverseIndex(products, (p) => p.categories);

      expectStrictEqual(
        index.get("tools").length,
        2,
        "tools should have Widget and Gadget",
      );
      expectStrictEqual(
        index.get("electronics").length,
        2,
        "electronics should have Gadget and Gizmo",
      );
      expectStrictEqual(
        index.get("hardware").length,
        1,
        "hardware should have only Widget",
      );
    },
  },
  {
    name: "buildReverseIndex-empty-keys",
    description: "Handles items that return empty key arrays",
    test: () => {
      const items = [
        { name: "A", tags: ["x"] },
        { name: "B", tags: [] },
        { name: "C", tags: ["x", "y"] },
      ];

      const index = buildReverseIndex(items, (i) => i.tags);

      expectStrictEqual(
        index.get("x").length,
        2,
        "x should have items A and C",
      );
      expectStrictEqual(index.get("y").length, 1, "y should have only C");
      expectStrictEqual(
        index.has("B"),
        false,
        "B should not create any index entry",
      );
    },
  },
  {
    name: "buildReverseIndex-empty-items",
    description: "Returns empty Map for empty items array",
    test: () => {
      const index = buildReverseIndex([], (i) => i.keys || []);

      expectStrictEqual(index.size, 0, "Should return empty Map");
    },
  },
  {
    name: "buildReverseIndex-preserves-item-references",
    description: "Index entries reference original item objects",
    test: () => {
      const items = [
        { id: 1, keys: ["a"] },
        { id: 2, keys: ["a"] },
      ];

      const index = buildReverseIndex(items, (i) => i.keys);

      expectStrictEqual(
        index.get("a")[0],
        items[0],
        "Should preserve reference to first item",
      );
      expectStrictEqual(
        index.get("a")[1],
        items[1],
        "Should preserve reference to second item",
      );
    },
  },

  // ============================================
  // groupValuesBy Tests
  // ============================================
  {
    name: "groupValuesBy-basic",
    description: "Groups key-value pairs by key with unique values",
    test: () => {
      const pairs = [
        ["size", "small"],
        ["size", "large"],
        ["color", "red"],
        ["size", "medium"],
      ];

      const grouped = groupValuesBy(pairs);

      expectStrictEqual(
        grouped.get("size").size,
        3,
        "size should have 3 values",
      );
      expectStrictEqual(
        grouped.get("color").size,
        1,
        "color should have 1 value",
      );
      expectTrue(grouped.get("size").has("small"), "size should include small");
      expectTrue(grouped.get("size").has("large"), "size should include large");
    },
  },
  {
    name: "groupValuesBy-deduplicates",
    description: "Deduplicates repeated values for same key",
    test: () => {
      const pairs = [
        ["size", "small"],
        ["size", "small"],
        ["size", "small"],
      ];

      const grouped = groupValuesBy(pairs);

      expectStrictEqual(
        grouped.get("size").size,
        1,
        "Duplicate values should be deduplicated",
      );
    },
  },
  {
    name: "groupValuesBy-empty-pairs",
    description: "Returns empty Map for empty pairs array",
    test: () => {
      const grouped = groupValuesBy([]);

      expectStrictEqual(grouped.size, 0, "Should return empty Map");
    },
  },

  // ============================================
  // buildFirstOccurrenceLookup Tests
  // ============================================
  {
    name: "buildFirstOccurrenceLookup-first-wins",
    description: "Only first occurrence of each key is kept",
    test: () => {
      const items = [
        { attrs: [{ slug: "red", display: "Red" }] },
        { attrs: [{ slug: "red", display: "OVERRIDE" }] },
        { attrs: [{ slug: "blue", display: "Blue" }] },
      ];

      const lookup = buildFirstOccurrenceLookup(items, (item) =>
        item.attrs.map((a) => [a.slug, a.display]),
      );

      expectStrictEqual(
        lookup.red,
        "Red",
        "First occurrence 'Red' should win over 'OVERRIDE'",
      );
      expectStrictEqual(lookup.blue, "Blue", "blue should map to Blue");
    },
  },
  {
    name: "buildFirstOccurrenceLookup-multiple-pairs-per-item",
    description: "Handles items that produce multiple key-value pairs",
    test: () => {
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

      expectStrictEqual(lookup.a, 1, "a should map to 1");
      expectStrictEqual(lookup.b, 2, "b should map to 2");
      expectStrictEqual(lookup.c, 3, "c should map to 3");
    },
  },
  {
    name: "buildFirstOccurrenceLookup-empty-items",
    description: "Returns empty object for empty items array",
    test: () => {
      const lookup = buildFirstOccurrenceLookup([], () => []);

      expectDeepEqual(lookup, {}, "Should return empty object");
    },
  },

  // ============================================
  // groupBy Tests
  // ============================================
  {
    name: "groupBy-single-key",
    description: "Groups items by single extracted key",
    test: () => {
      const events = [
        { date: "2024-01-15", title: "A" },
        { date: "2024-01-15", title: "B" },
        { date: "2024-02-20", title: "C" },
      ];

      const byDate = groupBy(events, (e) => e.date);

      expectStrictEqual(
        byDate.get("2024-01-15").length,
        2,
        "Jan 15 should have 2 events",
      );
      expectStrictEqual(
        byDate.get("2024-02-20").length,
        1,
        "Feb 20 should have 1 event",
      );
    },
  },
  {
    name: "groupBy-skips-null-keys",
    description: "Items with null/undefined keys are excluded",
    test: () => {
      const items = [
        { type: "a", name: "A" },
        { type: null, name: "B" },
        { type: undefined, name: "C" },
        { type: "a", name: "D" },
      ];

      const byType = groupBy(items, (i) => i.type);

      expectStrictEqual(
        byType.get("a").length,
        2,
        "type 'a' should have 2 items",
      );
      expectStrictEqual(byType.size, 1, "Only one group should exist");
    },
  },
  {
    name: "groupBy-empty-items",
    description: "Returns empty Map for empty items array",
    test: () => {
      const grouped = groupBy([], (i) => i.key);

      expectStrictEqual(grouped.size, 0, "Should return empty Map");
    },
  },
  {
    name: "groupBy-preserves-order",
    description: "Items within groups maintain insertion order",
    test: () => {
      const items = [
        { type: "x", order: 1 },
        { type: "x", order: 2 },
        { type: "x", order: 3 },
      ];

      const grouped = groupBy(items, (i) => i.type);

      expectStrictEqual(
        grouped.get("x")[0].order,
        1,
        "First inserted should be first",
      );
      expectStrictEqual(
        grouped.get("x")[2].order,
        3,
        "Last inserted should be last",
      );
    },
  },

  // ============================================
  // createLookup Tests
  // ============================================
  {
    name: "createLookup-returns-items",
    description: "Returns items from index when key exists",
    test: () => {
      const index = new Map([
        ["widgets", [{ id: 1 }, { id: 2 }]],
        ["gadgets", [{ id: 3 }]],
      ]);

      const lookup = createLookup(index);

      expectStrictEqual(
        lookup("widgets").length,
        2,
        "Should return 2 items for widgets",
      );
      expectStrictEqual(
        lookup("gadgets")[0].id,
        3,
        "Should return correct gadgets item",
      );
    },
  },
  {
    name: "createLookup-returns-empty-array-for-missing",
    description: "Returns empty array when key not in index",
    test: () => {
      const index = new Map([["existing", [{ id: 1 }]]]);

      const lookup = createLookup(index);

      expectDeepEqual(
        lookup("missing"),
        [],
        "Should return empty array for missing key",
      );
    },
  },
  {
    name: "createLookup-with-buildReverseIndex",
    description: "Works correctly with buildReverseIndex output",
    test: () => {
      const products = [
        { name: "A", categories: ["tools"] },
        { name: "B", categories: ["tools", "hardware"] },
      ];

      const index = buildReverseIndex(products, (p) => p.categories);
      const getByCategory = createLookup(index);

      expectStrictEqual(
        getByCategory("tools").length,
        2,
        "Should return 2 products for tools",
      );
      expectStrictEqual(
        getByCategory("hardware").length,
        1,
        "Should return 1 product for hardware",
      );
      expectDeepEqual(
        getByCategory("nonexistent"),
        [],
        "Should return empty array for unknown category",
      );
    },
  },
];

export default createTestRunner("grouping", testCases);
