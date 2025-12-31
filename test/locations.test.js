import {
  configureLocations,
  getRootLocations,
  getSiblingLocations,
} from "#collections/locations.js";
import {
  createMockEleventyConfig,
  createTestRunner,
  expectDeepEqual,
  expectFunctionType,
  expectStrictEqual,
} from "./test-utils.js";

const testCases = [
  {
    name: "getRootLocations-basic",
    description: "Filters locations without parent",
    test: () => {
      const locations = [
        { data: { title: "London" } },
        { data: { title: "Manchester", parentLocation: "uk" } },
        { data: { title: "UK" } },
      ];

      const result = getRootLocations(locations);

      expectStrictEqual(result.length, 2, "Should return 2 root locations");
      expectStrictEqual(
        result[0].data.title,
        "London",
        "Should include London",
      );
      expectStrictEqual(result[1].data.title, "UK", "Should include UK");
    },
  },
  {
    name: "getRootLocations-null",
    description: "Handles null/undefined input",
    test: () => {
      expectDeepEqual(
        getRootLocations(null),
        [],
        "Should return empty for null",
      );
      expectDeepEqual(
        getRootLocations(undefined),
        [],
        "Should return empty for undefined",
      );
    },
  },
  {
    name: "getSiblingLocations-basic",
    description: "Gets sibling locations excluding current page",
    test: () => {
      const locations = [
        { data: { title: "Cleaning", parentLocation: "london" }, url: "/london/cleaning/" },
        { data: { title: "Repairs", parentLocation: "london" }, url: "/london/repairs/" },
        { data: { title: "Painting", parentLocation: "london" }, url: "/london/painting/" },
        { data: { title: "Plumbing", parentLocation: "manchester" }, url: "/manchester/plumbing/" },
      ];

      const result = getSiblingLocations(locations, "london", "/london/cleaning/");

      expectStrictEqual(result.length, 2, "Should return 2 siblings");
      expectStrictEqual(
        result[0].data.title,
        "Repairs",
        "Should include Repairs",
      );
      expectStrictEqual(
        result[1].data.title,
        "Painting",
        "Should include Painting",
      );
    },
  },
  {
    name: "getSiblingLocations-no-siblings",
    description: "Returns empty when no siblings exist",
    test: () => {
      const locations = [
        { data: { title: "Cleaning", parentLocation: "london" }, url: "/london/cleaning/" },
        { data: { title: "Plumbing", parentLocation: "manchester" }, url: "/manchester/plumbing/" },
      ];

      const result = getSiblingLocations(locations, "london", "/london/cleaning/");

      expectStrictEqual(result.length, 0, "Should return no siblings");
    },
  },
  {
    name: "getSiblingLocations-null-inputs",
    description: "Handles null/undefined inputs",
    test: () => {
      const locations = [
        { data: { title: "Cleaning", parentLocation: "london" }, url: "/london/cleaning/" },
      ];

      expectDeepEqual(
        getSiblingLocations(null, "london", "/url/"),
        [],
        "Should return empty for null locations",
      );
      expectDeepEqual(
        getSiblingLocations(locations, null, "/url/"),
        [],
        "Should return empty for null parent",
      );
      expectStrictEqual(
        getSiblingLocations(locations, "london", null).length,
        1,
        "Should still filter with null currentUrl",
      );
    },
  },
  {
    name: "configureLocations-basic",
    description: "Configures location filters",
    test: () => {
      const mockConfig = createMockEleventyConfig();

      configureLocations(mockConfig);

      expectFunctionType(
        mockConfig.filters,
        "getRootLocations",
        "Should add getRootLocations filter",
      );
      expectFunctionType(
        mockConfig.filters,
        "getSiblingLocations",
        "Should add getSiblingLocations filter",
      );
      expectStrictEqual(
        mockConfig.filters.getRootLocations,
        getRootLocations,
        "Should use correct filter function",
      );
      expectStrictEqual(
        mockConfig.filters.getSiblingLocations,
        getSiblingLocations,
        "Should use correct filter function",
      );
    },
  },
];

export default createTestRunner("locations", testCases);
