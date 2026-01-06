import { describe, expect, test } from "bun:test";
import {
  configureAreaList,
  filterTopLevelLocations,
  formatListWithAnd,
  isTopLevelLocation,
  prepareAreaList,
  sortByNavigationKey,
} from "#eleventy/area-list.js";
import { createMockEleventyConfig, expectProp } from "#test/test-utils.js";

const expectNames = expectProp("name");
const expectSeparators = expectProp("separator");

// Test fixtures
const createLocation = (name, url) => ({
  url,
  data: {
    eleventyNavigation: {
      key: name,
    },
  },
});

describe("area-list", () => {
  // isTopLevelLocation tests
  test("Returns true for top-level location URLs", () => {
    expect(isTopLevelLocation("/locations/springfield/")).toBe(true);
    expect(isTopLevelLocation("/locations/fulchester/")).toBe(true);
  });

  test("Returns false for nested location URLs", () => {
    expect(isTopLevelLocation("/locations/springfield/downtown/")).toBe(false);
    expect(isTopLevelLocation("/locations/springfield/heights/area/")).toBe(
      false,
    );
  });

  test("Returns false for root locations URL", () => {
    expect(isTopLevelLocation("/locations/")).toBe(false);
  });

  test("Returns false for null/undefined/empty", () => {
    expect(isTopLevelLocation(null)).toBe(false);
    expect(isTopLevelLocation(undefined)).toBe(false);
    expect(isTopLevelLocation("")).toBe(false);
  });

  // sortByNavigationKey tests
  test("Sorts locations alphabetically by navigation key", () => {
    const locations = [
      createLocation("Zebra Town", "/locations/zebra-town/"),
      createLocation("Alpha City", "/locations/alpha-city/"),
      createLocation("Metro Area", "/locations/metro-area/"),
    ];

    const sorted = sortByNavigationKey(locations);

    expect(sorted[0].data.eleventyNavigation.key).toBe("Alpha City");
    expect(sorted[1].data.eleventyNavigation.key).toBe("Metro Area");
    expect(sorted[2].data.eleventyNavigation.key).toBe("Zebra Town");
  });

  test("Returns empty array for null/undefined/empty input", () => {
    expect(sortByNavigationKey(null)).toEqual([]);
    expect(sortByNavigationKey(undefined)).toEqual([]);
    expect(sortByNavigationKey([])).toEqual([]);
  });

  test("Handles locations with missing navigation keys", () => {
    const locations = [
      createLocation("Bravo", "/locations/bravo/"),
      { url: "/locations/no-key/", data: {} },
      createLocation("Alpha", "/locations/alpha/"),
    ];

    const sorted = sortByNavigationKey(locations);

    // Empty key should sort first (empty string < "Alpha")
    expect(sorted).toHaveLength(3);
    expect(sorted[0].data.eleventyNavigation).toBe(undefined);
  });

  test("Does not mutate the original array", () => {
    const locations = [
      createLocation("Beta", "/locations/beta/"),
      createLocation("Alpha", "/locations/alpha/"),
    ];
    const original = [...locations];

    sortByNavigationKey(locations);

    expect(locations[0].data.eleventyNavigation.key).toBe("Beta");
    expect(locations.map((l) => l.data.eleventyNavigation.key)).toEqual(
      original.map((l) => l.data.eleventyNavigation.key),
    );
  });

  // filterTopLevelLocations tests
  test("Filters to only top-level locations", () => {
    const locations = [
      createLocation("Springfield", "/locations/springfield/"),
      createLocation("Downtown", "/locations/springfield/downtown/"),
      createLocation("Fulchester", "/locations/fulchester/"),
    ];

    const filtered = filterTopLevelLocations(
      locations,
      "/locations/other-page/",
    );

    expect(filtered).toHaveLength(2);
    expect(filtered[0].data.eleventyNavigation.key).toBe("Springfield");
    expect(filtered[1].data.eleventyNavigation.key).toBe("Fulchester");
  });

  test("Excludes the current page from results", () => {
    const locations = [
      createLocation("Springfield", "/locations/springfield/"),
      createLocation("Fulchester", "/locations/fulchester/"),
      createLocation("Royston Vasey", "/locations/royston-vasey/"),
    ];

    const filtered = filterTopLevelLocations(
      locations,
      "/locations/springfield/",
    );

    expect(filtered).toHaveLength(2);
    expect(filtered.some((l) => l.url === "/locations/springfield/")).toBe(
      false,
    );
  });

  test("filterTopLevelLocations returns empty array for null/undefined/empty", () => {
    expect(filterTopLevelLocations(null, "/page/")).toEqual([]);
    expect(filterTopLevelLocations(undefined, "/page/")).toEqual([]);
    expect(filterTopLevelLocations([], "/page/")).toEqual([]);
  });

  // formatListWithAnd tests
  test("Returns empty string for empty array", () => {
    expect(formatListWithAnd([])).toBe("");
    expect(formatListWithAnd(null)).toBe("");
    expect(formatListWithAnd(undefined)).toBe("");
  });

  test("Returns single item without separator", () => {
    expect(formatListWithAnd(["Alpha"])).toBe("Alpha");
  });

  test("Returns two items with 'and'", () => {
    expect(formatListWithAnd(["Alpha", "Beta"])).toBe("Alpha and Beta");
  });

  test("Returns three items with commas and 'and'", () => {
    expect(formatListWithAnd(["Alpha", "Beta", "Gamma"])).toBe(
      "Alpha, Beta and Gamma",
    );
  });

  test("Returns many items with commas and final 'and'", () => {
    expect(formatListWithAnd(["A", "B", "C", "D", "E"])).toBe(
      "A, B, C, D and E",
    );
  });

  // prepareAreaList tests
  test("Returns single location with no separator", () => {
    const locations = [
      createLocation("Alpha", "/locations/alpha/"),
      createLocation("Beta", "/locations/beta/"),
    ];

    const result = prepareAreaList(locations, "/locations/alpha/");

    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("Beta");
    expect(result[0].url).toBe("/locations/beta/");
    expect(result[0].separator).toBe("");
  });

  test("Returns two locations with 'and' separator", () => {
    const locations = [
      createLocation("Alpha", "/locations/alpha/"),
      createLocation("Beta", "/locations/beta/"),
      createLocation("Gamma", "/locations/gamma/"),
    ];

    const result = prepareAreaList(locations, "/locations/alpha/");

    expectNames(result, ["Beta", "Gamma"]);
    expectSeparators(result, [" and ", ""]);
  });

  test("Returns three locations with comma and 'and' separators", () => {
    const locations = [
      createLocation("Delta", "/locations/delta/"),
      createLocation("Alpha", "/locations/alpha/"),
      createLocation("Beta", "/locations/beta/"),
      createLocation("Gamma", "/locations/gamma/"),
    ];

    const result = prepareAreaList(locations, "/locations/delta/");

    expectNames(result, ["Alpha", "Beta", "Gamma"]);
    expectSeparators(result, [", ", " and ", ""]);
  });

  test("Excludes nested locations", () => {
    const locations = [
      createLocation("Alpha", "/locations/alpha/"),
      createLocation("Nested", "/locations/alpha/nested/"),
      createLocation("Beta", "/locations/beta/"),
    ];

    const result = prepareAreaList(locations, "/locations/other/");

    expect(result).toHaveLength(2);
    expect(result.some((r) => r.name === "Nested")).toBe(false);
  });

  test("Returns empty array when no locations remain", () => {
    const locations = [createLocation("Alpha", "/locations/alpha/")];

    const result = prepareAreaList(locations, "/locations/alpha/");

    expect(result).toEqual([]);
  });

  test("Handles locations with missing data gracefully", () => {
    const locations = [
      { url: "/locations/alpha/" },
      createLocation("Beta", "/locations/beta/"),
    ];

    const result = prepareAreaList(locations, "/locations/other/");

    expect(result).toHaveLength(2);
    expect(result[0].name).toBe("");
    expect(result[0].url).toBe("/locations/alpha/");
  });

  // configureAreaList tests
  test("Registers prepareAreaList filter with Eleventy", () => {
    const mockConfig = createMockEleventyConfig();
    configureAreaList(mockConfig);

    expect(mockConfig.filters).not.toBe(undefined);
    expect(typeof mockConfig.filters.prepareAreaList).toBe("function");
  });

  test("Registered filter works correctly", () => {
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

    expectNames(result, ["Alpha", "Beta"]);
    expectSeparators(result, [" and ", ""]);
  });
});
