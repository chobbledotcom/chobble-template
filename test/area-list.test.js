import {
  configureAreaList,
  filterTopLevelLocations,
  formatListWithAnd,
  isTopLevelLocation,
  prepareAreaList,
  sortByNavigationKey,
} from "#eleventy/area-list.js";
import {
  createMockEleventyConfig,
  createTestRunner,
  expectDeepEqual,
  expectFalse,
  expectStrictEqual,
  expectTrue,
} from "#test/test-utils.js";

// Test fixtures
const createLocation = (name, url) => ({
  url,
  data: {
    eleventyNavigation: {
      key: name,
    },
  },
});

const testCases = [
  // isTopLevelLocation tests
  {
    name: "isTopLevelLocation-top-level",
    description: "Returns true for top-level location URLs",
    test: () => {
      expectTrue(
        isTopLevelLocation("/locations/springfield/"),
        "Should match /locations/springfield/",
      );
      expectTrue(
        isTopLevelLocation("/locations/fulchester/"),
        "Should match /locations/fulchester/",
      );
    },
  },
  {
    name: "isTopLevelLocation-nested",
    description: "Returns false for nested location URLs",
    test: () => {
      expectFalse(
        isTopLevelLocation("/locations/springfield/downtown/"),
        "Should not match nested locations",
      );
      expectFalse(
        isTopLevelLocation("/locations/springfield/heights/area/"),
        "Should not match deeply nested",
      );
    },
  },
  {
    name: "isTopLevelLocation-root",
    description: "Returns false for root locations URL",
    test: () => {
      expectFalse(
        isTopLevelLocation("/locations/"),
        "Should not match /locations/",
      );
    },
  },
  {
    name: "isTopLevelLocation-null",
    description: "Returns false for null/undefined/empty",
    test: () => {
      expectFalse(isTopLevelLocation(null), "Should return false for null");
      expectFalse(
        isTopLevelLocation(undefined),
        "Should return false for undefined",
      );
      expectFalse(isTopLevelLocation(""), "Should return false for empty");
    },
  },

  // sortByNavigationKey tests
  {
    name: "sortByNavigationKey-alphabetical",
    description: "Sorts locations alphabetically by navigation key",
    test: () => {
      const locations = [
        createLocation("Zebra Town", "/locations/zebra-town/"),
        createLocation("Alpha City", "/locations/alpha-city/"),
        createLocation("Metro Area", "/locations/metro-area/"),
      ];

      const sorted = sortByNavigationKey(locations);

      expectStrictEqual(
        sorted[0].data.eleventyNavigation.key,
        "Alpha City",
        "First should be Alpha City",
      );
      expectStrictEqual(
        sorted[1].data.eleventyNavigation.key,
        "Metro Area",
        "Second should be Metro Area",
      );
      expectStrictEqual(
        sorted[2].data.eleventyNavigation.key,
        "Zebra Town",
        "Third should be Zebra Town",
      );
    },
  },
  {
    name: "sortByNavigationKey-empty",
    description: "Returns empty array for null/undefined/empty input",
    test: () => {
      expectDeepEqual(
        sortByNavigationKey(null),
        [],
        "Should return [] for null",
      );
      expectDeepEqual(
        sortByNavigationKey(undefined),
        [],
        "Should return [] for undefined",
      );
      expectDeepEqual(sortByNavigationKey([]), [], "Should return [] for []");
    },
  },
  {
    name: "sortByNavigationKey-missing-keys",
    description: "Handles locations with missing navigation keys",
    test: () => {
      const locations = [
        createLocation("Bravo", "/locations/bravo/"),
        { url: "/locations/no-key/", data: {} },
        createLocation("Alpha", "/locations/alpha/"),
      ];

      const sorted = sortByNavigationKey(locations);

      // Empty key should sort first (empty string < "Alpha")
      expectStrictEqual(sorted.length, 3, "Should have 3 items");
      expectStrictEqual(
        sorted[0].data.eleventyNavigation,
        undefined,
        "Missing key should sort first",
      );
    },
  },
  {
    name: "sortByNavigationKey-immutable",
    description: "Does not mutate the original array",
    test: () => {
      const locations = [
        createLocation("Beta", "/locations/beta/"),
        createLocation("Alpha", "/locations/alpha/"),
      ];
      const original = [...locations];

      sortByNavigationKey(locations);

      expectStrictEqual(
        locations[0].data.eleventyNavigation.key,
        "Beta",
        "Original should be unchanged",
      );
      expectDeepEqual(
        locations.map((l) => l.data.eleventyNavigation.key),
        original.map((l) => l.data.eleventyNavigation.key),
        "Original array should not be mutated",
      );
    },
  },

  // filterTopLevelLocations tests
  {
    name: "filterTopLevelLocations-filters-correctly",
    description: "Filters to only top-level locations",
    test: () => {
      const locations = [
        createLocation("Springfield", "/locations/springfield/"),
        createLocation("Downtown", "/locations/springfield/downtown/"),
        createLocation("Fulchester", "/locations/fulchester/"),
      ];

      const filtered = filterTopLevelLocations(
        locations,
        "/locations/other-page/",
      );

      expectStrictEqual(filtered.length, 2, "Should have 2 top-level items");
      expectStrictEqual(
        filtered[0].data.eleventyNavigation.key,
        "Springfield",
        "First should be Springfield",
      );
      expectStrictEqual(
        filtered[1].data.eleventyNavigation.key,
        "Fulchester",
        "Second should be Fulchester",
      );
    },
  },
  {
    name: "filterTopLevelLocations-excludes-current-page",
    description: "Excludes the current page from results",
    test: () => {
      const locations = [
        createLocation("Springfield", "/locations/springfield/"),
        createLocation("Fulchester", "/locations/fulchester/"),
        createLocation("Royston Vasey", "/locations/royston-vasey/"),
      ];

      const filtered = filterTopLevelLocations(
        locations,
        "/locations/springfield/",
      );

      expectStrictEqual(filtered.length, 2, "Should have 2 items");
      expectFalse(
        filtered.some((l) => l.url === "/locations/springfield/"),
        "Should not include current page",
      );
    },
  },
  {
    name: "filterTopLevelLocations-empty",
    description: "Returns empty array for null/undefined/empty",
    test: () => {
      expectDeepEqual(
        filterTopLevelLocations(null, "/page/"),
        [],
        "Should return [] for null",
      );
      expectDeepEqual(
        filterTopLevelLocations(undefined, "/page/"),
        [],
        "Should return [] for undefined",
      );
      expectDeepEqual(
        filterTopLevelLocations([], "/page/"),
        [],
        "Should return [] for []",
      );
    },
  },

  // formatListWithAnd tests
  {
    name: "formatListWithAnd-empty",
    description: "Returns empty string for empty array",
    test: () => {
      expectStrictEqual(formatListWithAnd([]), "", "Should return empty");
      expectStrictEqual(formatListWithAnd(null), "", "Should return empty");
      expectStrictEqual(
        formatListWithAnd(undefined),
        "",
        "Should return empty",
      );
    },
  },
  {
    name: "formatListWithAnd-single",
    description: "Returns single item without separator",
    test: () => {
      expectStrictEqual(
        formatListWithAnd(["Alpha"]),
        "Alpha",
        "Should return single item",
      );
    },
  },
  {
    name: "formatListWithAnd-two",
    description: "Returns two items with 'and'",
    test: () => {
      expectStrictEqual(
        formatListWithAnd(["Alpha", "Beta"]),
        "Alpha and Beta",
        "Should join two with 'and'",
      );
    },
  },
  {
    name: "formatListWithAnd-three",
    description: "Returns three items with commas and 'and'",
    test: () => {
      expectStrictEqual(
        formatListWithAnd(["Alpha", "Beta", "Gamma"]),
        "Alpha, Beta and Gamma",
        "Should join three correctly",
      );
    },
  },
  {
    name: "formatListWithAnd-many",
    description: "Returns many items with commas and final 'and'",
    test: () => {
      expectStrictEqual(
        formatListWithAnd(["A", "B", "C", "D", "E"]),
        "A, B, C, D and E",
        "Should join many correctly",
      );
    },
  },

  // prepareAreaList tests
  {
    name: "prepareAreaList-single-location",
    description: "Returns single location with no separator",
    test: () => {
      const locations = [
        createLocation("Alpha", "/locations/alpha/"),
        createLocation("Beta", "/locations/beta/"),
      ];

      const result = prepareAreaList(locations, "/locations/alpha/");

      expectStrictEqual(result.length, 1, "Should have 1 item");
      expectStrictEqual(result[0].name, "Beta", "Should be Beta");
      expectStrictEqual(result[0].url, "/locations/beta/", "Should have URL");
      expectStrictEqual(result[0].separator, "", "Should have no separator");
    },
  },
  {
    name: "prepareAreaList-two-locations",
    description: "Returns two locations with 'and' separator",
    test: () => {
      const locations = [
        createLocation("Alpha", "/locations/alpha/"),
        createLocation("Beta", "/locations/beta/"),
        createLocation("Gamma", "/locations/gamma/"),
      ];

      const result = prepareAreaList(locations, "/locations/alpha/");

      expectStrictEqual(result.length, 2, "Should have 2 items");
      expectStrictEqual(result[0].name, "Beta", "First should be Beta");
      expectStrictEqual(result[0].separator, " and ", "First has 'and'");
      expectStrictEqual(result[1].name, "Gamma", "Second should be Gamma");
      expectStrictEqual(result[1].separator, "", "Last has no separator");
    },
  },
  {
    name: "prepareAreaList-three-locations",
    description: "Returns three locations with comma and 'and' separators",
    test: () => {
      const locations = [
        createLocation("Delta", "/locations/delta/"),
        createLocation("Alpha", "/locations/alpha/"),
        createLocation("Beta", "/locations/beta/"),
        createLocation("Gamma", "/locations/gamma/"),
      ];

      const result = prepareAreaList(locations, "/locations/delta/");

      expectStrictEqual(result.length, 3, "Should have 3 items");
      expectStrictEqual(result[0].name, "Alpha", "First should be Alpha");
      expectStrictEqual(result[0].separator, ", ", "First has comma");
      expectStrictEqual(result[1].name, "Beta", "Second should be Beta");
      expectStrictEqual(result[1].separator, " and ", "Second has 'and'");
      expectStrictEqual(result[2].name, "Gamma", "Third should be Gamma");
      expectStrictEqual(result[2].separator, "", "Last has no separator");
    },
  },
  {
    name: "prepareAreaList-excludes-nested",
    description: "Excludes nested locations",
    test: () => {
      const locations = [
        createLocation("Alpha", "/locations/alpha/"),
        createLocation("Nested", "/locations/alpha/nested/"),
        createLocation("Beta", "/locations/beta/"),
      ];

      const result = prepareAreaList(locations, "/locations/other/");

      expectStrictEqual(result.length, 2, "Should have 2 items");
      expectFalse(
        result.some((r) => r.name === "Nested"),
        "Should not include nested",
      );
    },
  },
  {
    name: "prepareAreaList-empty",
    description: "Returns empty array when no locations remain",
    test: () => {
      const locations = [createLocation("Alpha", "/locations/alpha/")];

      const result = prepareAreaList(locations, "/locations/alpha/");

      expectDeepEqual(result, [], "Should return empty array");
    },
  },
  {
    name: "prepareAreaList-handles-missing-data",
    description: "Handles locations with missing data gracefully",
    test: () => {
      const locations = [
        { url: "/locations/alpha/" },
        createLocation("Beta", "/locations/beta/"),
      ];

      const result = prepareAreaList(locations, "/locations/other/");

      expectStrictEqual(result.length, 2, "Should have 2 items");
      expectStrictEqual(result[0].name, "", "Missing name should be empty");
      expectStrictEqual(result[0].url, "/locations/alpha/", "URL preserved");
    },
  },

  // configureAreaList tests
  {
    name: "configureAreaList-registers-filter",
    description: "Registers prepareAreaList filter with Eleventy",
    test: () => {
      const mockConfig = createMockEleventyConfig();
      configureAreaList(mockConfig);

      expectTrue(
        mockConfig.filters !== undefined,
        "Should have filters object",
      );
      expectTrue(
        typeof mockConfig.filters.prepareAreaList === "function",
        "Should register prepareAreaList filter",
      );
    },
  },
  {
    name: "configureAreaList-filter-works",
    description: "Registered filter works correctly",
    test: () => {
      const mockConfig = createMockEleventyConfig();
      configureAreaList(mockConfig);

      const locations = [
        createLocation("Beta", "/locations/beta/"),
        createLocation("Alpha", "/locations/alpha/"),
      ];

      const result = mockConfig.filters.prepareAreaList(
        locations,
        "/locations/other/",
      );

      expectStrictEqual(result.length, 2, "Should have 2 items");
      expectStrictEqual(result[0].name, "Alpha", "Should be sorted");
      expectStrictEqual(result[0].separator, " and ", "Should have separator");
    },
  },
];

export default createTestRunner("area-list", testCases);
