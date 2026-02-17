import { describe, expect, test } from "bun:test";
import { Window } from "happy-dom";
import { applyFiltersAndSort } from "#public/ui/category-filter-engine.js";

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

  return { ul, items };
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
