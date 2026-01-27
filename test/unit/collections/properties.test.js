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

/** Property factory: (defaults) => (fields...) => (rows...) => items */
const property = data({});
const withLoc = property("title", "locations");
const withLocOrder = property("title", "locations", "order");

// Extract filters/collections once - pure functions, safe to reuse
const { filters, collections } = withConfiguredMock(configureProperties)();
const { getPropertiesByLocation } = filters;
const { properties, propertiesWithReviewsPage, propertyReviewsRedirects } =
  collections;

const TRUNCATE_LIMIT = configData.reviews_truncate_limit || 10;

/** Create property review test fixtures */
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
  const propertyItems = [
    { fileSlug: "property-a", data: { title: "Property A" } },
    { fileSlug: "property-b", data: { title: "Property B" } },
  ];
  return {
    getFilteredByTag: (tag) => {
      if (tag === "properties") return propertyItems;
      if (tag === "reviews") return reviews;
      return [];
    },
  };
};

describe("properties", () => {
  test("Creates properties collection from API", () => {
    const propertyItems = items([
      ["Property 1", { gallery: ["img1.jpg"] }],
      ["Property 2", {}],
      ["Property 3", { gallery: ["img3.jpg"] }],
    ]);
    expectGalleries(properties(collectionApi(propertyItems)), [
      ["img1.jpg"],
      undefined,
      ["img3.jpg"],
    ]);
  });

  test("Handles empty property collection", () => {
    expect(properties(collectionApi([])).length).toBe(0);
  });

  test("Filters properties by location slug", () => {
    const props = withLoc(
      ["Property 1", ["springfield", "shelbyville"]],
      ["Property 2", ["capital-city"]],
      ["Property 3", ["springfield"]],
      ["Property 4", undefined],
    );
    expectResultTitles(getPropertiesByLocation(props, "springfield"), [
      "Property 1",
      "Property 3",
    ]);
  });

  test("Handles properties without locations", () => {
    const props = withLoc(
      ["Property 1", undefined],
      ["Property 2", null],
      ["Property 3", []],
    );
    expect(getPropertiesByLocation(props, "springfield").length).toBe(0);
  });

  test("Handles null/undefined inputs", () => {
    const props = withLoc(["Property 1", ["springfield"]]);
    expect(getPropertiesByLocation(null, "springfield")).toEqual([]);
    expect(getPropertiesByLocation(props, null)).toEqual([]);
    expect(getPropertiesByLocation(undefined, "springfield")).toEqual([]);
    expect(getPropertiesByLocation(props, undefined)).toEqual([]);
  });

  test("Returns empty when no properties match location", () => {
    const props = withLoc(
      ["Property 1", ["springfield"]],
      ["Property 2", ["shelbyville"]],
    );
    expect(getPropertiesByLocation(props, "capital-city").length).toBe(0);
  });

  test("Sorts properties by order field", () => {
    const props = withLocOrder(
      ["Property C", ["shelbyville"], 3],
      ["Property A", ["shelbyville"], 1],
      ["Property B", ["shelbyville"], 2],
    );
    expectResultTitles(getPropertiesByLocation(props, "shelbyville"), [
      "Property A",
      "Property B",
      "Property C",
    ]);
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
  });

  test("Returns only properties exceeding the truncate limit", () => {
    const mockApi = createPropertyReviewFixture(
      TRUNCATE_LIMIT + 1,
      TRUNCATE_LIMIT,
    );
    const result = propertiesWithReviewsPage(mockApi);

    expect(result.length).toBe(1);
    expect(result[0].fileSlug).toBe("property-a");
  });

  test("Returns redirect data for properties not needing separate pages", () => {
    const mockApi = createPropertyReviewFixture(
      TRUNCATE_LIMIT,
      TRUNCATE_LIMIT + 1,
    );
    const result = propertyReviewsRedirects(mockApi);

    expect(result.length).toBe(1);
    expect(result[0].fileSlug).toBe("property-a");
    expect(result[0].item.fileSlug).toBe("property-a");
  });

  test("Filter functions should be pure and not modify inputs", () => {
    const original = withLoc(["Property 1", ["springfield"]]);
    const copy = structuredClone(original);

    getPropertiesByLocation(copy, "springfield");

    expect(copy).toEqual(original);
  });
});
