import { describe, expect, test } from "bun:test";
import {
  configureLocations,
  getRootLocations,
  getSiblingLocations,
} from "#collections/locations.js";
import {
  createMockEleventyConfig,
  data,
  expectResultTitles,
} from "#test/test-utils.js";

// ============================================
// Curried Data Factories
// ============================================

/** Root location factory (no parent, no url needed) */
const rootLocation = data({})("title");

/** Child location factory with parent and url */
const childLocation = (title, parent, url) => ({
  data: { title, parentLocation: parent },
  url,
});

describe("locations", () => {
  test("Filters locations without parent", () => {
    const locations = [
      ...rootLocation(["London"], ["UK"]),
      { data: { title: "Manchester", parentLocation: "uk" } },
    ];

    const result = getRootLocations(locations);

    expectResultTitles(result, ["London", "UK"]);
  });

  test("Gets sibling locations excluding current page", () => {
    const locations = [
      childLocation("Cleaning", "london", "/london/cleaning/"),
      childLocation("Repairs", "london", "/london/repairs/"),
      childLocation("Painting", "london", "/london/painting/"),
      childLocation("Plumbing", "manchester", "/manchester/plumbing/"),
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
      childLocation("Cleaning", "london", "/london/cleaning/"),
      childLocation("Plumbing", "manchester", "/manchester/plumbing/"),
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
