import { describe, expect, test } from "bun:test";
import { createFilterConfig } from "#filters/item-filters.js";
import {
  item as baseItem,
  collectionApi,
  expectObjectProps,
  expectResultTitles,
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
    null,
    filterAttr("Pet Friendly", petValue),
    filterAttr("Type", typeValue),
  );

/** Common property-style items for filter testing */
const propertyItems = () =>
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

/**
 * Create a mock Eleventy config that captures addCollection/addFilter calls
 */
const mockConfig = () => {
  const collections = [];
  const filters = [];
  return {
    addCollection: (name, fn) => collections.push({ name, fn }),
    addFilter: (name, fn) => filters.push({ name, fn }),
    getCollections: () => collections,
    getFilters: () => filters,
    getCollection: (name) => collections.find((c) => c.name === name)?.fn,
    getFilter: (name) => filters.find((f) => f.name === name)?.fn,
  };
};

/**
 * Create standard test filter config
 */
const testFilterConfig = (overrides = {}) =>
  createFilterConfig({
    tag: "test",
    permalinkDir: "test",
    itemsKey: "testItems",
    collections: {
      pages: "testFilterPages",
      redirects: "testRedirects",
      attributes: "testAttributes",
    },
    uiDataFilterName: "testFilterUIData",
    ...overrides,
  });

/**
 * Helper to set up config and get collection/filter accessors
 */
const setupConfig = (overrides = {}) => {
  const mock = mockConfig();
  const config = testFilterConfig(overrides);
  config.configure(mock);
  return {
    mock,
    getPages: (testItems) =>
      mock.getCollection("testFilterPages")(collectionApi(testItems)),
    getRedirects: (testItems) =>
      mock.getCollection("testRedirects")(collectionApi(testItems)),
    getAttributes: (testItems) =>
      mock.getCollection("testAttributes")(collectionApi(testItems)),
    getUIData: mock.getFilter("testFilterUIData"),
  };
};

