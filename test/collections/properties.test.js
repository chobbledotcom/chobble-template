import { describe, test, expect } from "bun:test";
import {
  configureProperties,
  createPropertiesCollection,
  getFeaturedProperties,
  getPropertiesByLocation,
  propertiesWithReviewsPage,
  propertyReviewsRedirects,
} from "#collections/properties.js";
import { createMockEleventyConfig } from "#test/test-utils.js";

describe("properties", () => {
  test("Creates properties collection from API", () => {
    const mockProperties = [
      { data: { title: "Property 1", gallery: ["img1.jpg"] } },
      { data: { title: "Property 2" } },
      { data: { title: "Property 3", gallery: ["img3.jpg"] } },
    ];

    const mockCollectionApi = {
      getFilteredByTag: (tag) => {
        expect(tag).toBe("property");
        return mockProperties;
      },
    };

    const result = createPropertiesCollection(mockCollectionApi);

    expect(result.length).toBe(3);
    expect(result[0].data.gallery).toEqual(["img1.jpg"]);
    expect(result[1].data.gallery).toBe(undefined);
    expect(result[2].data.gallery).toEqual(["img3.jpg"]);
  });

  test("Handles empty property collection", () => {
    const mockCollectionApi = {
      getFilteredByTag: () => [],
    };

    const result = createPropertiesCollection(mockCollectionApi);

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

    expect(result.length).toBe(2);
    expect(result[0].data.title).toBe("Property 1");
    expect(result[1].data.title).toBe("Property 3");
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

    expect(result.length).toBe(3);
    expect(result[0].data.title).toBe("Property A");
    expect(result[1].data.title).toBe("Property B");
    expect(result[2].data.title).toBe("Property C");
  });

  test("Filters properties by featured flag", () => {
    const properties = [
      { data: { title: "Property 1", featured: true } },
      { data: { title: "Property 2", featured: false } },
      { data: { title: "Property 3", featured: true } },
      { data: { title: "Property 4" } },
    ];

    const result = getFeaturedProperties(properties);

    expect(result.length).toBe(2);
    expect(result[0].data.title).toBe("Property 1");
    expect(result[1].data.title).toBe("Property 3");
  });

  test("Returns empty array when no properties are featured", () => {
    const properties = [
      { data: { title: "Property 1", featured: false } },
      { data: { title: "Property 2" } },
    ];

    const result = getFeaturedProperties(properties);

    expect(result.length).toBe(0);
  });

  test("Handles null/undefined properties array", () => {
    expect(getFeaturedProperties(null)).toEqual([]);
    expect(getFeaturedProperties(undefined)).toEqual([]);
  });

  test("Configures properties collection and filters", () => {
    const mockConfig = createMockEleventyConfig();

    configureProperties(mockConfig);

    expect(typeof mockConfig.collections.properties).toBe("function");
    expect(typeof mockConfig.collections.propertiesWithReviewsPage).toBe("function");
    expect(typeof mockConfig.collections.propertyReviewsRedirects).toBe("function");
    expect(typeof mockConfig.filters.getPropertiesByLocation).toBe("function");
    expect(typeof mockConfig.filters.getFeaturedProperties).toBe("function");

    expect(mockConfig.filters.getPropertiesByLocation).toBe(getPropertiesByLocation);
    expect(mockConfig.filters.getFeaturedProperties).toBe(getFeaturedProperties);
  });

  test("Returns only properties exceeding the truncate limit", () => {
    // 11 reviews for property-a (above limit of 10), 10 for property-b (at limit)
    const reviews = [];
    for (let i = 0; i < 11; i++) {
      reviews.push({
        data: { properties: ["property-a"], rating: 5 },
        date: new Date(`2024-01-${String(i + 1).padStart(2, "0")}`),
      });
    }
    for (let i = 0; i < 10; i++) {
      reviews.push({
        data: { properties: ["property-b"], rating: 4 },
        date: new Date(`2024-02-${String(i + 1).padStart(2, "0")}`),
      });
    }

    const properties = [
      { fileSlug: "property-a", data: { title: "Property A" } },
      { fileSlug: "property-b", data: { title: "Property B" } },
    ];

    const mockCollectionApi = {
      getFilteredByTag: (tag) => {
        if (tag === "property") return properties;
        if (tag === "review") return reviews;
        return [];
      },
    };

    const result = propertiesWithReviewsPage(mockCollectionApi);

    // Only property-a (11 reviews) should be included, not property-b (10 reviews)
    expect(result.length).toBe(1);
    expect(result[0].fileSlug).toBe("property-a");
  });

  test("Returns redirect data for properties not needing separate pages", () => {
    // 10 reviews for property-a (at limit), 11 for property-b (above limit)
    const reviews = [];
    for (let i = 0; i < 10; i++) {
      reviews.push({
        data: { properties: ["property-a"], rating: 5 },
        date: new Date(`2024-01-${String(i + 1).padStart(2, "0")}`),
      });
    }
    for (let i = 0; i < 11; i++) {
      reviews.push({
        data: { properties: ["property-b"], rating: 4 },
        date: new Date(`2024-02-${String(i + 1).padStart(2, "0")}`),
      });
    }

    const properties = [
      { fileSlug: "property-a", data: { title: "Property A" } },
      { fileSlug: "property-b", data: { title: "Property B" } },
    ];

    const mockCollectionApi = {
      getFilteredByTag: (tag) => {
        if (tag === "property") return properties;
        if (tag === "review") return reviews;
        return [];
      },
    };

    const result = propertyReviewsRedirects(mockCollectionApi);

    // Only property-a (10 reviews) should get redirect, not property-b (11 reviews)
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
