import {
  configureProperties,
  createPropertiesCollection,
  getFeaturedProperties,
  getPropertiesByLocation,
  propertiesWithReviewsPage,
  propertyReviewsRedirects,
} from "#collections/properties.js";
import {
  createMockEleventyConfig,
  createTestRunner,
  expectDeepEqual,
  expectFunctionType,
  expectStrictEqual,
} from "#test/test-utils.js";

const testCases = [
  {
    name: "createPropertiesCollection-basic",
    description: "Creates properties collection from API",
    test: () => {
      const mockProperties = [
        { data: { title: "Property 1", gallery: ["img1.jpg"] } },
        { data: { title: "Property 2" } },
        { data: { title: "Property 3", gallery: ["img3.jpg"] } },
      ];

      const mockCollectionApi = {
        getFilteredByTag: (tag) => {
          expectStrictEqual(tag, "property", "Should filter by property tag");
          return mockProperties;
        },
      };

      const result = createPropertiesCollection(mockCollectionApi);

      expectStrictEqual(result.length, 3, "Should return all properties");
      expectDeepEqual(
        result[0].data.gallery,
        ["img1.jpg"],
        "Should preserve first property gallery",
      );
      expectStrictEqual(
        result[1].data.gallery,
        undefined,
        "Should handle missing gallery",
      );
      expectDeepEqual(
        result[2].data.gallery,
        ["img3.jpg"],
        "Should preserve third property gallery",
      );
    },
  },
  {
    name: "createPropertiesCollection-empty",
    description: "Handles empty property collection",
    test: () => {
      const mockCollectionApi = {
        getFilteredByTag: () => [],
      };

      const result = createPropertiesCollection(mockCollectionApi);

      expectStrictEqual(result.length, 0, "Should return empty array");
    },
  },
  {
    name: "getPropertiesByLocation-basic",
    description: "Filters properties by location slug",
    test: () => {
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

      expectStrictEqual(
        result.length,
        2,
        "Should return 2 properties in springfield",
      );
      expectStrictEqual(
        result[0].data.title,
        "Property 1",
        "Should include first property",
      );
      expectStrictEqual(
        result[1].data.title,
        "Property 3",
        "Should include third property",
      );
    },
  },
  {
    name: "getPropertiesByLocation-no-locations",
    description: "Handles properties without locations",
    test: () => {
      const properties = [
        { data: { title: "Property 1" } },
        { data: { title: "Property 2", locations: null } },
        { data: { title: "Property 3", locations: [] } },
      ];

      const result = getPropertiesByLocation(properties, "springfield");

      expectStrictEqual(
        result.length,
        0,
        "Should return no properties when none have matching locations",
      );
    },
  },
  {
    name: "getPropertiesByLocation-null-inputs",
    description: "Handles null/undefined inputs",
    test: () => {
      const properties = [
        { data: { title: "Property 1", locations: ["springfield"] } },
      ];

      expectDeepEqual(
        getPropertiesByLocation(null, "springfield"),
        [],
        "Should return empty for null properties",
      );
      expectDeepEqual(
        getPropertiesByLocation(properties, null),
        [],
        "Should return empty for null location",
      );
      expectDeepEqual(
        getPropertiesByLocation(undefined, "springfield"),
        [],
        "Should return empty for undefined properties",
      );
      expectDeepEqual(
        getPropertiesByLocation(properties, undefined),
        [],
        "Should return empty for undefined location",
      );
    },
  },
  {
    name: "getPropertiesByLocation-no-matches",
    description: "Returns empty when no properties match location",
    test: () => {
      const properties = [
        { data: { title: "Property 1", locations: ["springfield"] } },
        { data: { title: "Property 2", locations: ["shelbyville"] } },
      ];

      const result = getPropertiesByLocation(properties, "capital-city");

      expectStrictEqual(result.length, 0, "Should return empty for no matches");
    },
  },
  {
    name: "getPropertiesByLocation-sorts-by-order",
    description: "Sorts properties by order field",
    test: () => {
      // Use unique slug to avoid memoization cache collision with other tests
      const properties = [
        { data: { title: "Property C", locations: ["shelbyville"], order: 3 } },
        { data: { title: "Property A", locations: ["shelbyville"], order: 1 } },
        { data: { title: "Property B", locations: ["shelbyville"], order: 2 } },
      ];

      const result = getPropertiesByLocation(properties, "shelbyville");

      expectStrictEqual(result.length, 3, "Should return all 3 properties");
      expectStrictEqual(
        result[0].data.title,
        "Property A",
        "Should sort by order (1 first)",
      );
      expectStrictEqual(
        result[1].data.title,
        "Property B",
        "Should sort by order (2 second)",
      );
      expectStrictEqual(
        result[2].data.title,
        "Property C",
        "Should sort by order (3 third)",
      );
    },
  },
  {
    name: "getFeaturedProperties-basic",
    description: "Filters properties by featured flag",
    test: () => {
      const properties = [
        { data: { title: "Property 1", featured: true } },
        { data: { title: "Property 2", featured: false } },
        { data: { title: "Property 3", featured: true } },
        { data: { title: "Property 4" } },
      ];

      const result = getFeaturedProperties(properties);

      expectStrictEqual(
        result.length,
        2,
        "Should return 2 featured properties",
      );
      expectStrictEqual(
        result[0].data.title,
        "Property 1",
        "Should include first featured property",
      );
      expectStrictEqual(
        result[1].data.title,
        "Property 3",
        "Should include second featured property",
      );
    },
  },
  {
    name: "getFeaturedProperties-empty",
    description: "Returns empty array when no properties are featured",
    test: () => {
      const properties = [
        { data: { title: "Property 1", featured: false } },
        { data: { title: "Property 2" } },
      ];

      const result = getFeaturedProperties(properties);

      expectStrictEqual(
        result.length,
        0,
        "Should return no properties when none are featured",
      );
    },
  },
  {
    name: "getFeaturedProperties-null",
    description: "Handles null/undefined properties array",
    test: () => {
      expectDeepEqual(
        getFeaturedProperties(null),
        [],
        "Should return empty array for null",
      );
      expectDeepEqual(
        getFeaturedProperties(undefined),
        [],
        "Should return empty array for undefined",
      );
    },
  },
  {
    name: "configureProperties-basic",
    description: "Configures properties collection and filters",
    test: () => {
      const mockConfig = createMockEleventyConfig();

      configureProperties(mockConfig);

      expectFunctionType(
        mockConfig.collections,
        "properties",
        "Should add properties collection",
      );
      expectFunctionType(
        mockConfig.collections,
        "propertiesWithReviewsPage",
        "Should add propertiesWithReviewsPage collection",
      );
      expectFunctionType(
        mockConfig.collections,
        "propertyReviewsRedirects",
        "Should add propertyReviewsRedirects collection",
      );
      expectFunctionType(
        mockConfig.filters,
        "getPropertiesByLocation",
        "Should add getPropertiesByLocation filter",
      );
      expectFunctionType(
        mockConfig.filters,
        "getFeaturedProperties",
        "Should add getFeaturedProperties filter",
      );

      expectStrictEqual(
        mockConfig.filters.getPropertiesByLocation,
        getPropertiesByLocation,
        "Should use correct getPropertiesByLocation function",
      );
      expectStrictEqual(
        mockConfig.filters.getFeaturedProperties,
        getFeaturedProperties,
        "Should use correct getFeaturedProperties function",
      );
    },
  },
  {
    name: "propertiesWithReviewsPage-filters-by-review-count",
    description: "Returns only properties exceeding the truncate limit",
    test: () => {
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
      expectStrictEqual(
        result.length,
        1,
        "Should return only properties > limit",
      );
      expectStrictEqual(
        result[0].fileSlug,
        "property-a",
        "Should include property-a (11 > 10)",
      );
    },
  },
  {
    name: "propertyReviewsRedirects-returns-properties-at-or-below-limit",
    description:
      "Returns redirect data for properties not needing separate pages",
    test: () => {
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
      expectStrictEqual(
        result.length,
        1,
        "Should return only properties <= limit",
      );
      expectStrictEqual(
        result[0].fileSlug,
        "property-a",
        "Should include property-a (10 <= 10)",
      );
      // Verify the return structure includes the item reference
      expectStrictEqual(
        result[0].item.fileSlug,
        "property-a",
        "Should include original item in return structure",
      );
    },
  },
  {
    name: "filter-functions-immutable",
    description: "Filter functions should be pure and not modify inputs",
    test: () => {
      const originalProperties = [
        { data: { title: "Property 1", locations: ["springfield"] } },
      ];

      const propertiesCopy = structuredClone(originalProperties);

      getPropertiesByLocation(propertiesCopy, "springfield");

      expectDeepEqual(
        propertiesCopy,
        originalProperties,
        "getPropertiesByLocation should not modify input",
      );
    },
  },
];

export default createTestRunner("properties", testCases);
