import {
  parseFilterAttributes,
  buildDisplayLookup,
  filterToPath,
  pathToFilter,
  getAllFilterAttributes,
  itemMatchesFilters,
  getItemsByFilters,
  generateFilterCombinations,
  buildFilterDescription,
  buildFilterUIData,
} from "../src/_lib/item-filters.js";
import {
  createTestRunner,
  expectDeepEqual,
  expectStrictEqual,
  expectTrue,
} from "./test-utils.js";

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
        result["yes"],
        "Yes",
        "Should map slugified value to original display",
      );
      expectStrictEqual(
        result["type"],
        "Type",
        "Should map simple key to original",
      );
      expectStrictEqual(
        result["cottage"],
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
        result["yes"],
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

      expectStrictEqual(result["size"], "Size", "Should still build lookup");
      expectStrictEqual(result["large"], "Large", "Should include values");
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
        result.includes("Pet Friendly: Yes"),
        "Should use display values for pet-friendly",
      );
      expectTrue(
        result.includes("Type: Cottage"),
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
];

export default createTestRunner("item-filters", testCases);
