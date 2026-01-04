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
import { expectResultTitles } from "#test/test-utils.js";

describe("item-filters", () => {
  // parseFilterAttributes tests
  test("Returns empty object for null/undefined input", () => {
    expect(parseFilterAttributes(null)).toEqual({});
    expect(parseFilterAttributes(undefined)).toEqual({});
  });

  test("Parses basic filter attributes with lowercase conversion", () => {
    const input = [
      { name: "Size", value: "Small" },
      { name: "Type", value: "Cottage" },
    ];

    const result = parseFilterAttributes(input);

    expect(result).toEqual({ size: "small", type: "cottage" });
  });

  test("Converts spaces to dashes using slugify", () => {
    const input = [
      { name: "Pet Friendly", value: "Yes" },
      { name: "Beach Access", value: "Private Beach" },
    ];

    const result = parseFilterAttributes(input);

    expect(result["pet-friendly"]).toBe("yes");
    expect(result["beach-access"]).toBe("private-beach");
  });

  test("Trims whitespace from names and values", () => {
    const input = [{ name: "  Size  ", value: "  Large  " }];

    const result = parseFilterAttributes(input);

    expect(result).toEqual({ size: "large" });
  });

  test("Handles special characters via slugify", () => {
    const input = [{ name: "Size & Type", value: "Extra Large!" }];

    const result = parseFilterAttributes(input);

    // slugify removes special chars and replaces spaces with dashes
    expect(
      result["size-and-type"] !== undefined ||
        result["size-type"] !== undefined,
    ).toBe(true);
  });

  // buildDisplayLookup tests
  test("Builds lookup from slugified keys to original display values", () => {
    const items = [
      {
        data: {
          filter_attributes: [
            { name: "Pet Friendly", value: "Yes" },
            { name: "Type", value: "Cottage" },
          ],
        },
      },
    ];

    const result = buildDisplayLookup(items);

    expect(result["pet-friendly"]).toBe("Pet Friendly");
    expect(result.yes).toBe("Yes");
    expect(result.type).toBe("Type");
    expect(result.cottage).toBe("Cottage");
  });

  test("First capitalization wins for duplicate keys", () => {
    const items = [
      {
        data: {
          filter_attributes: [{ name: "Pet Friendly", value: "YES" }],
        },
      },
      {
        data: {
          filter_attributes: [{ name: "pet friendly", value: "yes" }],
        },
      },
    ];

    const result = buildDisplayLookup(items);

    expect(result["pet-friendly"]).toBe("Pet Friendly");
    expect(result.yes).toBe("YES");
  });

  test("Handles items without filter_attributes", () => {
    const items = [
      { data: { title: "No filters" } },
      { data: { filter_attributes: [{ name: "Size", value: "Large" }] } },
    ];

    const result = buildDisplayLookup(items);

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
    const items = [
      {
        data: {
          filter_attributes: [
            { name: "Type", value: "Cottage" },
            { name: "Bedrooms", value: "2" },
          ],
        },
      },
      {
        data: {
          filter_attributes: [
            { name: "Type", value: "Apartment" },
            { name: "Bedrooms", value: "3" },
          ],
        },
      },
    ];

    const result = getAllFilterAttributes(items);

    expect(result.bedrooms).toEqual(["2", "3"]);
    expect(result.type).toEqual(["apartment", "cottage"]);
  });

  test("Uses slugified keys for attributes with spaces", () => {
    const items = [
      {
        data: {
          filter_attributes: [{ name: "Pet Friendly", value: "Yes" }],
        },
      },
    ];

    const result = getAllFilterAttributes(items);

    expect("pet-friendly" in result).toBe(true);
    expect(result["pet-friendly"]).toEqual(["yes"]);
  });

  // itemMatchesFilters tests
  test("All items match empty filters", () => {
    const item = {
      data: {
        filter_attributes: [{ name: "Type", value: "Cottage" }],
      },
    };

    expect(itemMatchesFilters(item, null)).toBe(true);
    expect(itemMatchesFilters(item, {})).toBe(true);
  });

  test("Returns true for matching filters", () => {
    const item = {
      data: {
        filter_attributes: [
          { name: "Pet Friendly", value: "Yes" },
          { name: "Type", value: "Cottage" },
        ],
      },
    };

    const result = itemMatchesFilters(item, {
      "pet-friendly": "yes",
      type: "cottage",
    });

    expect(result).toBe(true);
  });

  test("Returns false for non-matching filters", () => {
    const item = {
      data: {
        filter_attributes: [{ name: "Type", value: "Cottage" }],
      },
    };

    const result = itemMatchesFilters(item, { type: "apartment" });

    expect(result).toBe(false);
  });

  // getItemsByFilters tests
  test("Returns only items matching all filters", () => {
    const items = [
      {
        data: {
          title: "Beach Cottage",
          filter_attributes: [
            { name: "Pet Friendly", value: "Yes" },
            { name: "Type", value: "Cottage" },
          ],
        },
      },
      {
        data: {
          title: "City Apartment",
          filter_attributes: [
            { name: "Pet Friendly", value: "No" },
            { name: "Type", value: "Apartment" },
          ],
        },
      },
      {
        data: {
          title: "Pet Apartment",
          filter_attributes: [
            { name: "Pet Friendly", value: "Yes" },
            { name: "Type", value: "Apartment" },
          ],
        },
      },
    ];

    const result = getItemsByFilters(items, { "pet-friendly": "yes" });

    expectResultTitles(result, ["Beach Cottage", "Pet Apartment"]);
  });

  // generateFilterCombinations tests
  test("Generates all valid filter combination paths", () => {
    const items = [
      {
        data: {
          filter_attributes: [
            { name: "Pet Friendly", value: "Yes" },
            { name: "Type", value: "Cottage" },
          ],
        },
      },
    ];

    const result = generateFilterCombinations(items);

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
    const items = [
      {
        data: {
          filter_attributes: [
            { name: "Pet Friendly", value: "Yes" },
            { name: "Type", value: "Apartment" },
          ],
        },
      },
    ];

    // Parse attributes (this is where slugification happens)
    const parsed = parseFilterAttributes(items[0].data.filter_attributes);

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
    const items = [
      {
        data: {
          title: "B Item",
          filter_attributes: [{ name: "Type", value: "B" }],
        },
      },
      {
        data: {
          title: "A Item",
          filter_attributes: [{ name: "Type", value: "A" }],
        },
      },
    ];

    const result = getItemsByFilters(items, {});

    expect(result.length).toBe(2);
  });

  // buildFilterUIData tests
  test("Returns hasFilters false when no filter attributes exist", () => {
    const filterData = { attributes: {}, displayLookup: {} };
    const result = buildFilterUIData(filterData, null, [], "/products");

    expect(result.hasFilters).toBe(false);
  });

  test("Builds complete UI data structure with filter groups", () => {
    const filterData = {
      attributes: {
        type: ["cottage", "apartment"],
        size: ["small", "large"],
      },
      displayLookup: {
        type: "Type",
        cottage: "Cottage",
        apartment: "Apartment",
        size: "Size",
        small: "Small",
        large: "Large",
      },
    };
    const validPages = [
      { path: "type/cottage" },
      { path: "type/apartment" },
      { path: "size/small" },
      { path: "size/large" },
      { path: "size/small/type/cottage" },
    ];

    const result = buildFilterUIData(
      filterData,
      null,
      validPages,
      "/properties",
    );

    expect(result.hasFilters).toBe(true);
    expect(result.hasActiveFilters).toBe(false);
    expect(result.activeFilters).toEqual([]);
    expect(result.clearAllUrl).toBe("/properties/#content");
    expect(result.groups.length).toBe(2);
  });

  test("Includes active filters with remove URLs", () => {
    const filterData = {
      attributes: {
        type: ["cottage", "apartment"],
        size: ["small", "large"],
      },
      displayLookup: {
        type: "Type",
        cottage: "Cottage",
        apartment: "Apartment",
        size: "Size",
        small: "Small",
        large: "Large",
      },
    };
    const currentFilters = { type: "cottage" };
    const validPages = [
      { path: "type/cottage" },
      { path: "type/apartment" },
      { path: "size/small/type/cottage" },
      { path: "size/large/type/cottage" },
    ];

    const result = buildFilterUIData(
      filterData,
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
    const filterData = {
      attributes: { type: ["cottage", "apartment", "villa"] },
      displayLookup: {
        type: "Type",
        cottage: "Cottage",
        apartment: "Apartment",
        villa: "Villa",
      },
    };
    const validPages = [{ path: "type/cottage" }, { path: "type/apartment" }];

    const result = buildFilterUIData(
      filterData,
      null,
      validPages,
      "/properties",
    );

    expect(result.groups[0].options.length).toBe(2);
    const optionValues = result.groups[0].options.map((o) => o.value);
    expect(optionValues.includes("Cottage")).toBe(true);
    expect(optionValues.includes("Apartment")).toBe(true);
    expect(optionValues.includes("Villa")).toBe(false);
  });

  test("Marks currently active options in filter groups", () => {
    const filterData = {
      attributes: { type: ["cottage", "apartment"] },
      displayLookup: {
        type: "Type",
        cottage: "Cottage",
        apartment: "Apartment",
      },
    };
    const currentFilters = { type: "cottage" };
    const validPages = [{ path: "type/cottage" }, { path: "type/apartment" }];

    const result = buildFilterUIData(
      filterData,
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
    const filterData = {
      attributes: { type: ["cottage"], size: ["small"] },
      displayLookup: {
        type: "Type",
        cottage: "Cottage",
        size: "Size",
        small: "Small",
      },
    };
    // Only type/cottage is valid, size/small is not
    const validPages = [{ path: "type/cottage" }];

    const result = buildFilterUIData(
      filterData,
      null,
      validPages,
      "/properties",
    );

    expect(result.groups.length).toBe(1);
    expect(result.groups[0].name).toBe("type");
  });

  test("Remove URL for active filter keeps other filters", () => {
    const filterData = {
      attributes: { type: ["cottage"], size: ["small"] },
      displayLookup: {
        type: "Type",
        cottage: "Cottage",
        size: "Size",
        small: "Small",
      },
    };
    const currentFilters = { type: "cottage", size: "small" };
    const validPages = [
      { path: "type/cottage" },
      { path: "size/small" },
      { path: "size/small/type/cottage" },
    ];

    const result = buildFilterUIData(
      filterData,
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
  test("Returns an object with configure function", () => {
    const config = createFilterConfig({
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
    const addedCollections = [];
    const addedFilters = [];
    const mockEleventyConfig = {
      addCollection: (name, fn) => {
        addedCollections.push({ name, fn });
      },
      addFilter: (name, fn) => {
        addedFilters.push({ name, fn });
      },
    };

    const config = createFilterConfig({
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

    config.configure(mockEleventyConfig);

    expect(addedCollections.length).toBe(3);
    expect(addedFilters.length).toBe(1);
    expect(addedFilters[0].name).toBe("propertyFilterUIData");

    const collectionNames = addedCollections.map((c) => c.name);
    expect(collectionNames.includes("propertyFilterPages")).toBe(true);
    expect(collectionNames.includes("propertyRedirects")).toBe(true);
    expect(collectionNames.includes("propertyFilterAttributes")).toBe(true);
  });

  test("Pages collection returns filter combinations with items", () => {
    let pagesCollection;
    const mockEleventyConfig = {
      addCollection: (name, fn) => {
        if (name === "testFilterPages") pagesCollection = fn;
      },
      addFilter: () => {},
    };

    const config = createFilterConfig({
      tag: "test",
      permalinkDir: "test",
      itemsKey: "testItems",
      collections: {
        pages: "testFilterPages",
        redirects: "testRedirects",
        attributes: "testAttributes",
      },
      uiDataFilterName: "testFilterUIData",
    });

    config.configure(mockEleventyConfig);

    const mockCollectionApi = {
      getFilteredByTag: () => [
        {
          data: {
            title: "Item 1",
            filter_attributes: [{ name: "Type", value: "A" }],
          },
        },
        {
          data: {
            title: "Item 2",
            filter_attributes: [{ name: "Type", value: "B" }],
          },
        },
      ],
    };

    const pages = pagesCollection(mockCollectionApi);

    expect(pages.length >= 2).toBe(true);
    expect(pages[0].path !== undefined).toBe(true);
    expect(pages[0].filters !== undefined).toBe(true);
    expect(pages[0].testItems !== undefined).toBe(true);
    expect(pages[0].filterDescription !== undefined).toBe(true);
  });

  test("Redirects collection generates redirects for partial paths", () => {
    let redirectsCollection;
    const mockEleventyConfig = {
      addCollection: (name, fn) => {
        if (name === "testRedirects") redirectsCollection = fn;
      },
      addFilter: () => {},
    };

    const config = createFilterConfig({
      tag: "test",
      permalinkDir: "items",
      itemsKey: "items",
      collections: {
        pages: "testPages",
        redirects: "testRedirects",
        attributes: "testAttrs",
      },
      uiDataFilterName: "testUI",
    });

    config.configure(mockEleventyConfig);

    const mockCollectionApi = {
      getFilteredByTag: () => [
        {
          data: {
            filter_attributes: [
              { name: "Type", value: "A" },
              { name: "Size", value: "Large" },
            ],
          },
        },
      ],
    };

    const redirects = redirectsCollection(mockCollectionApi);

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
    let attributesCollection;
    const mockEleventyConfig = {
      addCollection: (name, fn) => {
        if (name === "testAttrs") attributesCollection = fn;
      },
      addFilter: () => {},
    };

    const config = createFilterConfig({
      tag: "test",
      permalinkDir: "items",
      itemsKey: "items",
      collections: {
        pages: "testPages",
        redirects: "testRedirects",
        attributes: "testAttrs",
      },
      uiDataFilterName: "testUI",
    });

    config.configure(mockEleventyConfig);

    const mockCollectionApi = {
      getFilteredByTag: () => [
        {
          data: {
            filter_attributes: [{ name: "Pet Friendly", value: "Yes" }],
          },
        },
      ],
    };

    const attrs = attributesCollection(mockCollectionApi);

    expect(attrs.attributes !== undefined).toBe(true);
    expect(attrs.displayLookup !== undefined).toBe(true);
    expect(attrs.attributes["pet-friendly"]).toEqual(["yes"]);
    expect(attrs.displayLookup["pet-friendly"]).toBe("Pet Friendly");
  });

  test("UI data filter calls buildFilterUIData with correct baseUrl", () => {
    let uiDataFilter;
    const mockEleventyConfig = {
      addCollection: () => {},
      addFilter: (name, fn) => {
        if (name === "testUI") uiDataFilter = fn;
      },
    };

    const config = createFilterConfig({
      tag: "test",
      permalinkDir: "my-items",
      itemsKey: "items",
      collections: { pages: "p", redirects: "r", attributes: "a" },
      uiDataFilterName: "testUI",
    });

    config.configure(mockEleventyConfig);

    const filterData = {
      attributes: { type: ["a"] },
      displayLookup: { type: "Type", a: "A" },
    };
    const validPages = [{ path: "type/a" }];

    const result = uiDataFilter(filterData, null, validPages);

    expect(result.clearAllUrl).toBe("/my-items/#content");
  });

  // generateFilterCombinations edge cases
  test("Returns empty array when items have no filter attributes", () => {
    const items = [{ data: { title: "No attrs" } }];
    expect(generateFilterCombinations(items)).toEqual([]);
  });

  // itemMatchesFilters with missing attribute
  test("Returns false when item is missing a filtered attribute", () => {
    const item = {
      data: {
        filter_attributes: [{ name: "Type", value: "Cottage" }],
      },
    };

    const result = itemMatchesFilters(item, {
      type: "cottage",
      size: "large",
    });

    expect(result).toBe(false);
  });
});
