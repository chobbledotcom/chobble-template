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
  getCollectionFrom,
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

// ============================================
// Locations Collection Thumbnail Tests
// ============================================

/** Helper to create location items with fileSlug */
const locationItem = (slug, data = {}) => ({
  fileSlug: slug,
  data: { title: `Location ${slug}`, ...data },
});

/** Curried helper to get the locations collection from a configured mock */
const getCollection = getCollectionFrom("locations")(configureLocations);

describe("locations collection", () => {
  test("returns empty array when no locations exist", () => {
    const result = getCollection({ locations: [] });
    expect(result).toEqual([]);
  });

  test("preserves location data", () => {
    const locations = [locationItem("london", { title: "London" })];
    const result = getCollection({ locations });
    expect(result[0].data.title).toBe("London");
  });

  test("location keeps own thumbnail when set", () => {
    const locations = [locationItem("london", { thumbnail: "london.jpg" })];
    const result = getCollection({ locations });
    expect(result[0].data.thumbnail).toBe("london.jpg");
  });

  test("parent inherits from child with lowest order", () => {
    const locations = [
      locationItem("uk"),
      locationItem("manchester", {
        parentLocation: "uk",
        thumbnail: "manchester.jpg",
        order: 2,
      }),
      locationItem("london", {
        parentLocation: "uk",
        thumbnail: "london.jpg",
        order: 1,
      }),
    ];
    const result = getCollection({ locations });
    // UK inherits from London (order 1) not Manchester (order 2)
    expect(result[0].data.thumbnail).toBe("london.jpg");
  });

  test("inherits thumbnail recursively from grandchild", () => {
    const locations = [
      locationItem("uk"),
      locationItem("london", { parentLocation: "uk", order: 1 }),
      locationItem("central", {
        parentLocation: "london",
        thumbnail: "central.jpg",
        order: 1,
      }),
    ];
    const result = getCollection({ locations });
    // UK -> London -> Central, so UK should inherit from Central
    expect(result[0].data.thumbnail).toBe("central.jpg");
  });

  test("skips children without thumbnails", () => {
    const locations = [
      locationItem("uk"),
      locationItem("london", { parentLocation: "uk", order: 1 }),
      locationItem("manchester", {
        parentLocation: "uk",
        thumbnail: "manchester.jpg",
        order: 2,
      }),
    ];
    const result = getCollection({ locations });
    expect(result[0].data.thumbnail).toBe("manchester.jpg");
  });

  test("no thumbnail when no children have thumbnails", () => {
    const locations = [
      locationItem("uk"),
      locationItem("london", { parentLocation: "uk", order: 1 }),
    ];
    const result = getCollection({ locations });
    expect(result[0].data.thumbnail).toBeUndefined();
  });
});
