import { describe, expect, test } from "bun:test";
import { generateFilterCombinations } from "#filters/filter-combinations.js";
import {
  buildDisplayLookup,
  getAllFilterAttributes,
  SORT_OPTIONS,
} from "#filters/filter-core.js";
import { buildFilterUIData } from "#filters/filter-ui.js";
import { computeFilterBase } from "#filters/item-filters.js";
import {
  item as baseItem,
  collectionApi,
  expectObjectProps,
} from "#test/test-utils.js";
import { map, pipe, reduce } from "#toolkit/fp/array.js";

// ============================================
// Functional Test Fixture Builders
// ============================================

/**
 * Create a filter attribute { name, value }
 */
const filterAttr = (name, value) => ({ name, value });

/**
 * Create an item with filter_attributes using rest params syntax.
 * Wraps the shared baseItem for filter-specific convenience.
 *
 * @param {string|null} title - Item title (null for no title)
 * @param {...Object} attrs - Filter attributes created with filterAttr()
 */
const filterItem = (title, ...attrs) =>
  baseItem(title, attrs.length > 0 ? { filter_attributes: attrs } : {});

/**
 * Create items from an array of [title, ...attrs] tuples
 * Curried for use with pipe
 */
const filterItems = map(([title, ...attrs]) => filterItem(title, ...attrs));

/**
 * Create validPages array from path strings
 */
const pages = map((path) => ({ path }));

/**
 * Build filterData { attributes, displayLookup } from a definition object
 * Definition format: { attrName: { display: "Display Name", values: { slug: "Display" } } }
 */
const filterData = (definition) =>
  pipe(
    Object.entries,
    reduce(
      (acc, [attrKey, { display, values }]) => ({
        attributes: {
          ...acc.attributes,
          [attrKey]: Object.keys(values),
        },
        displayLookup: {
          ...acc.displayLookup,
          [attrKey]: display,
          ...values,
        },
      }),
      { attributes: {}, displayLookup: {} },
    ),
  )(definition);

/** Common type/size filter data used across multiple tests */
const typeSizeData = () =>
  filterData({
    type: { display: "Type", values: { cottage: "Cottage" } },
    size: { display: "Size", values: { small: "Small" } },
  });

/** Common item with Pet Friendly and Type attributes */
const petTypeItem = (petValue = "Yes", typeValue = "Cottage") =>
  filterItem(
    "Test Item",
    filterAttr("Pet Friendly", petValue),
    filterAttr("Type", typeValue),
  );

/** Common items for filter testing */
const testPropertyItems = () =>
  filterItems([
    [
      "Beach Cottage",
      filterAttr("Pet Friendly", "Yes"),
      filterAttr("Type", "Cottage"),
    ],
    [
      "City Apartment",
      filterAttr("Pet Friendly", "No"),
      filterAttr("Type", "Apartment"),
    ],
    [
      "Pet Apartment",
      filterAttr("Pet Friendly", "Yes"),
      filterAttr("Type", "Apartment"),
    ],
  ]);

