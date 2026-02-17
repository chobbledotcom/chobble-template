import { describe, expect, test } from "bun:test";
import { Window } from "happy-dom";
import {
  applyFiltersAndSort,
  itemMatchesFilters,
} from "#public/ui/category-filter-engine.js";

// ============================================
// Test helpers
// ============================================

const createDOMItems = (specs) => {
  const window = new Window();
  const ul = window.document.createElement("ul");
  window.document.body.appendChild(ul);

  const items = (
    specs || [
      { title: "Cherry", price: 30, filters: { colour: "red" } },
      { title: "Apple", price: 10, filters: { colour: "green" } },
      { title: "Banana", price: 20, filters: { colour: "yellow" } },
    ]
  ).map((spec, index) => {
    const li = window.document.createElement("li");
    li.textContent = spec.title;
    ul.appendChild(li);
    return {
      element: li,
      data: { title: spec.title, price: spec.price, filters: spec.filters },
      originalIndex: index,
    };
  });

  return { ul, items, window };
};

const getChildTexts = (ul) => [...ul.children].map((li) => li.textContent);

const expectVisibility = (items, visibleIndices) => {
  for (const [i, item] of items.entries()) {
    const expected = visibleIndices.includes(i) ? "" : "none";
    expect(item.element.style.display).toBe(expected);
  }
};

// ============================================
// Filtering (AND logic)
// ============================================

describe("applyFiltersAndSort filtering", () => {
  test("hides non-matching items and shows matching ones", () => {
    const { ul, items } = createDOMItems();

    applyFiltersAndSort(items, ul, { colour: "red" }, "default");

    expectVisibility(items, [0]);
  });

  test("shows all items when filters are empty", () => {
    const { ul, items } = createDOMItems();

    const count = applyFiltersAndSort(items, ul, {}, "default");

    expect(count).toBe(3);
    for (const item of items) {
      expect(item.element.style.display).toBe("");
    }
  });

  test("returns count of matched items", () => {
    const { ul, items } = createDOMItems();

    const count = applyFiltersAndSort(
      items,
      ul,
      { colour: "green" },
      "default",
    );

    expect(count).toBe(1);
  });

  test("rejects items when filter key does not exist", () => {
    const { ul, items } = createDOMItems();

    const count = applyFiltersAndSort(
      items,
      ul,
      { weight: "heavy" },
      "default",
    );

    expect(count).toBe(0);
  });

  test("applies AND logic across multiple filter keys", () => {
    const { ul, items } = createDOMItems([
      { title: "A", price: 0, filters: { colour: "red", size: "large" } },
      { title: "B", price: 0, filters: { colour: "red", size: "small" } },
      { title: "C", price: 0, filters: { colour: "blue", size: "large" } },
    ]);

    const count = applyFiltersAndSort(
      items,
      ul,
      { colour: "red", size: "large" },
      "default",
    );

    expect(count).toBe(1);
    expectVisibility(items, [0]);
  });
});

// ============================================
// Sorting (DOM reorder)
// ============================================

describe("applyFiltersAndSort sorting", () => {
  test("reorders DOM children by name ascending", () => {
    const { ul, items } = createDOMItems();

    applyFiltersAndSort(items, ul, {}, "name-asc");

    expect(getChildTexts(ul)).toEqual(["Apple", "Banana", "Cherry"]);
  });

  test("reorders DOM children by name descending", () => {
    const { ul, items } = createDOMItems();

    applyFiltersAndSort(items, ul, {}, "name-desc");

    expect(getChildTexts(ul)).toEqual(["Cherry", "Banana", "Apple"]);
  });

  test("reorders DOM children by price ascending", () => {
    const { ul, items } = createDOMItems();

    applyFiltersAndSort(items, ul, {}, "price-asc");

    expect(getChildTexts(ul)).toEqual(["Apple", "Banana", "Cherry"]);
  });

  test("reorders DOM children by price descending", () => {
    const { ul, items } = createDOMItems();

    applyFiltersAndSort(items, ul, {}, "price-desc");

    expect(getChildTexts(ul)).toEqual(["Cherry", "Banana", "Apple"]);
  });

  test("restores original order with default sort after reorder", () => {
    const { ul, items } = createDOMItems();

    applyFiltersAndSort(items, ul, {}, "name-asc");
    applyFiltersAndSort(items, ul, {}, "default");

    expect(getChildTexts(ul)).toEqual(["Cherry", "Apple", "Banana"]);
  });

  test("falls back to default sort for unknown sort key", () => {
    const { ul, items } = createDOMItems();

    applyFiltersAndSort(items, ul, {}, "nonexistent");

    expect(getChildTexts(ul)).toEqual(["Cherry", "Apple", "Banana"]);
  });
});

