import { describe, expect, test } from "bun:test";
import {
  applyFiltersAndSort,
  itemMatchesFilters,
} from "#public/ui/category-filter-engine.js";
import { updateOptionVisibility } from "#public/ui/category-filter-ui.js";
import {
  buildFilterHash,
  parseFiltersFromHash,
} from "#public/ui/category-filter-url.js";
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

  return { ul, items, window };
};

const getChildTexts = (ul) => [...ul.children].map((li) => li.textContent);

const expectVisibility = (items, visibleIndices) => {
  for (const [i, item] of items.entries()) {
    const expected = visibleIndices.includes(i) ? "" : "none";
    expect(item.element.style.display).toBe(expected);
  }
};

const makeColourSizeItems = (...specs) =>
  specs.map(([colour, size]) => ({ data: { filters: { colour, size } } }));

const runVisibility = async (items, activeFilters, groupsDef) => {
  const { window } = await loadDOM();
  const container = window.document.createElement("div");
  const groupsUl = window.document.createElement("ul");
  groupsUl.className = "filter-groups";
  container.appendChild(groupsUl);
  for (const [key, values] of Object.entries(groupsDef)) {
    const groupLi = window.document.createElement("li");
    for (const value of values) {
      const optionLi = window.document.createElement("li");
      const link = window.document.createElement("a");
      link.dataset.filterKey = key;
      link.dataset.filterValue = value;
      optionLi.appendChild(link);
      groupLi.appendChild(optionLi);
    }
    groupsUl.appendChild(groupLi);
  }
  const matchCount = items.filter((item) =>
    itemMatchesFilters(item, activeFilters),
  ).length;
  updateOptionVisibility(container, items, activeFilters, matchCount);
  return (key, value) => {
    const link = container.querySelector(
      `[data-filter-key="${key}"][data-filter-value="${value}"]`,
    );
    return link.closest("li").style.display !== "none";
  };
};

const COLOUR_SIZE_GROUPS = {
  colour: ["red", "blue", "green"],
  size: ["large", "small"],
  weight: ["heavy"],
};

// ============================================
// Filtering (AND logic)
// ============================================

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

// ============================================
// Sorting (DOM reorder)
// ============================================

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
// updateOptionVisibility - exercises production DOM walker & feasibility logic
// ============================================

describe("updateOptionVisibility", () => {
  const items = makeColourSizeItems(
    ["red", "large"],
    ["red", "small"],
    ["blue", "large"],
    ["blue", "small"],
  );

  test("hides option whose hypothetical match count is 0", async () => {
    const isVisible = await runVisibility(
      items,
      { colour: "red" },
      COLOUR_SIZE_GROUPS,
    );
    expect(isVisible("weight", "heavy")).toBe(false);
  });

  test("shows cross-group option that narrows the unfiltered set", async () => {
    const isVisible = await runVisibility(items, {}, COLOUR_SIZE_GROUPS);
    expect(isVisible("size", "large")).toBe(true);
  });

  test("shows same-group replacement even when hypothetical count matches current", async () => {
    const isVisible = await runVisibility(
      items,
      { colour: "red" },
      COLOUR_SIZE_GROUPS,
    );
    expect(isVisible("colour", "blue")).toBe(true);
  });

  test("shows cross-group option that narrows the currently matched set", async () => {
    const isVisible = await runVisibility(
      items,
      { colour: "red" },
      COLOUR_SIZE_GROUPS,
    );
    expect(isVisible("size", "large")).toBe(true);
  });

  test("always shows the currently active option", async () => {
    const isVisible = await runVisibility(
      items,
      { colour: "red" },
      COLOUR_SIZE_GROUPS,
    );
    expect(isVisible("colour", "red")).toBe(true);
  });

  test("hides cross-group option that does not narrow the unfiltered set", async () => {
    const uniform = makeColourSizeItems(
      ["red", "large"],
      ["blue", "large"],
      ["green", "large"],
    );
    const isVisible = await runVisibility(uniform, {}, COLOUR_SIZE_GROUPS);
    expect(isVisible("size", "large")).toBe(false);
  });
});

// ============================================
// URL helpers
// ============================================

describe("buildFilterHash", () => {
  test("builds hash with filters", () => {
    const hash = buildFilterHash({ colour: "red" }, "default");
    expect(hash).toBe("#colour/red");
  });

  test("builds hash with multiple filters in alphabetical key order", () => {
    const hash = buildFilterHash({ size: "large", colour: "red" }, "default");
    expect(hash).toBe("#colour/red/size/large");
  });

  test("builds hash with sort key only", () => {
    const hash = buildFilterHash({}, "price-asc");
    expect(hash).toBe("#price-asc");
  });

  test("builds hash with filters and sort key", () => {
    const hash = buildFilterHash({ colour: "red" }, "name-desc");
    expect(hash).toBe("#colour/red/name-desc");
  });

  test("returns empty string when no filters and default sort", () => {
    const hash = buildFilterHash({}, "default");
    expect(hash).toBe("");
  });

  test("encodes special characters in filter keys and values", () => {
    const hash = buildFilterHash({ "pet-friendly": "yes" }, "default");
    expect(hash).toBe("#pet-friendly/yes");
  });
});

describe("parseFiltersFromHash", () => {
  test("parses filters from hash", () => {
    const result = parseFiltersFromHash("#colour/red");
    expect(result).toEqual({ filters: { colour: "red" }, sortKey: "default" });
  });

  test("parses multiple filters from hash", () => {
    const result = parseFiltersFromHash("#colour/red/size/large");
    expect(result).toEqual({
      filters: { colour: "red", size: "large" },
      sortKey: "default",
    });
  });

  test("parses sort key from hash", () => {
    const result = parseFiltersFromHash("#price-asc");
    expect(result).toEqual({ filters: {}, sortKey: "price-asc" });
  });

  test("parses filters and sort key together", () => {
    const result = parseFiltersFromHash("#colour/red/name-desc");
    expect(result).toEqual({
      filters: { colour: "red" },
      sortKey: "name-desc",
    });
  });

  test("returns empty state for empty hash", () => {
    const result = parseFiltersFromHash("");
    expect(result).toEqual({ filters: {}, sortKey: "default" });
  });

  test("returns empty state for bare hash", () => {
    const result = parseFiltersFromHash("#");
    expect(result).toEqual({ filters: {}, sortKey: "default" });
  });

  test("decodes URI-encoded keys and values", () => {
    const result = parseFiltersFromHash("#pet-friendly/yes");
    expect(result).toEqual({
      filters: { "pet-friendly": "yes" },
      sortKey: "default",
    });
  });

  test("round-trips with buildFilterHash", () => {
    const filters = { colour: "red", size: "large" };
    const sortKey = "price-asc";
    const hash = buildFilterHash(filters, sortKey);
    const parsed = parseFiltersFromHash(hash);
    expect(parsed).toEqual({ filters, sortKey });
  });

  test("handles encoded special characters round-trip", () => {
    const filters = { "pet-friendly": "yes" };
    const hash = buildFilterHash(filters, "default");
    const parsed = parseFiltersFromHash(hash);
    expect(parsed.filters).toEqual(filters);
  });
});
