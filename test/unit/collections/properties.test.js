import { describe, expect, test } from "bun:test";
import {
  configureProperties,
  createPropertiesCollection,
  getFeaturedProperties,
  getPropertiesByLocation,
  propertiesWithReviewsPage,
  propertyReviewsRedirects,
} from "#collections/properties.js";
import configData from "#data/config.json" with { type: "json" };
import {
  collectionApi,
  createMockEleventyConfig,
  expectGalleries,
  expectResultTitles,
  items,
} from "#test/test-utils.js";

// Read truncate limit from config for portable tests across inherited sites
const TRUNCATE_LIMIT = configData.reviews_truncate_limit || 10;

describe("properties", () => {
  test("Creates properties collection from API", () => {
    const testItems = items([
      ["Property 1", { gallery: ["img1.jpg"] }],
      ["Property 2", {}],
      ["Property 3", { gallery: ["img3.jpg"] }],
    ]);

    const result = createPropertiesCollection(collectionApi(testItems));

    expectGalleries(result, [["img1.jpg"], undefined, ["img3.jpg"]]);
  });

  test("Handles empty property collection", () => {
    const result = createPropertiesCollection(collectionApi([]));

    expect(result.length).toBe(0);
  });

  test("Filters properties by location slug", () => {
    const properties = [
      {
        data: {
          title: "Property 1",
          locations: ["springfield", "shelbyville"],
        },
      },
      { data: { title: "Property 2", locations: ["capital-city"] } },
      { data: { title: "Property 3", locations: ["springfield"] } },
      { data: { title: "Property 4" } },
    ];

    const result = getPropertiesByLocation(properties, "springfield");

    expectResultTitles(result, ["Property 1", "Property 3"]);
  });

  test("Handles properties without locations", () => {
    const properties = [
      { data: { title: "Property 1" } },
      { data: { title: "Property 2", locations: null } },
      { data: { title: "Property 3", locations: [] } },
    ];

    const result = getPropertiesByLocation(properties, "springfield");

    expect(result.length).toBe(0);
  });

  test("Handles null/undefined inputs", () => {
    const properties = [
      { data: { title: "Property 1", locations: ["springfield"] } },
    ];

    expect(getPropertiesByLocation(null, "springfield")).toEqual([]);
    expect(getPropertiesByLocation(properties, null)).toEqual([]);
    expect(getPropertiesByLocation(undefined, "springfield")).toEqual([]);
    expect(getPropertiesByLocation(properties, undefined)).toEqual([]);
  });

  test("Returns empty when no properties match location", () => {
    const properties = [
      { data: { title: "Property 1", locations: ["springfield"] } },
      { data: { title: "Property 2", locations: ["shelbyville"] } },
    ];

    const result = getPropertiesByLocation(properties, "capital-city");

    expect(result.length).toBe(0);
  });

  test("Sorts properties by order field", () => {
    // Use unique slug to avoid memoization cache collision with other tests
    const properties = [
      { data: { title: "Property C", locations: ["shelbyville"], order: 3 } },
      { data: { title: "Property A", locations: ["shelbyville"], order: 1 } },
      { data: { title: "Property B", locations: ["shelbyville"], order: 2 } },
    ];

    const result = getPropertiesByLocation(properties, "shelbyville");

    expectResultTitles(result, ["Property A", "Property B", "Property C"]);
  });

  test("Filters properties by featured flag", () => {
    const properties = [
      { data: { title: "Property 1", featured: true } },
      { data: { title: "Property 2", featured: false } },
      { data: { title: "Property 3", featured: true } },
      { data: { title: "Property 4" } },
    ];

    const result = getFeaturedProperties(properties);

    expectResultTitles(result, ["Property 1", "Property 3"]);
  });

  test("Returns empty array when no properties are featured", () => {
    const properties = [
      { data: { title: "Property 1", featured: false } },
      { data: { title: "Property 2" } },
    ];

    const result = getFeaturedProperties(properties);

    expect(result.length).toBe(0);
  });

  test("Configures properties collection and filters", () => {
    const mockConfig = createMockEleventyConfig();

    configureProperties(mockConfig);

    expect(typeof mockConfig.collections.properties).toBe("function");
    expect(typeof mockConfig.collections.propertiesWithReviewsPage).toBe(
      "function",
    );
    expect(typeof mockConfig.collections.propertyReviewsRedirects).toBe(
      "function",
    );
    expect(typeof mockConfig.filters.getPropertiesByLocation).toBe("function");
    expect(typeof mockConfig.filters.getFeaturedProperties).toBe("function");

    expect(mockConfig.filters.getPropertiesByLocation).toBe(
      getPropertiesByLocation,
    );
    expect(mockConfig.filters.getFeaturedProperties).toBe(
      getFeaturedProperties,
    );
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
        if (tag === "property") return properties;
        if (tag === "review") return reviews;
        return [];
      },
    };
  };

  test("Returns only properties exceeding the truncate limit", () => {
    // property-a gets limit+1 reviews (above limit), property-b gets limit reviews (at limit)
    const mockCollectionApi = createPropertyReviewFixture(
      TRUNCATE_LIMIT + 1,
      TRUNCATE_LIMIT,
    );
    const result = propertiesWithReviewsPage(mockCollectionApi);

    // Only property-a (above limit) should be included, not property-b (at limit)
    expect(result.length).toBe(1);
    expect(result[0].fileSlug).toBe("property-a");
  });

  test("Returns redirect data for properties not needing separate pages", () => {
    // property-a gets limit reviews (at limit), property-b gets limit+1 reviews (above limit)
    const mockCollectionApi = createPropertyReviewFixture(
      TRUNCATE_LIMIT,
      TRUNCATE_LIMIT + 1,
    );
    const result = propertyReviewsRedirects(mockCollectionApi);

    // Only property-a (at limit) should get redirect, not property-b (above limit)
    expect(result.length).toBe(1);
    expect(result[0].fileSlug).toBe("property-a");
    // Verify the return structure includes the item reference
    expect(result[0].item.fileSlug).toBe("property-a");
  });

  test("Filter functions should be pure and not modify inputs", () => {
    const originalProperties = [
      { data: { title: "Property 1", locations: ["springfield"] } },
    ];

    const propertiesCopy = structuredClone(originalProperties);

    getPropertiesByLocation(propertiesCopy, "springfield");

    expect(propertiesCopy).toEqual(originalProperties);
  });
});