// ============================================
// itemMatchesFilters
// ============================================

describe("itemMatchesFilters", () => {
  const item = {
    data: { filters: { colour: "red", size: "large" } },
  };

  test("returns true when all filters match", () => {
    expect(itemMatchesFilters(item, { colour: "red", size: "large" })).toBe(
      true,
    );
  });

  test("returns true for empty filters", () => {
    expect(itemMatchesFilters(item, {})).toBe(true);
  });

  test("returns false when a filter value does not match", () => {
    expect(itemMatchesFilters(item, { colour: "blue" })).toBe(false);
  });

  test("returns false when a filter key does not exist on item", () => {
    expect(itemMatchesFilters(item, { weight: "heavy" })).toBe(false);
  });

  test("returns true for partial filter match", () => {
    expect(itemMatchesFilters(item, { colour: "red" })).toBe(true);
  });
});

// ============================================
// Feasibility check logic (unit-level)
// ============================================

describe("feasibility check logic", () => {
  const items = [
    { data: { filters: { colour: "red", size: "large" } } },
    { data: { filters: { colour: "red", size: "small" } } },
    { data: { filters: { colour: "blue", size: "large" } } },
    { data: { filters: { colour: "blue", size: "small" } } },
  ];

  /**
   * Replicates the feasibility logic from category-filter.js:
   * An option is shown if its hypothetical count > 0 AND
   * (it's a same-group replacement OR the count differs from current).
   */
  const isOptionFeasible = (activeFilters, key, value, currentMatchCount) => {
    if (activeFilters[key] === value) return true;
    const hypothetical = { ...activeFilters, [key]: value };
    const count = items.filter((item) =>
      itemMatchesFilters(item, hypothetical),
    ).length;
    const isReplacement = key in activeFilters;
    return count > 0 && (isReplacement || count !== currentMatchCount);
  };

  test("hides option when hypothetical count is 0", () => {
    // With colour=red active (2 items match), adding weight=heavy would match 0
    const active = { colour: "red" };
    const currentCount = items.filter((i) =>
      itemMatchesFilters(i, active),
    ).length;
    expect(isOptionFeasible(active, "weight", "heavy", currentCount)).toBe(
      false,
    );
  });

  test("shows cross-group option when it narrows the result set from unfiltered", () => {
    expect(isOptionFeasible({}, "size", "large", 4)).toBe(true);
  });

  test("shows same-group replacement even if count matches", () => {
    // colour=red active (2 match), replacing with colour=blue also matches 2
    // Same count but different set. Should show because it's a replacement.
    const active = { colour: "red" };
    const currentCount = 2;
    expect(isOptionFeasible(active, "colour", "blue", currentCount)).toBe(true);
  });

  test("shows option when it narrows the result set", () => {
    // colour=red active (2 match), adding size=large matches 1 (narrows)
    const active = { colour: "red" };
    const currentCount = 2;
    expect(isOptionFeasible(active, "size", "large", currentCount)).toBe(true);
  });

  test("always shows active option as feasible", () => {
    const active = { colour: "red" };
    expect(isOptionFeasible(active, "colour", "red", 2)).toBe(true);
  });
});
