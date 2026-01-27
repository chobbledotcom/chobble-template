import { describe, expect, test } from "bun:test";
import { configureProperties } from "#collections/properties.js";
import configData from "#data/config.json" with { type: "json" };
import {
  collectionApi,
  createMockEleventyConfig,
  data,
  expectGalleries,
  expectResultTitles,
  items,
  withConfiguredMock,
} from "#test/test-utils.js";

// ============================================
// Curried Data Factories
// ============================================

/** Property factory: (defaults) => (fields...) => (rows...) => items */
const property = data({});

/** Location-based property: creates properties with title and locations */
const locationProperty = property("title", "locations");

/** Ordered property: creates properties with title, locations, and order */
const orderedProperty = property("title", "locations", "order");

// Create configured mock using curried helper
const createPropertiesMock = withConfiguredMock(configureProperties);

// Read truncate limit from config for portable tests across inherited sites
const TRUNCATE_LIMIT = configData.reviews_truncate_limit || 10;

describe("properties", () => {
  test("Creates properties collection from API", () => {
    const { collections } = createPropertiesMock();
    const testItems = items([
      ["Property 1", { gallery: ["img1.jpg"] }],
      ["Property 2", {}],
      ["Property 3", { gallery: ["img3.jpg"] }],
    ]);

    const result = collections.properties(collectionApi(testItems));

    expectGalleries(result, [["img1.jpg"], undefined, ["img3.jpg"]]);
  });

  test("Handles empty property collection", () => {
    const { collections } = createPropertiesMock();

    const result = collections.properties(collectionApi([]));

    expect(result.length).toBe(0);
  });

  test("Filters properties by location slug", () => {
    const { filters } = createPropertiesMock();
    const properties = locationProperty(
      ["Property 1", ["springfield", "shelbyville"]],
      ["Property 2", ["capital-city"]],
      ["Property 3", ["springfield"]],
      ["Property 4", undefined],
    );

    const result = filters.getPropertiesByLocation(properties, "springfield");

    expectResultTitles(result, ["Property 1", "Property 3"]);
  });

  test("Handles properties without locations", () => {
    const { filters } = createPropertiesMock();
    const properties = locationProperty(
      ["Property 1", undefined],
      ["Property 2", null],
      ["Property 3", []],
    );

    const result = filters.getPropertiesByLocation(properties, "springfield");

    expect(result.length).toBe(0);
  });

  test("Handles null/undefined inputs", () => {
    const { filters } = createPropertiesMock();
    const properties = locationProperty(["Property 1", ["springfield"]]);

    expect(filters.getPropertiesByLocation(null, "springfield")).toEqual([]);
    expect(filters.getPropertiesByLocation(properties, null)).toEqual([]);
    expect(filters.getPropertiesByLocation(undefined, "springfield")).toEqual(
      [],
    );
    expect(filters.getPropertiesByLocation(properties, undefined)).toEqual([]);
  });

  test("Returns empty when no properties match location", () => {
    const { filters } = createPropertiesMock();
    const properties = locationProperty(
      ["Property 1", ["springfield"]],
      ["Property 2", ["shelbyville"]],
    );

    const result = filters.getPropertiesByLocation(properties, "capital-city");

    expect(result.length).toBe(0);
  });

  test("Sorts properties by order field", () => {
    const { filters } = createPropertiesMock();
    // Use unique slug to avoid memoization cache collision with other tests
    const properties = orderedProperty(
      ["Property C", ["shelbyville"], 3],
      ["Property A", ["shelbyville"], 1],
      ["Property B", ["shelbyville"], 2],
    );

    const result = filters.getPropertiesByLocation(properties, "shelbyville");

    expectResultTitles(result, ["Property A", "Property B", "Property C"]);
  });

  test("Configures properties collection and filters", () => {
    const mockConfig = createMockEleventyConfig();

    configureProperties(mockConfig);

    // Verify all expected collections and filters are registered
    expect(typeof mockConfig.collections.properties).toBe("function");
    expect(typeof mockConfig.collections.propertiesWithReviewsPage).toBe(
      "function",
    );
    expect(typeof mockConfig.collections.propertyReviewsRedirects).toBe(
      "function",
    );
    expect(typeof mockConfig.filters.getPropertiesByLocation).toBe("function");
  });

  // Helper to create property review test fixtures
  const createPropertyReviewFixture = (countA, countB) => {
    const reviews = [];
    for (let i = 0; i < countA; i++) {
      reviews.push({
        data: { properties: ["property-a"], rating: 5 },
        date: new Date(`2024-01-${String((i % 28) + 1).padStart(2, "0")}`),
      });
    }
    for (let i = 0; i < countB; i++) {
      reviews.push({
        data: { properties: ["property-b"], rating: 4 },
        date: new Date(`2024-02-${String((i % 28) + 1).padStart(2, "0")}`),
      });
    }
    const properties = [
      { fileSlug: "property-a", data: { title: "Property A" } },
      { fileSlug: "property-b", data: { title: "Property B" } },
    ];
    return {
      getFilteredByTag: (tag) => {
        if (tag === "properties") return properties;
        if (tag === "reviews") return reviews;
        return [];
      },
    };
  };

  test("Returns only properties exceeding the truncate limit", () => {
    const { collections } = createPropertiesMock();
    // property-a gets limit+1 reviews (above limit), property-b gets limit reviews (at limit)
    const mockCollectionApi = createPropertyReviewFixture(
      TRUNCATE_LIMIT + 1,
      TRUNCATE_LIMIT,
    );
    const result = collections.propertiesWithReviewsPage(mockCollectionApi);

    // Only property-a (above limit) should be included, not property-b (at limit)
    expect(result.length).toBe(1);
    expect(result[0].fileSlug).toBe("property-a");
  });

  test("Returns redirect data for properties not needing separate pages", () => {
    const { collections } = createPropertiesMock();
    // property-a gets limit reviews (at limit), property-b gets limit+1 reviews (above limit)
    const mockCollectionApi = createPropertyReviewFixture(
      TRUNCATE_LIMIT,
      TRUNCATE_LIMIT + 1,
    );
    const result = collections.propertyReviewsRedirects(mockCollectionApi);

    // Only property-a (at limit) should get redirect, not property-b (above limit)
    expect(result.length).toBe(1);
    expect(result[0].fileSlug).toBe("property-a");
    // Verify the return structure includes the item reference
    expect(result[0].item.fileSlug).toBe("property-a");
  });

  test("Filter functions should be pure and not modify inputs", () => {
    const { filters } = createPropertiesMock();
    const originalProperties = locationProperty([
      "Property 1",
      ["springfield"],
    ]);
    const propertiesCopy = structuredClone(originalProperties);

    filters.getPropertiesByLocation(propertiesCopy, "springfield");

    expect(propertiesCopy).toEqual(originalProperties);
  });
});
