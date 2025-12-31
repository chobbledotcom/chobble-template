import {
  isTopLevelLocation,
  sortByNavigationKey,
  filterTopLevelLocations,
  formatListWithAnd,
  locationToLink,
  formatAreaList,
  configureAreaList,
} from "#eleventy/area-list.js";
import {
  createMockEleventyConfig,
  createTestRunner,
  expectDeepEqual,
  expectStrictEqual,
  expectTrue,
  expectFalse,
} from "./test-utils.js";

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
      expectStrictEqual(formatListWithAnd(undefined), "", "Should return empty");
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

  // locationToLink tests
  {
    name: "locationToLink-basic",
    description: "Generates HTML link with #content anchor",
    test: () => {
      const location = createLocation("Springfield", "/locations/springfield/");
      const link = locationToLink(location);

      expectStrictEqual(
        link,
        '<a href="/locations/springfield/#content">Springfield</a>',
        "Should generate correct HTML",
      );
    },
  },
  {
    name: "locationToLink-missing-data",
    description: "Handles missing data gracefully",
    test: () => {
      const location = { url: "/test/" };
      const link = locationToLink(location);

      expectStrictEqual(
        link,
        '<a href="/test/#content"></a>',
        "Should generate link with empty name",
      );
    },
  },
  {
    name: "locationToLink-missing-url",
    description: "Handles missing URL gracefully",
    test: () => {
      const location = { data: { eleventyNavigation: { key: "Test" } } };
      const link = locationToLink(location);

      expectStrictEqual(
        link,
        '<a href="#content">Test</a>',
        "Should generate link with empty url",
      );
    },
  },

  // formatAreaList integration tests
  {
    name: "formatAreaList-full-integration",
    description: "Produces correct output for typical use case",
    test: () => {
      const locations = [
        createLocation("Zebra Town", "/locations/zebra-town/"),
        createLocation("Springfield", "/locations/springfield/"),
        createLocation("Downtown", "/locations/springfield/downtown/"),
        createLocation("Alpha City", "/locations/alpha-city/"),
      ];

      const result = formatAreaList(
        locations,
        "/locations/springfield/",
        "We also serve ",
        ".",
      );

      expectStrictEqual(
        result,
        'We also serve <a href="/locations/alpha-city/#content">Alpha City</a> and <a href="/locations/zebra-town/#content">Zebra Town</a>.',
        "Should produce formatted list",
      );
    },
  },
  {
    name: "formatAreaList-three-locations",
    description: "Handles three locations with comma and 'and'",
    test: () => {
      const locations = [
        createLocation("Charlie", "/locations/charlie/"),
        createLocation("Alpha", "/locations/alpha/"),
        createLocation("Bravo", "/locations/bravo/"),
      ];

      const result = formatAreaList(locations, "/locations/other/", "", "");

      expectStrictEqual(
        result,
        '<a href="/locations/alpha/#content">Alpha</a>, <a href="/locations/bravo/#content">Bravo</a> and <a href="/locations/charlie/#content">Charlie</a>',
        "Should handle three locations",
      );
    },
  },
  {
    name: "formatAreaList-single-location",
    description: "Handles single remaining location",
    test: () => {
      const locations = [
        createLocation("Springfield", "/locations/springfield/"),
        createLocation("Fulchester", "/locations/fulchester/"),
      ];

      const result = formatAreaList(
        locations,
        "/locations/springfield/",
        "Also: ",
        "!",
      );

      expectStrictEqual(
        result,
        'Also: <a href="/locations/fulchester/#content">Fulchester</a>!',
        "Should handle single location",
      );
    },
  },
  {
    name: "formatAreaList-empty-result",
    description: "Returns empty string when no locations remain",
    test: () => {
      const locations = [
        createLocation("Springfield", "/locations/springfield/"),
      ];

      const result = formatAreaList(
        locations,
        "/locations/springfield/",
        "Prefix",
        "Suffix",
      );

      expectStrictEqual(result, "", "Should return empty when no locations");
    },
  },
  {
    name: "formatAreaList-excludes-nested",
    description: "Excludes nested locations from output",
    test: () => {
      const locations = [
        createLocation("Springfield", "/locations/springfield/"),
        createLocation("Downtown", "/locations/springfield/downtown/"),
        createLocation("Heights", "/locations/springfield/heights/"),
      ];

      const result = formatAreaList(locations, "/locations/other/", "", "");

      expectStrictEqual(
        result,
        '<a href="/locations/springfield/#content">Springfield</a>',
        "Should only include top-level",
      );
    },
  },
  {
    name: "formatAreaList-empty-locations",
    description: "Returns empty string for empty locations array",
    test: () => {
      expectStrictEqual(
        formatAreaList([], "/page/", "Pre", "Suf"),
        "",
        "Should return empty",
      );
      expectStrictEqual(
        formatAreaList(null, "/page/", "Pre", "Suf"),
        "",
        "Should return empty for null",
      );
    },
  },
  {
    name: "formatAreaList-default-prefix-suffix",
    description: "Works with default empty prefix and suffix",
    test: () => {
      const locations = [
        createLocation("Alpha", "/locations/alpha/"),
        createLocation("Beta", "/locations/beta/"),
      ];

      const result = formatAreaList(locations, "/locations/other/");

      expectStrictEqual(
        result,
        '<a href="/locations/alpha/#content">Alpha</a> and <a href="/locations/beta/#content">Beta</a>',
        "Should work without prefix/suffix",
      );
    },
  },

  // configureAreaList tests
  {
    name: "configureAreaList-registers-shortcode",
    description: "Registers areaList shortcode with Eleventy",
    test: () => {
      const mockConfig = createMockEleventyConfig();
      configureAreaList(mockConfig);

      expectTrue(
        mockConfig.shortcodes !== undefined,
        "Should have shortcodes object",
      );
      expectTrue(
        typeof mockConfig.shortcodes.areaList === "function",
        "Should register areaList shortcode",
      );
    },
  },
  {
    name: "configureAreaList-shortcode-uses-page-url",
    description: "Shortcode uses this.page.url for current page",
    test: () => {
      const mockConfig = createMockEleventyConfig();
      configureAreaList(mockConfig);

      const locations = [
        createLocation("Alpha", "/locations/alpha/"),
        createLocation("Beta", "/locations/beta/"),
      ];

      // Simulate Eleventy's `this` context
      const context = { page: { url: "/locations/alpha/" } };
      const result = mockConfig.shortcodes.areaList.call(
        context,
        locations,
        "Serving ",
        ".",
      );

      expectStrictEqual(
        result,
        'Serving <a href="/locations/beta/#content">Beta</a>.',
        "Should exclude current page URL",
      );
    },
  },
  {
    name: "configureAreaList-shortcode-handles-missing-page",
    description: "Shortcode handles missing page context gracefully",
    test: () => {
      const mockConfig = createMockEleventyConfig();
      configureAreaList(mockConfig);

      const locations = [createLocation("Alpha", "/locations/alpha/")];

      // Call with empty context
      const result = mockConfig.shortcodes.areaList.call({}, locations, "", "");

      expectStrictEqual(
        result,
        '<a href="/locations/alpha/#content">Alpha</a>',
        "Should work without page context",
      );
    },
  },
];

export default createTestRunner("area-list", testCases);
