import { describe, expect, test } from "bun:test";
import {
  applyFiltersAndSort,
  itemMatchesFilters,
} from "#public/ui/category-filter-engine.js";
import { loadDOM } from "#utils/lazy-dom.js";

const DEFAULT_SPECS = [
  { title: "Cherry", price: 30, filters: { colour: "red" } },
  { title: "Apple", price: 10, filters: { colour: "green" } },
  { title: "Banana", price: 20, filters: { colour: "yellow" } },
];

const createDOMItems = async (specs = DEFAULT_SPECS) => {
  const { window } = await loadDOM();
  const ul = window.document.createElement("ul");
  window.document.body.appendChild(ul);

  const items = specs.map((spec, index) => {
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

describe("applyFiltersAndSort filtering", () => {
  test("hides non-matching items and shows matching ones", async () => {
    const { ul, items } = await createDOMItems();

    applyFiltersAndSort(items, ul, { colour: "red" }, "default");

    expectVisibility(items, [0]);
  });

  test("shows all items when filters are empty", async () => {
    const { ul, items } = await createDOMItems();

    const count = applyFiltersAndSort(items, ul, {}, "default");

    expect(count).toBe(3);
    for (const item of items) {
      expect(item.element.style.display).toBe("");
    }
  });

  test("returns count of matched items", async () => {
    const { ul, items } = await createDOMItems();

    const count = applyFiltersAndSort(
      items,
      ul,
      { colour: "green" },
      "default",
    );

    expect(count).toBe(1);
  });

  test("rejects items when filter key does not exist", async () => {
    const { ul, items } = await createDOMItems();

    const count = applyFiltersAndSort(
      items,
      ul,
      { weight: "heavy" },
      "default",
    );

    expect(count).toBe(0);
  });

  test("applies AND logic across multiple filter keys", async () => {
    const { ul, items } = await createDOMItems([
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

describe("applyFiltersAndSort sorting", () => {
  test("reorders DOM children by name ascending", async () => {
    const { ul, items } = await createDOMItems();

    applyFiltersAndSort(items, ul, {}, "name-asc");

    expect(getChildTexts(ul)).toEqual(["Apple", "Banana", "Cherry"]);
  });

  test("reorders DOM children by name descending", async () => {
    const { ul, items } = await createDOMItems();

    applyFiltersAndSort(items, ul, {}, "name-desc");

    expect(getChildTexts(ul)).toEqual(["Cherry", "Banana", "Apple"]);
  });

  test("reorders DOM children by price ascending", async () => {
    const { ul, items } = await createDOMItems();

    applyFiltersAndSort(items, ul, {}, "price-asc");

    expect(getChildTexts(ul)).toEqual(["Apple", "Banana", "Cherry"]);
  });

  test("reorders DOM children by price descending", async () => {
    const { ul, items } = await createDOMItems();

    applyFiltersAndSort(items, ul, {}, "price-desc");

    expect(getChildTexts(ul)).toEqual(["Cherry", "Banana", "Apple"]);
  });

  test("restores original order with default sort after reorder", async () => {
    const { ul, items } = await createDOMItems();

    applyFiltersAndSort(items, ul, {}, "name-asc");
    applyFiltersAndSort(items, ul, {}, "default");

    expect(getChildTexts(ul)).toEqual(["Cherry", "Apple", "Banana"]);
  });

  test("falls back to default sort for unknown sort key", async () => {
    const { ul, items } = await createDOMItems();

    applyFiltersAndSort(items, ul, {}, "nonexistent");

    expect(getChildTexts(ul)).toEqual(["Cherry", "Apple", "Banana"]);
  });
});

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
