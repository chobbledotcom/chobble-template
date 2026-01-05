import { describe, expect, test } from "bun:test";
import {
  buildDisplayLookup,
  buildFilterDescription,
  buildFilterUIData,
  createFilterConfig,
  filterToPath,
  generateFilterCombinations,
  getAllFilterAttributes,
  getItemsByFilters,
  itemMatchesFilters,
  normalize,
  parseFilterAttributes,
  pathToFilter,
} from "#filters/item-filters.js";
import {
  item as baseItem,
  collectionApi,
  expectResultTitles,
} from "#test/test-utils.js";
import { map, pipe, reduce } from "#utils/array-utils.js";

// ============================================
// Functional Test Fixture Builders
// ============================================

/**
 * Create a filter attribute { name, value }
 */
const attr = (name, value) => ({ name, value });

/**
 * Create an item with filter_attributes using rest params syntax.
 * Wraps the shared baseItem for filter-specific convenience.
 *
 * @param {string|null} title - Item title (null for no title)
 * @param {...Object} attrs - Filter attributes created with attr()
 */
const item = (title, ...attrs) =>
  baseItem(title, attrs.length > 0 ? { filter_attributes: attrs } : {});

/**
 * Create items from an array of [title, ...attrs] tuples
 * Curried for use with pipe
 */
const items = map(([title, ...attrs]) => item(title, ...attrs));

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

