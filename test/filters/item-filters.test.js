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
  createTestRunner,
  expectDeepEqual,
  expectStrictEqual,
  expectTrue,
} from "#test/test-utils.js";

const testCases = [
  // parseFilterAttributes tests
  {
    name: "parseFilterAttributes-null",
    description: "Returns empty object for null/undefined input",
    test: () => {
      expectDeepEqual(
        parseFilterAttributes(null),
        {},
        "Should return empty object for null",
      );
      expectDeepEqual(
        parseFilterAttributes(undefined),
        {},
        "Should return empty object for undefined",
      );
    },
  },
  {
    name: "parseFilterAttributes-basic",
    description: "Parses basic filter attributes with lowercase conversion",
    test: () => {
      const input = [
        { name: "Size", value: "Small" },
        { name: "Type", value: "Cottage" },
      ];

      const result = parseFilterAttributes(input);

      expectDeepEqual(
        result,
        { size: "small", type: "cottage" },
        "Should lowercase keys and values",
      );
    },
  },
  {
    name: "parseFilterAttributes-slugifies-spaces",
    description: "Converts spaces to dashes using slugify",
    test: () => {
      const input = [
        { name: "Pet Friendly", value: "Yes" },
        { name: "Beach Access", value: "Private Beach" },
      ];

      const result = parseFilterAttributes(input);

      expectStrictEqual(
        result["pet-friendly"],
        "yes",
        "Should slugify key with space to hyphen",
      );
      expectStrictEqual(
        result["beach-access"],
        "private-beach",
        "Should slugify both key and value with spaces",
      );
    },
  },
  {
    name: "parseFilterAttributes-trims-whitespace",
    description: "Trims whitespace from names and values",
    test: () => {
      const input = [{ name: "  Size  ", value: "  Large  " }];

      const result = parseFilterAttributes(input);

      expectDeepEqual(
        result,
        { size: "large" },
        "Should trim whitespace before slugifying",
      );
    },
  },
  {
    name: "parseFilterAttributes-special-chars",
    description: "Handles special characters via slugify",
    test: () => {
      const input = [{ name: "Size & Type", value: "Extra Large!" }];

      const result = parseFilterAttributes(input);

      // slugify removes special chars and replaces spaces with dashes
      expectStrictEqual(
        result["size-and-type"] !== undefined ||
          result["size-type"] !== undefined,
        true,
        "Should handle special characters in key",
      );
    },
  },

  // buildDisplayLookup tests
  {
    name: "buildDisplayLookup-basic",
    description: "Builds lookup from slugified keys to original display values",
    test: () => {
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

      expectStrictEqual(
        result["pet-friendly"],
        "Pet Friendly",
        "Should map slugified key to original display",
      );
      expectStrictEqual(
        result.yes,
        "Yes",
        "Should map slugified value to original display",
      );
      expectStrictEqual(
        result.type,
        "Type",
        "Should map simple key to original",
      );
      expectStrictEqual(
        result.cottage,
        "Cottage",
        "Should map simple value to original",
      );
    },
  },
  {
    name: "buildDisplayLookup-first-wins",
    description: "First capitalization wins for duplicate keys",
    test: () => {
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

      expectStrictEqual(
        result["pet-friendly"],
        "Pet Friendly",
        "First capitalization should win for key",
      );
      expectStrictEqual(
        result.yes,
        "YES",
        "First capitalization should win for value",
      );
    },
  },
  {
    name: "buildDisplayLookup-handles-missing",
    description: "Handles items without filter_attributes",
    test: () => {
      const items = [
        { data: { title: "No filters" } },
        { data: { filter_attributes: [{ name: "Size", value: "Large" }] } },
      ];

      const result = buildDisplayLookup(items);

      expectStrictEqual(result.size, "Size", "Should still build lookup");
      expectStrictEqual(result.large, "Large", "Should include values");
    },
  },

  // filterToPath tests
  {
    name: "filterToPath-empty",
    description: "Returns empty string for empty filters",
    test: () => {
      expectStrictEqual(filterToPath(null), "", "Should return empty for null");
      expectStrictEqual(
        filterToPath(undefined),
        "",
        "Should return empty for undefined",
      );
      expectStrictEqual(filterToPath({}), "", "Should return empty for {}");
    },
  },
  {
    name: "filterToPath-single",
    description: "Creates path from single filter",
    test: () => {
      const result = filterToPath({ type: "cottage" });

      expectStrictEqual(result, "type/cottage", "Should create key/value path");
    },
  },
  {
    name: "filterToPath-multiple-sorted",
    description: "Creates sorted path from multiple filters",
    test: () => {
      const result = filterToPath({ type: "cottage", bedrooms: "2" });

      expectStrictEqual(
        result,
        "bedrooms/2/type/cottage",
        "Should sort keys alphabetically",
      );
    },
  },
  {
    name: "filterToPath-slugified-values",
    description: "Works correctly with pre-slugified values",
    test: () => {
      const result = filterToPath({ "pet-friendly": "yes" });

      expectStrictEqual(
        result,
        "pet-friendly/yes",
        "Should preserve dashes (no %20 encoding)",
      );
    },
  },

  // pathToFilter tests
  {
    name: "pathToFilter-empty",
    description: "Returns empty object for empty path",
    test: () => {
      expectDeepEqual(pathToFilter(null), {}, "Should return {} for null");
      expectDeepEqual(
        pathToFilter(undefined),
        {},
        "Should return {} for undefined",
      );
      expectDeepEqual(pathToFilter(""), {}, "Should return {} for empty");
    },
  },
  {
    name: "pathToFilter-roundtrip",
    description: "Round-trips through filterToPath and back",
    test: () => {
      const original = { "pet-friendly": "yes", type: "cottage" };
      const path = filterToPath(original);
      const result = pathToFilter(path);

      expectDeepEqual(result, original, "Should round-trip correctly");
    },
  },

  // getAllFilterAttributes tests
  {
    name: "getAllFilterAttributes-basic",
    description: "Collects all unique filter attributes and values",
    test: () => {
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

      expectDeepEqual(
        result.bedrooms,
        ["2", "3"],
        "Should collect bedroom values",
      );
      expectDeepEqual(
        result.type,
        ["apartment", "cottage"],
        "Should collect and sort type values",
      );
    },
  },
  {
    name: "getAllFilterAttributes-slugified-keys",
    description: "Uses slugified keys for attributes with spaces",
    test: () => {
      const items = [
        {
          data: {
            filter_attributes: [{ name: "Pet Friendly", value: "Yes" }],
          },
        },
      ];

      const result = getAllFilterAttributes(items);

      expectTrue(
        "pet-friendly" in result,
        "Should use slugified key with hyphen",
      );
      expectDeepEqual(
        result["pet-friendly"],
        ["yes"],
        "Should contain slugified value",
      );
    },
  },

  // itemMatchesFilters tests
  {
    name: "itemMatchesFilters-empty-filters",
    description: "All items match empty filters",
    test: () => {
      const item = {
        data: {
          filter_attributes: [{ name: "Type", value: "Cottage" }],
        },
      };

      expectTrue(itemMatchesFilters(item, null), "Should match null filters");
      expectTrue(itemMatchesFilters(item, {}), "Should match empty filters");
    },
  },
  {
    name: "itemMatchesFilters-matching",
    description: "Returns true for matching filters",
    test: () => {
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

      expectTrue(result, "Should match when all filters match");
    },
  },
  {
    name: "itemMatchesFilters-non-matching",
    description: "Returns false for non-matching filters",
    test: () => {
      const item = {
        data: {
          filter_attributes: [{ name: "Type", value: "Cottage" }],
        },
      };

      const result = itemMatchesFilters(item, { type: "apartment" });

      expectStrictEqual(result, false, "Should not match different value");
    },
  },

  // getItemsByFilters tests
  {
    name: "getItemsByFilters-filters-correctly",
    description: "Returns only items matching all filters",
    test: () => {
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

      expectStrictEqual(result.length, 2, "Should return 2 pet-friendly items");
      expectStrictEqual(
        result[0].data.title,
        "Beach Cottage",
        "Should include cottage",
      );
      expectStrictEqual(
        result[1].data.title,
        "Pet Apartment",
        "Should include apartment",
      );
    },
  },

  // generateFilterCombinations tests
  {
    name: "generateFilterCombinations-creates-paths",
    description: "Generates all valid filter combination paths",
    test: () => {
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

      expectTrue(
        paths.includes("pet-friendly/yes"),
        "Should include pet-friendly path",
      );
      expectTrue(paths.includes("type/cottage"), "Should include type path");
      expectTrue(
        paths.includes("pet-friendly/yes/type/cottage"),
        "Should include combined path",
      );
    },
  },

  // buildFilterDescription tests
  {
    name: "buildFilterDescription-uses-display-lookup",
    description: "Uses display lookup for human-readable descriptions",
    test: () => {
      const filters = { "pet-friendly": "yes", type: "cottage" };
      const displayLookup = {
        "pet-friendly": "Pet Friendly",
        yes: "Yes",
        type: "Type",
        cottage: "Cottage",
      };

      const result = buildFilterDescription(filters, displayLookup);

      expectTrue(
        result.includes("Pet Friendly: <strong>Yes</strong>"),
        "Should use display values for pet-friendly",
      );
      expectTrue(
        result.includes("Type: <strong>Cottage</strong>"),
        "Should use display values for type",
      );
    },
  },

  // Integration test: URL generation with spaces
  {
    name: "integration-url-no-percent-encoding-for-spaces",
    description:
      "Filter URLs use dashes instead of %20 for spaces (main bug fix)",
    test: () => {
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
      expectStrictEqual(
        path.includes("%20"),
        false,
        "Path should not contain %20 encoded spaces",
      );
      expectTrue(
        path.includes("pet-friendly"),
        "Path should contain pet-friendly with dash",
      );
      expectStrictEqual(
        path,
        "pet-friendly/yes/type/apartment",
        "Full path should be correctly slugified",
      );
    },
  },

  // normalize function tests
  {
    name: "normalize-basic",
    description: "Normalizes string to lowercase alphanumeric only",
    test: () => {
      expectStrictEqual(
        normalize("Hello World"),
        "helloworld",
        "Should lowercase and remove spaces",
      );
      expectStrictEqual(
        normalize("Pet-Friendly"),
        "petfriendly",
        "Should remove hyphens",
      );
      expectStrictEqual(
        normalize("Size: Large!"),
        "sizelarge",
        "Should remove special chars",
      );
    },
  },

  // getItemsByFilters with null/empty items
  {
    name: "getItemsByFilters-null-items",
    description: "Returns empty array for null items",
    test: () => {
      expectDeepEqual(
        getItemsByFilters(null, { type: "cottage" }),
        [],
        "Should return empty for null items",
      );
      expectDeepEqual(
        getItemsByFilters(undefined, {}),
        [],
        "Should return empty for undefined items",
      );
    },
  },
  {
    name: "getItemsByFilters-no-filters",
    description: "Returns all items sorted when no filters provided",
    test: () => {
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

      expectStrictEqual(result.length, 2, "Should return all items");
    },
  },

  // buildFilterUIData tests
  {
    name: "buildFilterUIData-no-attributes",
    description: "Returns hasFilters false when no filter attributes exist",
    test: () => {
      const filterData = { attributes: {}, displayLookup: {} };
      const result = buildFilterUIData(filterData, null, [], "/products");

      expectStrictEqual(result.hasFilters, false, "Should indicate no filters");
    },
  },
  {
    name: "buildFilterUIData-with-attributes",
    description: "Builds complete UI data structure with filter groups",
    test: () => {
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

      expectStrictEqual(result.hasFilters, true, "Should have filters");
      expectStrictEqual(
        result.hasActiveFilters,
        false,
        "Should have no active filters",
      );
      expectDeepEqual(
        result.activeFilters,
        [],
        "Should have empty active filters array",
      );
      expectStrictEqual(
        result.clearAllUrl,
        "/properties/#content",
        "Should have clear URL",
      );
      expectStrictEqual(result.groups.length, 2, "Should have 2 filter groups");
    },
  },
  {
    name: "buildFilterUIData-with-active-filters",
    description: "Includes active filters with remove URLs",
    test: () => {
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

      expectStrictEqual(
        result.hasActiveFilters,
        true,
        "Should have active filters",
      );
      expectStrictEqual(
        result.activeFilters.length,
        1,
        "Should have 1 active filter",
      );
      expectStrictEqual(
        result.activeFilters[0].key,
        "Type",
        "Should have filter key",
      );
      expectStrictEqual(
        result.activeFilters[0].value,
        "Cottage",
        "Should have filter value",
      );
      expectStrictEqual(
        result.activeFilters[0].removeUrl,
        "/properties/#content",
        "Should have remove URL",
      );
    },
  },
  {
    name: "buildFilterUIData-filters-invalid-options",
    description: "Only includes options that lead to valid pages",
    test: () => {
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

      expectStrictEqual(
        result.groups[0].options.length,
        2,
        "Should only include valid options",
      );
      const optionValues = result.groups[0].options.map((o) => o.value);
      expectTrue(optionValues.includes("Cottage"), "Should include Cottage");
      expectTrue(
        optionValues.includes("Apartment"),
        "Should include Apartment",
      );
      expectStrictEqual(
        optionValues.includes("Villa"),
        false,
        "Should not include Villa",
      );
    },
  },
  {
    name: "buildFilterUIData-marks-active-options",
    description: "Marks currently active options in filter groups",
    test: () => {
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
      const cottageOption = typeGroup.options.find(
        (o) => o.value === "Cottage",
      );
      const apartmentOption = typeGroup.options.find(
        (o) => o.value === "Apartment",
      );

      expectStrictEqual(cottageOption.active, true, "Cottage should be active");
      expectStrictEqual(
        apartmentOption.active,
        false,
        "Apartment should not be active",
      );
    },
  },
  {
    name: "buildFilterUIData-removes-empty-groups",
    description: "Excludes groups with no valid options",
    test: () => {
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

      expectStrictEqual(result.groups.length, 1, "Should only have 1 group");
      expectStrictEqual(
        result.groups[0].name,
        "type",
        "Should be the type group",
      );
    },
  },
  {
    name: "buildFilterUIData-multiple-active-remove-url",
    description: "Remove URL for active filter keeps other filters",
    test: () => {
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

      expectStrictEqual(
        result.activeFilters.length,
        2,
        "Should have 2 active filters",
      );

      const typeFilter = result.activeFilters.find((f) => f.key === "Type");
      const sizeFilter = result.activeFilters.find((f) => f.key === "Size");

      expectStrictEqual(
        typeFilter.removeUrl,
        "/properties/search/size/small/#content",
        "Type remove should keep size",
      );
      expectStrictEqual(
        sizeFilter.removeUrl,
        "/properties/search/type/cottage/#content",
        "Size remove should keep type",
      );
    },
  },

  // createFilterConfig tests
  {
    name: "createFilterConfig-returns-configure-function",
    description: "Returns an object with configure function",
    test: () => {
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

      expectTrue(
        typeof config.configure === "function",
        "Should return configure function",
      );
    },
  },
  {
    name: "createFilterConfig-configure-adds-collections",
    description: "Configure adds all required collections and filter",
    test: () => {
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

      expectStrictEqual(addedCollections.length, 3, "Should add 3 collections");
      expectStrictEqual(addedFilters.length, 1, "Should add 1 filter");
      expectStrictEqual(
        addedFilters[0].name,
        "propertyFilterUIData",
        "Should add UI filter",
      );

      const collectionNames = addedCollections.map((c) => c.name);
      expectTrue(
        collectionNames.includes("propertyFilterPages"),
        "Should add pages collection",
      );
      expectTrue(
        collectionNames.includes("propertyRedirects"),
        "Should add redirects collection",
      );
      expectTrue(
        collectionNames.includes("propertyFilterAttributes"),
        "Should add attributes collection",
      );
    },
  },
  {
    name: "createFilterConfig-pages-collection",
    description: "Pages collection returns filter combinations with items",
    test: () => {
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

      expectTrue(
        pages.length >= 2,
        "Should generate pages for filter combinations",
      );
      expectTrue(
        pages[0].path !== undefined,
        "Pages should have path property",
      );
      expectTrue(
        pages[0].filters !== undefined,
        "Pages should have filters property",
      );
      expectTrue(
        pages[0].testItems !== undefined,
        "Pages should have items with custom key",
      );
      expectTrue(
        pages[0].filterDescription !== undefined,
        "Pages should have filter description",
      );
    },
  },
  {
    name: "createFilterConfig-redirects-collection",
    description: "Redirects collection generates redirects for partial paths",
    test: () => {
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

      expectTrue(redirects.length > 0, "Should generate redirects");
      expectTrue(redirects[0].from !== undefined, "Redirects should have from");
      expectTrue(redirects[0].to !== undefined, "Redirects should have to");

      // Check that redirects point to search URLs
      const hasSearchRedirect = redirects.some((r) =>
        r.from.includes("/items/search/"),
      );
      expectTrue(hasSearchRedirect, "Should have search redirects");
    },
  },
  {
    name: "createFilterConfig-attributes-collection",
    description: "Attributes collection returns attributes and display lookup",
    test: () => {
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

      expectTrue(attrs.attributes !== undefined, "Should have attributes");
      expectTrue(
        attrs.displayLookup !== undefined,
        "Should have displayLookup",
      );
      expectDeepEqual(
        attrs.attributes["pet-friendly"],
        ["yes"],
        "Should have slugified attribute",
      );
      expectStrictEqual(
        attrs.displayLookup["pet-friendly"],
        "Pet Friendly",
        "Should have display lookup",
      );
    },
  },
  {
    name: "createFilterConfig-uiData-filter",
    description: "UI data filter calls buildFilterUIData with correct baseUrl",
    test: () => {
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

      expectStrictEqual(
        result.clearAllUrl,
        "/my-items/#content",
        "Should use correct baseUrl",
      );
    },
  },

  // generateFilterCombinations edge cases
  {
    name: "generateFilterCombinations-null-items",
    description: "Returns empty array for null/undefined items",
    test: () => {
      expectDeepEqual(
        generateFilterCombinations(null),
        [],
        "Should return empty for null",
      );
      expectDeepEqual(
        generateFilterCombinations(undefined),
        [],
        "Should return empty for undefined",
      );
    },
  },
  {
    name: "generateFilterCombinations-no-attributes",
    description: "Returns empty array when items have no filter attributes",
    test: () => {
      const items = [{ data: { title: "No attrs" } }];
      expectDeepEqual(
        generateFilterCombinations(items),
        [],
        "Should return empty for items without attributes",
      );
    },
  },

  // itemMatchesFilters with missing attribute
  {
    name: "itemMatchesFilters-missing-attribute",
    description: "Returns false when item is missing a filtered attribute",
    test: () => {
      const item = {
        data: {
          filter_attributes: [{ name: "Type", value: "Cottage" }],
        },
      };

      const result = itemMatchesFilters(item, {
        type: "cottage",
        size: "large",
      });

      expectStrictEqual(
        result,
        false,
        "Should not match when missing required attribute",
      );
    },
  },
];

export default createTestRunner("item-filters", testCases);
