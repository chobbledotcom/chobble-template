import { describe, expect, test } from "bun:test";
import { configureAreaList } from "#eleventy/area-list.js";
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

// Create multiple locations from [name, url] tuples
const createLocations = (tuples) =>
  tuples.map(([name, url]) => createLocation(name, url));

describe("area-list", () => {
  // Get the filter from a configured mock
  const getFilter = () => {
    const mockConfig = createMockEleventyConfig();
    configureAreaList(mockConfig);
    return mockConfig.filters.prepareAreaList;
  };

  test("Registers prepareAreaList filter with Eleventy", () => {
    const mockConfig = createMockEleventyConfig();
    configureAreaList(mockConfig);

    expect(typeof mockConfig.filters.prepareAreaList).toBe("function");
  });

  test("Returns single location with no separator", () => {
    const prepareAreaList = getFilter();
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
    const prepareAreaList = getFilter();
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
    const prepareAreaList = getFilter();
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

  test("Excludes nested locations (non-top-level)", () => {
    const prepareAreaList = getFilter();
    const locations = createLocations([
      ["Alpha", "/locations/alpha/"],
      ["Nested", "/locations/alpha/nested/"],
      ["Deeply Nested", "/locations/alpha/nested/deep/"],
      ["Beta", "/locations/beta/"],
    ]);

    const result = prepareAreaList(locations, "/locations/other/");

    expect(result).toHaveLength(2);
    expectNames(result, ["Alpha", "Beta"]);
  });

  test("Excludes current page from results", () => {
    const prepareAreaList = getFilter();
    const locations = createLocations([
      ["Springfield", "/locations/springfield/"],
      ["Fulchester", "/locations/fulchester/"],
      ["Royston Vasey", "/locations/royston-vasey/"],
    ]);

    const result = prepareAreaList(locations, "/locations/springfield/");

    expect(result).toHaveLength(2);
    expect(result.some((l) => l.url === "/locations/springfield/")).toBe(false);
  });

  test("Sorts locations alphabetically by navigation key", () => {
    const prepareAreaList = getFilter();
    const locations = createLocations([
      ["Zebra Town", "/locations/zebra-town/"],
      ["Alpha City", "/locations/alpha-city/"],
      ["Metro Area", "/locations/metro-area/"],
    ]);

    const result = prepareAreaList(locations, "/locations/other/");

    expectNames(result, ["Alpha City", "Metro Area", "Zebra Town"]);
  });

  test("Returns empty array when no locations remain after filtering", () => {
    const prepareAreaList = getFilter();
    const locations = createLocations([["Alpha", "/locations/alpha/"]]);

    const result = prepareAreaList(locations, "/locations/alpha/");

    expect(result).toEqual([]);
  });

  test("Returns empty array for empty input", () => {
    const prepareAreaList = getFilter();

    const result = prepareAreaList([], "/locations/alpha/");

    expect(result).toEqual([]);
  });

  test("Handles locations with missing navigation data gracefully", () => {
    const prepareAreaList = getFilter();
    const locations = [
      { url: "/locations/alpha/" },
      createLocation("Beta", "/locations/beta/"),
    ];

    const result = prepareAreaList(locations, "/locations/other/");

    expect(result).toHaveLength(2);
    expect(result[0].name).toBe("");
    expect(result[0].url).toBe("/locations/alpha/");
    expect(result[1].name).toBe("Beta");
  });

  test("Excludes root locations URL", () => {
    const prepareAreaList = getFilter();
    const locations = [
      { url: "/locations/", data: { eleventyNavigation: { key: "All" } } },
      createLocation("Alpha", "/locations/alpha/"),
    ];

    const result = prepareAreaList(locations, "/locations/other/");

    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("Alpha");
  });
});