describe("item-filters", () => {
  // ============================================
  // createFilterConfig basic tests
  // ============================================

  describe("createFilterConfig", () => {
    test("returns an object with configure function", () => {
      const config = testFilterConfig();
      expect(typeof config.configure).toBe("function");
    });

    test("configure adds all required collections and filter", () => {
      const mock = mockConfig();
      testFilterConfig().configure(mock);

      expect(mock.getCollections().length).toBe(4);
      expect(mock.getFilters().length).toBe(1);

      const collectionNames = mock.getCollections().map((c) => c.name);
      expect(collectionNames.includes("testFilterPages")).toBe(true);
      expect(collectionNames.includes("testRedirects")).toBe(true);
      expect(collectionNames.includes("testAttributes")).toBe(true);
      expect(collectionNames.includes("testFilterPagesListingFilterUI")).toBe(
        true,
      );
    });
  });

  // ============================================
  // Attributes collection tests
  // (covers: parseFilterAttributes, buildDisplayLookup, getAllFilterAttributes)
  // ============================================

  describe("attributes collection", () => {
    test("returns attributes and display lookup structure", () => {
      const { getAttributes } = setupConfig();
      const testItems = [filterItem(null, filterAttr("Pet Friendly", "Yes"))];

      const attrs = getAttributes(testItems);

      expect(attrs.attributes !== undefined).toBe(true);
      expect(attrs.displayLookup !== undefined).toBe(true);
    });

    test("converts attribute names and values to slugified keys", () => {
      const { getAttributes } = setupConfig();
      const testItems = [
        filterItem(
          null,
          filterAttr("Pet Friendly", "Yes"),
          filterAttr("Beach Access", "Private Beach"),
        ),
      ];

      const attrs = getAttributes(testItems);

      expect(attrs.attributes["pet-friendly"]).toEqual(["yes"]);
      expect(attrs.attributes["beach-access"]).toEqual(["private-beach"]);
    });

    test("builds display lookup from slugified keys to original values", () => {
      const { getAttributes } = setupConfig();
      const testItems = [
        filterItem(
          null,
          filterAttr("Pet Friendly", "Yes"),
          filterAttr("Type", "Cottage"),
        ),
      ];

      const attrs = getAttributes(testItems);

      expectObjectProps({
        "pet-friendly": "Pet Friendly",
        yes: "Yes",
        type: "Type",
        cottage: "Cottage",
      })(attrs.displayLookup);
    });

    test("first capitalization wins for duplicate keys in display lookup", () => {
      const { getAttributes } = setupConfig();
      const testItems = [
        filterItem(null, filterAttr("Pet Friendly", "YES")),
        filterItem(null, filterAttr("pet friendly", "yes")),
      ];

      const attrs = getAttributes(testItems);

      expectObjectProps({
        "pet-friendly": "Pet Friendly",
        yes: "YES",
      })(attrs.displayLookup);
    });

    test("handles items without filter_attributes", () => {
      const { getAttributes } = setupConfig();
      const testItems = [
        filterItem("No filters"),
        filterItem(null, filterAttr("Size", "Large")),
      ];

      const attrs = getAttributes(testItems);

      expectObjectProps({
        size: "Size",
        large: "Large",
      })(attrs.displayLookup);
    });

    test("collects all unique filter values across items", () => {
      const { getAttributes } = setupConfig();
      const testItems = [
        filterItem(
          null,
          filterAttr("Type", "Cottage"),
          filterAttr("Bedrooms", "2"),
        ),
        filterItem(
          null,
          filterAttr("Type", "Apartment"),
          filterAttr("Bedrooms", "3"),
        ),
      ];

      const attrs = getAttributes(testItems);

      expect(attrs.attributes.bedrooms).toEqual(["2", "3"]);
      expect(attrs.attributes.type).toEqual(["apartment", "cottage"]);
    });

    test("handles whitespace in attribute names and values via slugify", () => {
      const { getAttributes } = setupConfig();
      const testItems = [filterItem(null, filterAttr("  Size  ", "  Large  "))];

      const attrs = getAttributes(testItems);

      // slugify converts "  Size  " to "size" but displayLookup keeps original
      expect(attrs.attributes.size).toEqual(["large"]);
      expect(attrs.displayLookup.size).toBe("  Size  ");
    });
  });

  // ============================================
  // Pages collection tests
  // (covers: generateFilterCombinations, filterToPath, getItemsByFilters, buildFilterDescription)
  // ============================================

  describe("pages collection", () => {
    test("returns filter combinations with items", () => {
      const { getPages } = setupConfig();
      const testItems = filterItems([
        ["Item 1", filterAttr("Type", "A")],
        ["Item 2", filterAttr("Type", "B")],
      ]);

      const pagesResult = getPages(testItems);

      expect(pagesResult.length >= 2).toBe(true);
      expect(pagesResult[0].path !== undefined).toBe(true);
      expect(pagesResult[0].filters !== undefined).toBe(true);
      expect(pagesResult[0].testItems !== undefined).toBe(true);
      expect(pagesResult[0].filterDescription !== undefined).toBe(true);
    });

    test("generates paths for single filter values", () => {
      const { getPages } = setupConfig();
      const testItems = [filterItem(null, filterAttr("Type", "Cottage"))];

      const pagesResult = getPages(testItems);
      const paths = pagesResult.map((p) => p.path);

      expect(paths.includes("type/cottage")).toBe(true);
    });

    test("generates alphabetically sorted paths for multiple filters", () => {
      const { getPages } = setupConfig();
      const pagesResult = getPages([petTypeItem()]);
      const paths = pagesResult.map((p) => p.path);

      // Keys should be sorted: pet-friendly comes before type
      expect(paths.includes("pet-friendly/yes")).toBe(true);
      expect(paths.includes("type/cottage")).toBe(true);
      expect(paths.includes("pet-friendly/yes/type/cottage")).toBe(true);
    });

    test("filter URLs use dashes instead of %20 for spaces", () => {
      const { getPages } = setupConfig();
      const pagesResult = getPages([petTypeItem("Yes", "Apartment")]);
      const combinedPath = pagesResult.find(
        (p) => p.path.includes("pet-friendly") && p.path.includes("type"),
      );

      expect(combinedPath.path.includes("%20")).toBe(false);
      expect(combinedPath.path).toBe("pet-friendly/yes/type/apartment");
    });

    test("returns empty array when items have no filter attributes", () => {
      const { getPages } = setupConfig();
      const testItems = [filterItem("No attrs")];

      const pagesResult = getPages(testItems);

      expect(pagesResult).toEqual([]);
    });

    test("includes only matching items in each filter combination", () => {
      const { getPages } = setupConfig();
      const pagesResult = getPages(propertyItems());
      const petFriendlyPage = pagesResult.find(
        (p) => p.path === "pet-friendly/yes",
      );

      expectResultTitles(petFriendlyPage.testItems, [
        "Beach Cottage",
        "Pet Apartment",
      ]);
    });

    test("includes filter description with display values", () => {
      const { getPages } = setupConfig();
      const pagesResult = getPages([petTypeItem()]);
      const combinedPage = pagesResult.find(
        (p) => p.path === "pet-friendly/yes/type/cottage",
      );

      expect(Array.isArray(combinedPage.filterDescription)).toBe(true);
      expect(combinedPage.filterDescription).toContainEqual({
        key: "Pet Friendly",
        value: "Yes",
      });
      expect(combinedPage.filterDescription).toContainEqual({
        key: "Type",
        value: "Cottage",
      });
    });

    test("only generates combinations with matching items", () => {
      const { getPages } = setupConfig();
      // Two items with different types - no item has both values
      const testItems = filterItems([
        ["A Only", filterAttr("Type", "A")],
        ["B Only", filterAttr("Type", "B")],
      ]);

      const pagesResult = getPages(testItems);
      const paths = pagesResult.map((p) => p.path);

      expect(paths.includes("type/a")).toBe(true);
      expect(paths.includes("type/b")).toBe(true);
      // No combined path since no item matches both
    });

    test("handles multiple filter criteria correctly", () => {
      const { getPages } = setupConfig();
      const testItems = filterItems([
        [
          "Match",
          filterAttr("Pet Friendly", "Yes"),
          filterAttr("Type", "Cottage"),
        ],
        [
          "No Match",
          filterAttr("Pet Friendly", "No"),
          filterAttr("Type", "Cottage"),
        ],
      ]);

      const pagesResult = getPages(testItems);
      const combinedPage = pagesResult.find(
        (p) => p.path === "pet-friendly/yes/type/cottage",
      );

      expectResultTitles(combinedPage.testItems, ["Match"]);
    });

    test("returns correct count for each combination", () => {
      const { getPages } = setupConfig();
      const testItems = filterItems([
        ["Item 1", filterAttr("Type", "A")],
        ["Item 2", filterAttr("Type", "A")],
        ["Item 3", filterAttr("Type", "B")],
      ]);

      const pagesResult = getPages(testItems);
      const typeAPage = pagesResult.find((p) => p.path === "type/a");
      const typeBPage = pagesResult.find((p) => p.path === "type/b");

      expect(typeAPage.count).toBe(2);
      expect(typeBPage.count).toBe(1);
    });
  });

  // ============================================
  // Redirects collection tests
  // ============================================

  describe("redirects collection", () => {
    test("generates redirects for partial paths", () => {
      const { getRedirects } = setupConfig({ permalinkDir: "items" });
      const testItems = [
        filterItem(null, filterAttr("Type", "A"), filterAttr("Size", "Large")),
      ];

      const redirects = getRedirects(testItems);

      expect(redirects.length > 0).toBe(true);
      expect(redirects[0].from !== undefined).toBe(true);
      expect(redirects[0].to !== undefined).toBe(true);
    });

    test("redirects point to search URLs", () => {
      const { getRedirects } = setupConfig({ permalinkDir: "items" });
      const testItems = [filterItem(null, filterAttr("Type", "A"))];

      const redirects = getRedirects(testItems);

      const hasSearchRedirect = redirects.some((r) =>
        r.from.includes("/items/search/"),
      );
      expect(hasSearchRedirect).toBe(true);
    });

    test("generates redirects for attribute keys without values", () => {
      const { getRedirects } = setupConfig({ permalinkDir: "products" });
      const testItems = [filterItem(null, filterAttr("Type", "A"))];

      const redirects = getRedirects(testItems);

      // Should redirect /products/search/type/ to /products/search/#content
      const typeRedirect = redirects.find(
        (r) => r.from === "/products/search/type/",
      );
      expect(typeRedirect).toBeDefined();
      expect(typeRedirect.to).toBe("/products/search/#content");
    });
  });

  // ============================================
  // UI data filter tests
  // (covers: buildFilterUIData)
  // ============================================

  describe("UI data filter", () => {
    test("uses correct baseUrl from permalinkDir", () => {
      const mock = mockConfig();
      const config = testFilterConfig({
        permalinkDir: "my-items",
        uiDataFilterName: "testUI",
      });
      config.configure(mock);

      const data = filterData({
        type: { display: "Type", values: { a: "A" } },
      });
      const validPages = pages(["type/a"]);

      const result = mock.getFilter("testUI")(data, null, validPages);

      expect(result.clearAllUrl).toBe("/my-items/#content");
    });

    test("returns hasFilters false when no filter attributes exist", () => {
      const { getUIData } = setupConfig();
      const data = filterData({});

      const result = getUIData(data, null, []);

      expect(result.hasFilters).toBe(false);
    });

    test("builds complete UI data structure with filter groups", () => {
      const { getUIData } = setupConfig();
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

      const result = getUIData(data, null, validPages);

      expect(result.hasFilters).toBe(true);
      expect(result.hasActiveFilters).toBe(false);
      expect(result.activeFilters).toEqual([]);
      expect(result.clearAllUrl).toBe("/test/#content");
      expect(result.groups.length).toBe(2);
    });

    test("includes active filters with remove URLs and marks active options", () => {
      const { getUIData } = setupConfig();
      const data = filterData({
        size: { display: "Size", values: { small: "Small", large: "Large" } },
      });
      const validPages = pages(["size/small", "size/large"]);
      const result = getUIData(data, { size: "small" }, validPages);

      // Active filter shown with remove URL
      expect(result.hasActiveFilters).toBe(true);
      expect(result.activeFilters.length).toBe(1);
      expect(result.activeFilters[0].key).toBe("Size");
      expect(result.activeFilters[0].value).toBe("Small");
      expect(result.activeFilters[0].removeUrl).toBe("/test/#content");

      // Active option marked in filter groups
      const sizeGroup = result.groups[0];
      const smallOption = sizeGroup.options.find((o) => o.value === "Small");
      const largeOption = sizeGroup.options.find((o) => o.value === "Large");
      expect(smallOption.active).toBe(true);
      expect(largeOption.active).toBe(false);
    });

    test("only includes options that lead to valid pages", () => {
      const { getUIData } = setupConfig();
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
      const result = getUIData(data, null, validPages);

      expect(result.groups[0].options.length).toBe(2);
      const optionValues = result.groups[0].options.map((o) => o.value);
      expect(optionValues.includes("Cottage")).toBe(true);
      expect(optionValues.includes("Apartment")).toBe(true);
      expect(optionValues.includes("Villa")).toBe(false);
    });

    test("excludes groups with no valid options", () => {
      const { getUIData } = setupConfig();
      const data = typeSizeData();
      // Only type/cottage is valid, size/small is not
      const validPages = pages(["type/cottage"]);

      const result = getUIData(data, null, validPages);

      expect(result.groups.length).toBe(1);
      expect(result.groups[0].name).toBe("type");
    });

    test("remove URL for active filter keeps other filters", () => {
      const { getUIData } = setupConfig();
      const data = typeSizeData();
      const currentFilters = { type: "cottage", size: "small" };
      const validPages = pages([
        "type/cottage",
        "size/small",
        "size/small/type/cottage",
      ]);

      const result = getUIData(data, currentFilters, validPages);

      expect(result.activeFilters.length).toBe(2);

      const typeFilter = result.activeFilters.find((f) => f.key === "Type");
      const sizeFilter = result.activeFilters.find((f) => f.key === "Size");

      expect(typeFilter.removeUrl).toBe("/test/search/size/small/#content");
      expect(sizeFilter.removeUrl).toBe("/test/search/type/cottage/#content");
    });
  });

  // ============================================
  // Integration tests
  // ============================================

  describe("integration", () => {
    test("full flow: items → attributes → pages → UI data", () => {
      const { getAttributes, getPages, getUIData } = setupConfig({
        permalinkDir: "properties",
      });
      // Use first two items from propertyItems (Beach Cottage, City Apartment)
      const testItems = propertyItems().slice(0, 2);

      // Get attributes
      const attrs = getAttributes(testItems);
      expect(attrs.attributes["pet-friendly"]).toEqual(["no", "yes"]);
      expect(attrs.attributes.type).toEqual(["apartment", "cottage"]);

      // Get pages
      const pagesResult = getPages(testItems);
      expect(pagesResult.length > 0).toBe(true);

      // Build UI data using the attributes and pages
      const validPages = pagesResult.map((p) => ({ path: p.path }));
      const uiData = getUIData(attrs, { type: "cottage" }, validPages);

      expect(uiData.hasFilters).toBe(true);
      expect(uiData.hasActiveFilters).toBe(true);
    });

    test("case-insensitive matching via normalization", () => {
      const { getPages } = setupConfig();
      // Items with different casings that should match
      const testItems = filterItems([
        ["Item 1", filterAttr("Type", "COTTAGE")],
        ["Item 2", filterAttr("Type", "cottage")],
        ["Item 3", filterAttr("Type", "Cottage")],
      ]);

      const pagesResult = getPages(testItems);

      // All items should be grouped under one path
      // The first occurrence determines the slug
      expect(pagesResult.length).toBe(1);
      expect(pagesResult[0].count).toBe(3);
    });
  });

  test("Listing filterUI collection returns filterUI with no active filters", () => {
    const mock = mockConfig();
    testFilterConfig().configure(mock);

    const listingUI = mock.getCollection("testFilterPagesListingFilterUI")(
      collectionApi([filterItem("Widget", filterAttr("Size", "Large"))]),
    );

    expect(listingUI.hasFilters).toBe(true);
    expect(listingUI.hasActiveFilters).toBe(false);
    expect(listingUI.groups.length).toBeGreaterThan(0);
  });
});