describe("item-filters", () => {
  // parseFilterAttributes tests
  test("Returns empty object for null/undefined input", () => {
    expect(parseFilterAttributes(null)).toEqual({});
    expect(parseFilterAttributes(undefined)).toEqual({});
  });

  test("Parses basic filter attributes with lowercase conversion", () => {
    const result = parseFilterAttributes([
      attr("Size", "Small"),
      attr("Type", "Cottage"),
    ]);

    expect(result).toEqual({ size: "small", type: "cottage" });
  });

  test("Converts spaces to dashes using slugify", () => {
    const result = parseFilterAttributes([
      attr("Pet Friendly", "Yes"),
      attr("Beach Access", "Private Beach"),
    ]);

    expect(result["pet-friendly"]).toBe("yes");
    expect(result["beach-access"]).toBe("private-beach");
  });

  test("Trims whitespace from names and values", () => {
    const result = parseFilterAttributes([attr("  Size  ", "  Large  ")]);

    expect(result).toEqual({ size: "large" });
  });

  test("Handles special characters via slugify", () => {
    const result = parseFilterAttributes([attr("Size & Type", "Extra Large!")]);

    // slugify removes special chars and replaces spaces with dashes
    expect(
      result["size-and-type"] !== undefined ||
        result["size-type"] !== undefined,
    ).toBe(true);
  });

  // buildDisplayLookup tests
  test("Builds lookup from slugified keys to original display values", () => {
    const testItems = [
      item(null, attr("Pet Friendly", "Yes"), attr("Type", "Cottage")),
    ];

    const result = buildDisplayLookup(testItems);

    expect(result["pet-friendly"]).toBe("Pet Friendly");
    expect(result.yes).toBe("Yes");
    expect(result.type).toBe("Type");
    expect(result.cottage).toBe("Cottage");
  });

  test("First capitalization wins for duplicate keys", () => {
    const testItems = [
      item(null, attr("Pet Friendly", "YES")),
      item(null, attr("pet friendly", "yes")),
    ];

    const result = buildDisplayLookup(testItems);

    expect(result["pet-friendly"]).toBe("Pet Friendly");
    expect(result.yes).toBe("YES");
  });

  test("Handles items without filter_attributes", () => {
    const testItems = [item("No filters"), item(null, attr("Size", "Large"))];

    const result = buildDisplayLookup(testItems);

    expect(result.size).toBe("Size");
    expect(result.large).toBe("Large");
  });

  // filterToPath tests
  test("Returns empty string for empty filters", () => {
    expect(filterToPath(null)).toBe("");
    expect(filterToPath(undefined)).toBe("");
    expect(filterToPath({})).toBe("");
  });

  test("Creates path from single filter", () => {
    const result = filterToPath({ type: "cottage" });

    expect(result).toBe("type/cottage");
  });

  test("Creates sorted path from multiple filters", () => {
    const result = filterToPath({ type: "cottage", bedrooms: "2" });

    expect(result).toBe("bedrooms/2/type/cottage");
  });

  test("Works correctly with pre-slugified values", () => {
    const result = filterToPath({ "pet-friendly": "yes" });

    expect(result).toBe("pet-friendly/yes");
  });

  // pathToFilter tests
  test("Returns empty object for empty path", () => {
    expect(pathToFilter(null)).toEqual({});
    expect(pathToFilter(undefined)).toEqual({});
    expect(pathToFilter("")).toEqual({});
  });

  test("Round-trips through filterToPath and back", () => {
    const original = { "pet-friendly": "yes", type: "cottage" };
    const path = filterToPath(original);
    const result = pathToFilter(path);

    expect(result).toEqual(original);
  });

  // getAllFilterAttributes tests
  test("Collects all unique filter attributes and values", () => {
    const testItems = [
      item(null, attr("Type", "Cottage"), attr("Bedrooms", "2")),
      item(null, attr("Type", "Apartment"), attr("Bedrooms", "3")),
    ];

    const result = getAllFilterAttributes(testItems);

    expect(result.bedrooms).toEqual(["2", "3"]);
    expect(result.type).toEqual(["apartment", "cottage"]);
  });

  test("Uses slugified keys for attributes with spaces", () => {
    const testItems = [item(null, attr("Pet Friendly", "Yes"))];

    const result = getAllFilterAttributes(testItems);

    expect("pet-friendly" in result).toBe(true);
    expect(result["pet-friendly"]).toEqual(["yes"]);
  });

  // itemMatchesFilters tests
  test("All items match empty filters", () => {
    const testItem = item(null, attr("Type", "Cottage"));

    expect(itemMatchesFilters(testItem, null)).toBe(true);
    expect(itemMatchesFilters(testItem, {})).toBe(true);
  });

  test("Returns true for matching filters", () => {
    const testItem = item(
      null,
      attr("Pet Friendly", "Yes"),
      attr("Type", "Cottage"),
    );

    const result = itemMatchesFilters(testItem, {
      "pet-friendly": "yes",
      type: "cottage",
    });

    expect(result).toBe(true);
  });

  test("Returns false for non-matching filters", () => {
    const testItem = item(null, attr("Type", "Cottage"));

    const result = itemMatchesFilters(testItem, { type: "apartment" });

    expect(result).toBe(false);
  });

  // getItemsByFilters tests
  test("Returns only items matching all filters", () => {
    const testItems = items([
      ["Beach Cottage", attr("Pet Friendly", "Yes"), attr("Type", "Cottage")],
      ["City Apartment", attr("Pet Friendly", "No"), attr("Type", "Apartment")],
      ["Pet Apartment", attr("Pet Friendly", "Yes"), attr("Type", "Apartment")],
    ]);

    const result = getItemsByFilters(testItems, { "pet-friendly": "yes" });

    expectResultTitles(result, ["Beach Cottage", "Pet Apartment"]);
  });

  // generateFilterCombinations tests
  test("Generates all valid filter combination paths", () => {
    const testItems = [
      item(null, attr("Pet Friendly", "Yes"), attr("Type", "Cottage")),
    ];

    const result = generateFilterCombinations(testItems);

    // Should have combinations for: pet-friendly/yes, type/cottage, and both combined
    const paths = result.map((c) => c.path);

    expect(paths.includes("pet-friendly/yes")).toBe(true);
    expect(paths.includes("type/cottage")).toBe(true);
    expect(paths.includes("pet-friendly/yes/type/cottage")).toBe(true);
  });

  // buildFilterDescription tests
  test("Uses display lookup for human-readable descriptions", () => {
    const filters = { "pet-friendly": "yes", type: "cottage" };
    const displayLookup = {
      "pet-friendly": "Pet Friendly",
      yes: "Yes",
      type: "Type",
      cottage: "Cottage",
    };

    const result = buildFilterDescription(filters, displayLookup);

    expect(result.includes("Pet Friendly: <strong>Yes</strong>")).toBe(true);
    expect(result.includes("Type: <strong>Cottage</strong>")).toBe(true);
  });

  // Integration test: URL generation with spaces
  test("Filter URLs use dashes instead of %20 for spaces (main bug fix)", () => {
    const testItem = item(
      null,
      attr("Pet Friendly", "Yes"),
      attr("Type", "Apartment"),
    );

    // Parse attributes (this is where slugification happens)
    const parsed = parseFilterAttributes(testItem.data.filter_attributes);

    // Generate path
    const path = filterToPath(parsed);

    // The path should NOT contain %20, should use dashes
    expect(path.includes("%20")).toBe(false);
    expect(path.includes("pet-friendly")).toBe(true);
    expect(path).toBe("pet-friendly/yes/type/apartment");
  });

  // normalize function tests
  test("Normalizes string to lowercase alphanumeric only", () => {
    expect(normalize("Hello World")).toBe("helloworld");
    expect(normalize("Pet-Friendly")).toBe("petfriendly");
    expect(normalize("Size: Large!")).toBe("sizelarge");
  });

  test("Returns all items sorted when no filters provided", () => {
    const testItems = items([
      ["B Item", attr("Type", "B")],
      ["A Item", attr("Type", "A")],
    ]);

    const result = getItemsByFilters(testItems, {});

    expect(result.length).toBe(2);
  });

  // buildFilterUIData tests
  test("Returns hasFilters false when no filter attributes exist", () => {
    const data = filterData({});
    const result = buildFilterUIData(data, null, [], "/products");

    expect(result.hasFilters).toBe(false);
  });

  // Shared filter data for buildFilterUIData tests
  const typeSizeFilterData = () =>
    filterData({
      type: {
        display: "Type",
        values: { cottage: "Cottage", apartment: "Apartment" },
      },
      size: { display: "Size", values: { small: "Small", large: "Large" } },
    });

  test("Builds complete UI data structure with filter groups", () => {
    const data = typeSizeFilterData();
    const validPages = pages([
      "type/cottage",
      "type/apartment",
      "size/small",
      "size/large",
      "size/small/type/cottage",
    ]);

    const result = buildFilterUIData(data, null, validPages, "/properties");

    expect(result.hasFilters).toBe(true);
    expect(result.hasActiveFilters).toBe(false);
    expect(result.activeFilters).toEqual([]);
    expect(result.clearAllUrl).toBe("/properties/#content");
    expect(result.groups.length).toBe(2);
  });

  test("Includes active filters with remove URLs", () => {
    const data = typeSizeFilterData();
    const currentFilters = { type: "cottage" };
    const validPages = pages([
      "type/cottage",
      "type/apartment",
      "size/small/type/cottage",
      "size/large/type/cottage",
    ]);

    const result = buildFilterUIData(
      data,
      currentFilters,
      validPages,
      "/properties",
    );

    expect(result.hasActiveFilters).toBe(true);
    expect(result.activeFilters.length).toBe(1);
    expect(result.activeFilters[0].key).toBe("Type");
    expect(result.activeFilters[0].value).toBe("Cottage");
    expect(result.activeFilters[0].removeUrl).toBe("/properties/#content");
  });

  test("Only includes options that lead to valid pages", () => {
    const data = filterData({
      type: {
        display: "Type",
        values: { cottage: "Cottage", apartment: "Apartment", villa: "Villa" },
      },
    });
    const validPages = pages(["type/cottage", "type/apartment"]);

    const result = buildFilterUIData(data, null, validPages, "/properties");

    expect(result.groups[0].options.length).toBe(2);
    const optionValues = result.groups[0].options.map((o) => o.value);
    expect(optionValues.includes("Cottage")).toBe(true);
    expect(optionValues.includes("Apartment")).toBe(true);
    expect(optionValues.includes("Villa")).toBe(false);
  });

  test("Marks currently active options in filter groups", () => {
    const data = filterData({
      type: {
        display: "Type",
        values: { cottage: "Cottage", apartment: "Apartment" },
      },
    });
    const currentFilters = { type: "cottage" };
    const validPages = pages(["type/cottage", "type/apartment"]);

    const result = buildFilterUIData(
      data,
      currentFilters,
      validPages,
      "/properties",
    );

    const typeGroup = result.groups[0];
    const cottageOption = typeGroup.options.find((o) => o.value === "Cottage");
    const apartmentOption = typeGroup.options.find(
      (o) => o.value === "Apartment",
    );

    expect(cottageOption.active).toBe(true);
    expect(apartmentOption.active).toBe(false);
  });

  test("Excludes groups with no valid options", () => {
    const data = filterData({
      type: { display: "Type", values: { cottage: "Cottage" } },
      size: { display: "Size", values: { small: "Small" } },
    });
    // Only type/cottage is valid, size/small is not
    const validPages = pages(["type/cottage"]);

    const result = buildFilterUIData(data, null, validPages, "/properties");

    expect(result.groups.length).toBe(1);
    expect(result.groups[0].name).toBe("type");
  });

  test("Remove URL for active filter keeps other filters", () => {
    const data = filterData({
      type: { display: "Type", values: { cottage: "Cottage" } },
      size: { display: "Size", values: { small: "Small" } },
    });
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
      "/properties",
    );

    expect(result.activeFilters.length).toBe(2);

    const typeFilter = result.activeFilters.find((f) => f.key === "Type");
    const sizeFilter = result.activeFilters.find((f) => f.key === "Size");

    expect(typeFilter.removeUrl).toBe("/properties/search/size/small/#content");
    expect(sizeFilter.removeUrl).toBe(
      "/properties/search/type/cottage/#content",
    );
  });

  // createFilterConfig tests
  // Shared config factory for createFilterConfig tests
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

  test("Returns an object with configure function", () => {
    const config = testFilterConfig({
      tag: "product",
      permalinkDir: "products",
      itemsKey: "products",
      collections: {
        pages: "productFilterPages",
        redirects: "productRedirects",
        attributes: "productFilterAttributes",
      },
      uiDataFilterName: "productFilterUIData",
    });

    expect(typeof config.configure).toBe("function");
  });

  test("Configure adds all required collections and filter", () => {
    const mock = mockConfig();
    const config = testFilterConfig({
      tag: "property",
      permalinkDir: "properties",
      itemsKey: "properties",
      collections: {
        pages: "propertyFilterPages",
        redirects: "propertyRedirects",
        attributes: "propertyFilterAttributes",
      },
      uiDataFilterName: "propertyFilterUIData",
    });

    config.configure(mock);

    expect(mock.getCollections().length).toBe(3);
    expect(mock.getFilters().length).toBe(1);
    expect(mock.getFilters()[0].name).toBe("propertyFilterUIData");

    const collectionNames = mock.getCollections().map((c) => c.name);
    expect(collectionNames.includes("propertyFilterPages")).toBe(true);
    expect(collectionNames.includes("propertyRedirects")).toBe(true);
    expect(collectionNames.includes("propertyFilterAttributes")).toBe(true);
  });

  test("Pages collection returns filter combinations with items", () => {
    const mock = mockConfig();
    const config = testFilterConfig();

    config.configure(mock);

    const testItems = items([
      ["Item 1", attr("Type", "A")],
      ["Item 2", attr("Type", "B")],
    ]);

    const pagesResult = mock.getCollection("testFilterPages")(
      collectionApi(testItems),
    );

    expect(pagesResult.length >= 2).toBe(true);
    expect(pagesResult[0].path !== undefined).toBe(true);
    expect(pagesResult[0].filters !== undefined).toBe(true);
    expect(pagesResult[0].testItems !== undefined).toBe(true);
    expect(pagesResult[0].filterDescription !== undefined).toBe(true);
  });

  test("Redirects collection generates redirects for partial paths", () => {
    const mock = mockConfig();
    const config = testFilterConfig({
      permalinkDir: "items",
      itemsKey: "items",
      collections: {
        pages: "testPages",
        redirects: "testRedirects",
        attributes: "testAttrs",
      },
      uiDataFilterName: "testUI",
    });

    config.configure(mock);

    const testItems = [item(null, attr("Type", "A"), attr("Size", "Large"))];

    const redirects = mock.getCollection("testRedirects")(
      collectionApi(testItems),
    );

    expect(redirects.length > 0).toBe(true);
    expect(redirects[0].from !== undefined).toBe(true);
    expect(redirects[0].to !== undefined).toBe(true);

    // Check that redirects point to search URLs
    const hasSearchRedirect = redirects.some((r) =>
      r.from.includes("/items/search/"),
    );
    expect(hasSearchRedirect).toBe(true);
  });

  test("Attributes collection returns attributes and display lookup", () => {
    const mock = mockConfig();
    const config = testFilterConfig({
      permalinkDir: "items",
      itemsKey: "items",
      collections: {
        pages: "testPages",
        redirects: "testRedirects",
        attributes: "testAttrs",
      },
      uiDataFilterName: "testUI",
    });

    config.configure(mock);

    const testItems = [item(null, attr("Pet Friendly", "Yes"))];

    const attrs = mock.getCollection("testAttrs")(collectionApi(testItems));

    expect(attrs.attributes !== undefined).toBe(true);
    expect(attrs.displayLookup !== undefined).toBe(true);
    expect(attrs.attributes["pet-friendly"]).toEqual(["yes"]);
    expect(attrs.displayLookup["pet-friendly"]).toBe("Pet Friendly");
  });

  test("UI data filter calls buildFilterUIData with correct baseUrl", () => {
    const mock = mockConfig();
    const config = testFilterConfig({
      permalinkDir: "my-items",
      itemsKey: "items",
      collections: { pages: "p", redirects: "r", attributes: "a" },
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

  // generateFilterCombinations edge cases
  test("Returns empty array when items have no filter attributes", () => {
    const testItems = [item("No attrs")];
    expect(generateFilterCombinations(testItems)).toEqual([]);
  });

  // itemMatchesFilters with missing attribute
  test("Returns false when item is missing a filtered attribute", () => {
    const testItem = item(null, attr("Type", "Cottage"));

    const result = itemMatchesFilters(testItem, {
      type: "cottage",
      size: "large",
    });

    expect(result).toBe(false);
  });
});
