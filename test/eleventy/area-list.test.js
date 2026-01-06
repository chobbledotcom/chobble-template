import { describe, expect, test } from "bun:test";
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
  expectArrayProp,
  expectProp,
} from "#test/test-utils.js";

const expectNames = expectProp("name");
const expectSeparators = expectProp("separator");
const expectNavKeys = expectArrayProp((l) => l.data.eleventyNavigation?.key);

// Test fixtures
const createLocation = (name, url) => ({
  url,
  data: {
    eleventyNavigation: {
      key: name,
    },
  },
});

// Create multiple locations from [name, url] tuples
const createLocations = (tuples) =>
  tuples.map(([name, url]) => createLocation(name, url));

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
    const locations = createLocations([
      ["Zebra Town", "/locations/zebra-town/"],
      ["Alpha City", "/locations/alpha-city/"],
      ["Metro Area", "/locations/metro-area/"],
    ]);

    const sorted = sortByNavigationKey(locations);

    expectNavKeys(sorted, ["Alpha City", "Metro Area", "Zebra Town"]);
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
    const locations = createLocations([
      ["Beta", "/locations/beta/"],
      ["Alpha", "/locations/alpha/"],
    ]);
    const original = [...locations];

    sortByNavigationKey(locations);

    expect(locations[0].data.eleventyNavigation.key).toBe("Beta");
    expect(locations.map((l) => l.data.eleventyNavigation.key)).toEqual(
      original.map((l) => l.data.eleventyNavigation.key),
    );
  });

  // filterTopLevelLocations tests
  test("Filters to only top-level locations", () => {
    const locations = createLocations([
      ["Springfield", "/locations/springfield/"],
      ["Downtown", "/locations/springfield/downtown/"],
      ["Fulchester", "/locations/fulchester/"],
    ]);

    const filtered = filterTopLevelLocations(
      locations,
      "/locations/other-page/",
    );

    expectNavKeys(filtered, ["Springfield", "Fulchester"]);
  });

  test("Excludes the current page from results", () => {
    const locations = createLocations([
      ["Springfield", "/locations/springfield/"],
      ["Fulchester", "/locations/fulchester/"],
      ["Royston Vasey", "/locations/royston-vasey/"],
    ]);

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
    const locations = createLocations([
      ["Alpha", "/locations/alpha/"],
      ["Beta", "/locations/beta/"],
    ]);

    const result = prepareAreaList(locations, "/locations/alpha/");

    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("Beta");
    expect(result[0].url).toBe("/locations/beta/");
    expect(result[0].separator).toBe("");
  });

  test("Returns two locations with 'and' separator", () => {
    const locations = createLocations([
      ["Alpha", "/locations/alpha/"],
      ["Beta", "/locations/beta/"],
      ["Gamma", "/locations/gamma/"],
    ]);

    const result = prepareAreaList(locations, "/locations/alpha/");

    expectNames(result, ["Beta", "Gamma"]);
    expectSeparators(result, [" and ", ""]);
  });

  test("Returns three locations with comma and 'and' separators", () => {
    const locations = createLocations([
      ["Delta", "/locations/delta/"],
      ["Alpha", "/locations/alpha/"],
      ["Beta", "/locations/beta/"],
      ["Gamma", "/locations/gamma/"],
    ]);

    const result = prepareAreaList(locations, "/locations/delta/");

    expectNames(result, ["Alpha", "Beta", "Gamma"]);
    expectSeparators(result, [", ", " and ", ""]);
  });

  test("Excludes nested locations", () => {
    const locations = createLocations([
      ["Alpha", "/locations/alpha/"],
      ["Nested", "/locations/alpha/nested/"],
      ["Beta", "/locations/beta/"],
    ]);

    const result = prepareAreaList(locations, "/locations/other/");

    expect(result).toHaveLength(2);
    expect(result.some((r) => r.name === "Nested")).toBe(false);
  });

  test("Returns empty array when no locations remain", () => {
    const locations = createLocations([["Alpha", "/locations/alpha/"]]);

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

    const locations = createLocations([
      ["Beta", "/locations/beta/"],
      ["Alpha", "/locations/alpha/"],
    ]);

    const result = mockConfig.filters.prepareAreaList(
      locations,
      "/locations/other/",
    );

    expectNames(result, ["Alpha", "Beta"]);
    expectSeparators(result, [" and ", ""]);
  });
});