describe("item-filters", () => {
  describe("sort options", () => {
    const getSortOption = (key) => {
      const option = SORT_OPTIONS.find((sortOption) => sortOption.key === key);
      if (!option) {
        throw new Error(`Sort option not found: ${key}`);
      }
      return option;
    };

    test("price sort comparators handle missing prices", () => {
      const items = [
        filterItem("No Price"),
        baseItem("Low", { price: 10 }),
        baseItem("High", { price: 30 }),
      ];

      const priceAsc = [...items].sort(getSortOption("price-asc").compare);
      const priceDesc = [...items].sort(getSortOption("price-desc").compare);

      expect(priceAsc.map((item) => item.data.title)).toEqual([
        "Low",
        "High",
        "No Price",
      ]);
      expect(priceDesc.map((item) => item.data.title)).toEqual([
        "High",
        "Low",
        "No Price",
      ]);
    });

    test("name sort comparators are case-insensitive", () => {
      const items = [
        filterItem("zebra"),
        filterItem("Alpha"),
        filterItem("middle"),
      ];

      const nameAsc = [...items].sort(getSortOption("name-asc").compare);
      const nameDesc = [...items].sort(getSortOption("name-desc").compare);

      expect(nameAsc.map((item) => item.data.title)).toEqual([
        "Alpha",
        "middle",
        "zebra",
      ]);
      expect(nameDesc.map((item) => item.data.title)).toEqual([
        "zebra",
        "middle",
        "Alpha",
      ]);
    });
  });

  // ============================================
  // Attributes tests
  // (covers: getAllFilterAttributes, buildDisplayLookup)
  // ============================================

  describe("attributes", () => {
    test("returns attributes and display lookup structure", () => {
      const testItems = [
        filterItem("Test Item", filterAttr("Pet Friendly", "Yes")),
      ];

      const attrs = getAllFilterAttributes(testItems);
      const lookup = buildDisplayLookup(testItems);

      expect(Object.keys(attrs).length > 0).toBe(true);
      expect(Object.keys(lookup).length > 0).toBe(true);
    });

    test("converts attribute names and values to slugified keys", () => {
      const testItems = [
        filterItem(
          "Test Item",
          filterAttr("Pet Friendly", "Yes"),
          filterAttr("Beach Access", "Private Beach"),
        ),
      ];

      const attrs = getAllFilterAttributes(testItems);

      expect(attrs["pet-friendly"]).toEqual(["yes"]);
      expect(attrs["beach-access"]).toEqual(["private-beach"]);
    });

    test("builds display lookup from slugified keys to original values", () => {
      const testItems = [
        filterItem(
          "Test Item",
          filterAttr("Pet Friendly", "Yes"),
          filterAttr("Type", "Cottage"),
        ),
      ];

      const lookup = buildDisplayLookup(testItems);

      expectObjectProps({
        "pet-friendly": "Pet Friendly",
        yes: "Yes",
        type: "Type",
        cottage: "Cottage",
      })(lookup);
    });

    test("first capitalization wins for duplicate keys in display lookup", () => {
      const testItems = [
        filterItem("Item A", filterAttr("Pet Friendly", "YES")),
        filterItem("Item B", filterAttr("pet friendly", "yes")),
      ];

      const lookup = buildDisplayLookup(testItems);

      expectObjectProps({
        "pet-friendly": "Pet Friendly",
        yes: "YES",
      })(lookup);
    });

    test("handles items without filter_attributes", () => {
      const testItems = [
        filterItem("No filters"),
        filterItem("Has filters", filterAttr("Size", "Large")),
      ];

      const lookup = buildDisplayLookup(testItems);

      expectObjectProps({
        size: "Size",
        large: "Large",
      })(lookup);
    });

    test("collects all unique filter values across items", () => {
      const testItems = [
        filterItem(
          "Cottage",
          filterAttr("Type", "Cottage"),
          filterAttr("Bedrooms", "2"),
        ),
        filterItem(
          "Apartment",
          filterAttr("Type", "Apartment"),
          filterAttr("Bedrooms", "3"),
        ),
      ];

      const attrs = getAllFilterAttributes(testItems);

      expect(attrs.bedrooms).toEqual(["2", "3"]);
      expect(attrs.type).toEqual(["apartment", "cottage"]);
    });

    test("handles whitespace in attribute names and values via slugify", () => {
      const testItems = [
        filterItem("Test Item", filterAttr("  Size  ", "  Large  ")),
      ];

      const attrs = getAllFilterAttributes(testItems);
      const lookup = buildDisplayLookup(testItems);

      // slugify converts "  Size  " to "size" but displayLookup keeps original
      expect(attrs.size).toEqual(["large"]);
      expect(lookup.size).toBe("  Size  ");
    });
  });

  // ============================================
  // Combinations tests
  // (covers: generateFilterCombinations)
  // ============================================

  describe("combinations", () => {
    test("returns filter combinations with paths and counts", () => {
      const testItems = filterItems([
        ["Item 1", filterAttr("Type", "A")],
        ["Item 2", filterAttr("Type", "B")],
      ]);

      const combos = generateFilterCombinations(testItems);

      expect(combos.length >= 2).toBe(true);
      expect(combos[0].path !== undefined).toBe(true);
      expect(combos[0].filters !== undefined).toBe(true);
      expect(combos[0].count !== undefined).toBe(true);
    });

    test("generates paths for single filter values", () => {
      const testItems = [
        filterItem("Test Item", filterAttr("Type", "Cottage")),
      ];

      const combos = generateFilterCombinations(testItems);
      const paths = combos.map((c) => c.path);

      expect(paths.includes("type/cottage")).toBe(true);
    });

    test("generates alphabetically sorted paths for multiple filters", () => {
      const combos = generateFilterCombinations([petTypeItem()]);
      const paths = combos.map((c) => c.path);

      // Keys should be sorted: pet-friendly comes before type
      expect(paths.includes("pet-friendly/yes")).toBe(true);
      expect(paths.includes("type/cottage")).toBe(true);
      expect(paths.includes("pet-friendly/yes/type/cottage")).toBe(true);
    });

    test("filter paths use dashes instead of %20 for spaces", () => {
      const combos = generateFilterCombinations([
        petTypeItem("Yes", "Apartment"),
      ]);
      const combinedPath = combos.find(
        (c) => c.path.includes("pet-friendly") && c.path.includes("type"),
      );

      expect(combinedPath.path.includes("%20")).toBe(false);
      expect(combinedPath.path).toBe("pet-friendly/yes/type/apartment");
    });

    test("returns empty array when items have no filter attributes", () => {
      const testItems = [filterItem("No attrs")];

      const combos = generateFilterCombinations(testItems);

      expect(combos).toEqual([]);
    });

    test("only generates combinations with matching items", () => {
      // Two items with different types - no item has both values
      const testItems = filterItems([
        ["A Only", filterAttr("Type", "A")],
        ["B Only", filterAttr("Type", "B")],
      ]);

      const combos = generateFilterCombinations(testItems);
      const paths = combos.map((c) => c.path);

      expect(paths.includes("type/a")).toBe(true);
      expect(paths.includes("type/b")).toBe(true);
    });

    test("returns correct count for each combination", () => {
      const testItems = filterItems([
        ["Item 1", filterAttr("Type", "A")],
        ["Item 2", filterAttr("Type", "A")],
        ["Item 3", filterAttr("Type", "B")],
      ]);

      const combos = generateFilterCombinations(testItems);
      const typeA = combos.find((c) => c.path === "type/a");
      const typeB = combos.find((c) => c.path === "type/b");

      expect(typeA.count).toBe(2);
      expect(typeB.count).toBe(1);
    });

    test("case-insensitive matching via normalization", () => {
      const testItems = filterItems([
        ["Item 1", filterAttr("Type", "COTTAGE")],
        ["Item 2", filterAttr("Type", "cottage")],
        ["Item 3", filterAttr("Type", "Cottage")],
      ]);

      const combos = generateFilterCombinations(testItems);

      // All items grouped under one path (type/cottage)
      expect(combos.length).toBe(1);
      const basePage = combos.find((c) => c.path === "type/cottage");
      expect(basePage.count).toBe(3);
    });
  });

  // ============================================
  // UI data tests
  // (covers: buildFilterUIData with hash URLs)
  // ============================================

  describe("UI data", () => {
    /** Shared size filter fixture */
    const sizeData = () =>
      filterData({
        size: { display: "Size", values: { small: "Small", large: "Large" } },
      });
    const sizePages = () => pages(["size/small", "size/large"]);

    test("returns hasFilters false when no filter attributes exist", () => {
      const data = filterData({});

      const result = buildFilterUIData(data, {}, [], "/test");

      expect(result.hasFilters).toBe(false);
    });

    test("builds complete UI data structure with hash URLs", () => {
      const data = filterData({
        type: {
          display: "Type",
          values: { cottage: "Cottage", apartment: "Apartment" },
        },
        size: { display: "Size", values: { small: "Small", large: "Large" } },
      });
      const validPages = pages([
        "type/cottage",
        "type/apartment",
        "size/small",
        "size/large",
        "size/small/type/cottage",
      ]);

      const result = buildFilterUIData(data, {}, validPages, "/test");

      expect(result.hasFilters).toBe(true);
      expect(result.hasActiveFilters).toBe(false);
      expect(result.activeFilters).toEqual([]);
      expect(result.clearAllUrl).toBe("/test");
      // 3 groups: sort + size + type
      expect(result.groups.length).toBe(3);
      expect(result.groups[0].name).toBe("sort");
      expect(result.groups[0].options.length).toBe(5);
      // Filter options use hash URLs
      const sizeGroup = result.groups.find((g) => g.name === "size");
      expect(sizeGroup.options[0].url).toBe("/test#size/small");
    });

    test("includes active filters with remove URLs and marks active options", () => {
      const result = buildFilterUIData(
        sizeData(),
        { size: "small" },
        sizePages(),
        "/test",
      );

      // Active filter shown with remove URL
      expect(result.hasActiveFilters).toBe(true);
      expect(result.activeFilters.length).toBe(1);
      expect(result.activeFilters[0].key).toBe("Size");
      expect(result.activeFilters[0].value).toBe("Small");
      expect(result.activeFilters[0].removeUrl).toBe("/test");

      // Active option marked in filter groups
      const sizeGroup = result.groups.find((g) => g.name === "size");
      expect(sizeGroup.options.find((o) => o.value === "Small").active).toBe(
        true,
      );
      expect(sizeGroup.options.find((o) => o.value === "Large").active).toBe(
        false,
      );
    });

    test("only includes options that lead to valid pages", () => {
      const data = filterData({
        type: {
          display: "Type",
          values: {
            cottage: "Cottage",
            apartment: "Apartment",
            villa: "Villa",
          },
        },
      });
      const validPages = pages(["type/cottage", "type/apartment"]);
      const result = buildFilterUIData(data, {}, validPages, "/test");

      // groups[0] is sort (always 5 options), groups[1] is type
      const typeGroup = result.groups.find((g) => g.name === "type");
      expect(typeGroup.options.length).toBe(2);
      const optionValues = typeGroup.options.map((o) => o.value);
      expect(optionValues.includes("Cottage")).toBe(true);
      expect(optionValues.includes("Apartment")).toBe(true);
      expect(optionValues.includes("Villa")).toBe(false);
    });

    test("excludes groups with no valid options", () => {
      const data = typeSizeData();
      // Only type/cottage is valid, size/small is not
      const validPages = pages(["type/cottage"]);

      const result = buildFilterUIData(data, {}, validPages, "/test");

      // sort is shown (count defaults to 2), but type is hidden (only 1 option)
      // size is excluded (no valid options)
      expect(result.groups.length).toBe(1);
      expect(result.groups[0].name).toBe("sort");
    });

    test("shows filter groups with multiple valid options", () => {
      const data = filterData({
        type: {
          display: "Type",
          values: { cottage: "Cottage", villa: "Villa" },
        },
      });
      const validPages = pages(["type/cottage", "type/villa"]);

      const result = buildFilterUIData(data, {}, validPages, "/test");

      // sort + type (type has 2 options)
      expect(result.groups.length).toBe(2);
      expect(result.groups[0].name).toBe("sort");
      expect(result.groups[1].name).toBe("type");
    });

    test("remove URL for active filter keeps other filters as hash", () => {
      const data = typeSizeData();
      const currentFilters = { type: "cottage", size: "small" };
      const validPages = pages([
        "type/cottage",
        "size/small",
        "size/small/type/cottage",
      ]);

      const result = buildFilterUIData(
        data,
        currentFilters,
        validPages,
        "/test",
      );

      expect(result.activeFilters.length).toBe(2);

      const typeFilter = result.activeFilters.find((f) => f.key === "Type");
      const sizeFilter = result.activeFilters.find((f) => f.key === "Size");

      expect(typeFilter.removeUrl).toBe("/test#size/small");
      expect(sizeFilter.removeUrl).toBe("/test#type/cottage");
    });
  });

  // ============================================
  // computeFilterBase tests
  // ============================================

  describe("computeFilterBase", () => {
    /** Two widgets with different sizes - enough to show filters */
    const twoWidgets = () => [
      filterItem("Widget A", filterAttr("Size", "Large")),
      filterItem("Widget B", filterAttr("Size", "Small")),
    ];

    test("returns complete structure with listing filter UI", () => {
      const result = computeFilterBase(
        collectionApi(twoWidgets()),
        "test",
        "/test",
      );

      expect(result.items).toBeDefined();
      expect(result.baseCombinations).toBeDefined();
      expect(result.filterData).toBeDefined();
      expect(result.listingFilterUI.hasFilters).toBe(true);
      expect(result.listingFilterUI.hasActiveFilters).toBe(false);
      expect(result.listingFilterUI.groups.length).toBeGreaterThan(0);
    });

    test("hides filters when only 1 item", () => {
      const result = computeFilterBase(
        collectionApi([filterItem("Widget", filterAttr("Size", "Large"))]),
        "test",
        "/test",
      );

      // With only 1 item and 1 filter option, filters are hidden
      expect(result.listingFilterUI.hasFilters).toBe(false);
    });

    test("full flow: items → attributes → combinations → UI data", () => {
      // Use first two items from testPropertyItems (Beach Cottage, City Apartment)
      const testItems = testPropertyItems().slice(0, 2);

      const result = computeFilterBase(
        collectionApi(testItems),
        "test",
        "/test",
      );

      // Get attributes
      expect(result.filterData.attributes["pet-friendly"]).toEqual([
        "no",
        "yes",
      ]);
      expect(result.filterData.attributes.type).toEqual([
        "apartment",
        "cottage",
      ]);

      // Combinations generated
      expect(result.baseCombinations.length).toBeGreaterThan(0);

      // UI data built
      expect(result.listingFilterUI.hasFilters).toBe(true);
    });
  });
});
