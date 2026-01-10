import { describe, expect, test } from "bun:test";
import {
  configureLocations,
  getRootLocations,
  getSiblingLocations,
} from "#collections/locations.js";
import {
  createMockEleventyConfig,
  expectResultTitles,
} from "#test/test-utils.js";

describe("locations", () => {
  test("Filters locations without parent", () => {
    const locations = [
      { data: { title: "London" } },
      { data: { title: "Manchester", parentLocation: "uk" } },
      { data: { title: "UK" } },
    ];

    const result = getRootLocations(locations);

    expectResultTitles(result, ["London", "UK"]);
  });

  test("Gets sibling locations excluding current page", () => {
    const locations = [
      {
        data: { title: "Cleaning", parentLocation: "london" },
        url: "/london/cleaning/",
      },
      {
        data: { title: "Repairs", parentLocation: "london" },
        url: "/london/repairs/",
      },
      {
        data: { title: "Painting", parentLocation: "london" },
        url: "/london/painting/",
      },
      {
        data: { title: "Plumbing", parentLocation: "manchester" },
        url: "/manchester/plumbing/",
      },
    ];

    const result = getSiblingLocations(
      locations,
      "london",
      "/london/cleaning/",
    );

    expectResultTitles(result, ["Repairs", "Painting"]);
  });

  test("Returns empty when no siblings exist", () => {
    const locations = [
      {
        data: { title: "Cleaning", parentLocation: "london" },
        url: "/london/cleaning/",
      },
      {
        data: { title: "Plumbing", parentLocation: "manchester" },
        url: "/manchester/plumbing/",
      },
    ];

    const result = getSiblingLocations(
      locations,
      "london",
      "/london/cleaning/",
    );

    expect(result.length).toBe(0);
  });

  test("Configures location filters", () => {
    const mockConfig = createMockEleventyConfig();

    configureLocations(mockConfig);

    expect(typeof mockConfig.filters.getRootLocations).toBe("function");
    expect(typeof mockConfig.filters.getSiblingLocations).toBe("function");
    expect(mockConfig.filters.getRootLocations).toBe(getRootLocations);
    expect(mockConfig.filters.getSiblingLocations).toBe(getSiblingLocations);
  });
});
