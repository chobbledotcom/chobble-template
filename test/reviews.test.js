import {
  configureReviews,
  countProductReviews,
  countReviews,
  createReviewsCollection,
  getCategoryRating,
  getProductRating,
  getPropertyRating,
  getRating,
  getReviewsByCategory,
  getReviewsByProduct,
  getReviewsByProperty,
  getReviewsFor,
  ratingToStars,
} from "#collections/reviews.js";
import {
  createMockEleventyConfig,
  createTestRunner,
  expectDeepEqual,
  expectFunctionType,
  expectStrictEqual,
} from "./test-utils.js";

const testCases = [
  {
    name: "createReviewsCollection-basic",
    description:
      "Creates reviews collection excluding hidden and sorted newest first",
    test: () => {
      const mockReviews = [
        { data: { name: "Review 1", rating: 5 }, date: new Date("2024-01-01") },
        {
          data: { name: "Review 2", rating: 4, hidden: true },
          date: new Date("2024-01-02"),
        },
        { data: { name: "Review 3", rating: 5 }, date: new Date("2024-01-03") },
        {
          data: { name: "Review 4", rating: 3, hidden: true },
          date: new Date("2024-01-04"),
        },
      ];

      const mockCollectionApi = {
        getFilteredByTag: (tag) => {
          expectStrictEqual(tag, "review", "Should filter by review tag");
          return mockReviews;
        },
      };

      const result = createReviewsCollection(mockCollectionApi);

      expectStrictEqual(result.length, 2, "Should return only visible reviews");
      expectStrictEqual(
        result[0].data.name,
        "Review 3",
        "Should have newest review first",
      );
      expectStrictEqual(
        result[1].data.name,
        "Review 1",
        "Should have older review second",
      );
    },
  },
  {
    name: "createReviewsCollection-no-hidden",
    description:
      "Returns all reviews when none are hidden, sorted newest first",
    test: () => {
      const mockReviews = [
        { data: { name: "Review 1", rating: 5 }, date: new Date("2024-01-01") },
        { data: { name: "Review 2", rating: 4 }, date: new Date("2024-01-03") },
        { data: { name: "Review 3", rating: 3 }, date: new Date("2024-01-02") },
      ];

      const mockCollectionApi = {
        getFilteredByTag: (tag) => {
          expectStrictEqual(tag, "review", "Should filter by review tag");
          return mockReviews;
        },
      };

      const result = createReviewsCollection(mockCollectionApi);

      expectStrictEqual(
        result.length,
        3,
        "Should return all reviews when none are hidden",
      );
      expectStrictEqual(
        result[0].data.name,
        "Review 2",
        "Should have newest review first (2024-01-03)",
      );
      expectStrictEqual(
        result[1].data.name,
        "Review 3",
        "Should have middle review second (2024-01-02)",
      );
      expectStrictEqual(
        result[2].data.name,
        "Review 1",
        "Should have oldest review last (2024-01-01)",
      );
    },
  },
  {
    name: "getReviewsByProduct-basic",
    description: "Filters reviews by product and sorts newest first",
    test: () => {
      const reviews = [
        {
          data: { title: "Review 1", products: ["product-a", "product-b"] },
          date: new Date("2024-01-01"),
        },
        {
          data: { title: "Review 2", products: ["product-c"] },
          date: new Date("2024-01-02"),
        },
        {
          data: { title: "Review 3", products: ["product-a"] },
          date: new Date("2024-01-03"),
        },
        { data: { title: "Review 4" }, date: new Date("2024-01-04") },
      ];

      const result = getReviewsByProduct(reviews, "product-a");

      expectStrictEqual(
        result.length,
        2,
        "Should return 2 reviews for product-a",
      );
      expectStrictEqual(
        result[0].data.title,
        "Review 3",
        "Should have newest review first",
      );
      expectStrictEqual(
        result[1].data.title,
        "Review 1",
        "Should have older review second",
      );
    },
  },
  {
    name: "getReviewsByProduct-no-products",
    description: "Handles reviews without products",
    test: () => {
      const reviews = [
        { data: { title: "Review 1" } },
        { data: { title: "Review 2", products: null } },
        { data: { title: "Review 3", products: [] } },
      ];

      const result = getReviewsByProduct(reviews, "product-a");

      expectStrictEqual(
        result.length,
        0,
        "Should return no reviews when none have matching products",
      );
    },
  },
  {
    name: "getReviewsByCategory-basic",
    description: "Filters reviews by category and sorts newest first",
    test: () => {
      const reviews = [
        {
          data: { title: "Review 1", categories: ["category-a", "category-b"] },
          date: new Date("2024-01-01"),
        },
        {
          data: { title: "Review 2", categories: ["category-c"] },
          date: new Date("2024-01-02"),
        },
        {
          data: { title: "Review 3", categories: ["category-a"] },
          date: new Date("2024-01-03"),
        },
      ];

      const result = getReviewsByCategory(reviews, "category-a");

      expectStrictEqual(
        result.length,
        2,
        "Should return 2 reviews for category-a",
      );
      expectStrictEqual(
        result[0].data.title,
        "Review 3",
        "Should have newest review first",
      );
    },
  },
  {
    name: "getReviewsByProperty-basic",
    description: "Filters reviews by property and sorts newest first",
    test: () => {
      const reviews = [
        {
          data: { title: "Review 1", properties: ["property-a"] },
          date: new Date("2024-01-01"),
        },
        {
          data: { title: "Review 2", properties: ["property-b"] },
          date: new Date("2024-01-02"),
        },
        {
          data: { title: "Review 3", properties: ["property-a", "property-b"] },
          date: new Date("2024-01-03"),
        },
      ];

      const result = getReviewsByProperty(reviews, "property-a");

      expectStrictEqual(
        result.length,
        2,
        "Should return 2 reviews for property-a",
      );
      expectStrictEqual(
        result[0].data.title,
        "Review 3",
        "Should have newest review first",
      );
    },
  },
  {
    name: "getReviewsFor-generic",
    description: "Generic function works with any field",
    test: () => {
      const reviews = [
        {
          data: { title: "Review 1", customField: ["item-a"] },
          date: new Date("2024-01-01"),
        },
        {
          data: { title: "Review 2", customField: ["item-b"] },
          date: new Date("2024-01-02"),
        },
      ];

      const result = getReviewsFor(reviews, "item-a", "customField");

      expectStrictEqual(result.length, 1, "Should return 1 review for item-a");
      expectStrictEqual(
        result[0].data.title,
        "Review 1",
        "Should return correct review",
      );
    },
  },
  {
    name: "countReviews-generic",
    description: "Counts reviews for any field type",
    test: () => {
      const reviews = [
        { data: { products: ["product-a", "product-b"] } },
        { data: { products: ["product-a"] } },
        { data: { products: ["product-c"] } },
        { data: { categories: ["category-a"] } },
      ];

      expectStrictEqual(
        countReviews(reviews, "product-a", "products"),
        2,
        "Should count 2 reviews for product-a",
      );
      expectStrictEqual(
        countReviews(reviews, "category-a", "categories"),
        1,
        "Should count 1 review for category-a",
      );
    },
  },
  {
    name: "countProductReviews-basic",
    description: "Counts product reviews correctly",
    test: () => {
      const reviews = [
        { data: { products: ["product-a", "product-b"] } },
        { data: { products: ["product-a"] } },
        { data: { products: ["product-c"] } },
      ];

      expectStrictEqual(
        countProductReviews(reviews, "product-a"),
        2,
        "Should count 2 reviews for product-a",
      );
      expectStrictEqual(
        countProductReviews(reviews, "product-b"),
        1,
        "Should count 1 review for product-b",
      );
      expectStrictEqual(
        countProductReviews(reviews, "product-d"),
        0,
        "Should count 0 reviews for non-existent product",
      );
    },
  },
  {
    name: "getRating-generic",
    description: "Calculates rating for any field type",
    test: () => {
      const reviews = [
        { data: { products: ["product-a"], rating: 5 } },
        { data: { products: ["product-a"], rating: 3 } },
        { data: { categories: ["category-a"], rating: 4 } },
      ];

      expectStrictEqual(
        getRating(reviews, "product-a", "products"),
        4,
        "Should calculate ceiling of average (4)",
      );
      expectStrictEqual(
        getRating(reviews, "category-a", "categories"),
        4,
        "Should calculate rating for category",
      );
    },
  },
  {
    name: "getProductRating-basic",
    description: "Calculates product rating correctly",
    test: () => {
      const reviews = [
        { data: { products: ["product-a"], rating: 5 } },
        { data: { products: ["product-a"], rating: 4 } },
        { data: { products: ["product-b"], rating: 3 } },
      ];

      expectStrictEqual(
        getProductRating(reviews, "product-a"),
        5,
        "Should calculate ceiling of average (4.5 -> 5)",
      );
    },
  },
  {
    name: "getProductRating-no-ratings",
    description: "Returns null when no ratings exist",
    test: () => {
      const reviews = [
        { data: { products: ["product-a"] } },
        { data: { products: ["product-a"], rating: null } },
      ];

      expectStrictEqual(
        getProductRating(reviews, "product-a"),
        null,
        "Should return null when no valid ratings",
      );
    },
  },
  {
    name: "getProductRating-no-matching-products",
    description: "Returns null when no matching products",
    test: () => {
      const reviews = [
        { data: { products: ["product-b"], rating: 5 } },
      ];

      expectStrictEqual(
        getProductRating(reviews, "product-a"),
        null,
        "Should return null for non-existent product",
      );
    },
  },
  {
    name: "getCategoryRating-basic",
    description: "Calculates category rating correctly",
    test: () => {
      const reviews = [
        { data: { categories: ["category-a"], rating: 4 } },
        { data: { categories: ["category-a"], rating: 5 } },
      ];

      expectStrictEqual(
        getCategoryRating(reviews, "category-a"),
        5,
        "Should calculate ceiling of average (4.5 -> 5)",
      );
    },
  },
  {
    name: "getPropertyRating-basic",
    description: "Calculates property rating correctly",
    test: () => {
      const reviews = [
        { data: { properties: ["property-a"], rating: 3 } },
        { data: { properties: ["property-a"], rating: 4 } },
      ];

      expectStrictEqual(
        getPropertyRating(reviews, "property-a"),
        4,
        "Should calculate ceiling of average (3.5 -> 4)",
      );
    },
  },
  {
    name: "ratingToStars-valid",
    description: "Converts rating to star emojis",
    test: () => {
      expectStrictEqual(
        ratingToStars(1),
        "⭐️",
        "Should return 1 star for rating 1",
      );
      expectStrictEqual(
        ratingToStars(3),
        "⭐️⭐️⭐️",
        "Should return 3 stars for rating 3",
      );
      expectStrictEqual(
        ratingToStars(5),
        "⭐️⭐️⭐️⭐️⭐️",
        "Should return 5 stars for rating 5",
      );
    },
  },
  {
    name: "ratingToStars-null",
    description: "Returns empty string for null rating",
    test: () => {
      expectStrictEqual(
        ratingToStars(null),
        "",
        "Should return empty string for null",
      );
      expectStrictEqual(
        ratingToStars(undefined),
        "",
        "Should return empty string for undefined",
      );
    },
  },
  {
    name: "configureReviews-basic",
    description: "Configures reviews collection and filters",
    test: () => {
      const mockConfig = createMockEleventyConfig();
      const mockAddGallery = (item) => item;

      configureReviews(mockConfig, { addGalleryFn: mockAddGallery });

      expectFunctionType(
        mockConfig.collections,
        "reviews",
        "Should add reviews collection",
      );
      expectFunctionType(
        mockConfig.collections,
        "productsWithReviewsPage",
        "Should add productsWithReviewsPage collection",
      );
      expectFunctionType(
        mockConfig.collections,
        "productReviewsRedirects",
        "Should add productReviewsRedirects collection",
      );
      expectFunctionType(
        mockConfig.filters,
        "getReviewsByProduct",
        "Should add getReviewsByProduct filter",
      );
      expectFunctionType(
        mockConfig.filters,
        "getProductRating",
        "Should add getProductRating filter",
      );
      expectFunctionType(
        mockConfig.filters,
        "getReviewsByCategory",
        "Should add getReviewsByCategory filter",
      );
      expectFunctionType(
        mockConfig.filters,
        "getCategoryRating",
        "Should add getCategoryRating filter",
      );
      expectFunctionType(
        mockConfig.filters,
        "getReviewsByProperty",
        "Should add getReviewsByProperty filter",
      );
      expectFunctionType(
        mockConfig.filters,
        "getPropertyRating",
        "Should add getPropertyRating filter",
      );
      expectFunctionType(
        mockConfig.filters,
        "getRating",
        "Should add getRating filter",
      );
      expectFunctionType(
        mockConfig.filters,
        "ratingToStars",
        "Should add ratingToStars filter",
      );
    },
  },
  {
    name: "filter-functions-immutable",
    description: "Filter functions should be pure and not modify inputs",
    test: () => {
      const testDate = new Date("2024-01-01");
      const originalReviews = [
        {
          data: { title: "Review 1", products: ["product-1"] },
          date: testDate,
        },
      ];

      const reviewsCopy = structuredClone(originalReviews);

      getReviewsByProduct(reviewsCopy, "product-1");

      expectDeepEqual(
        reviewsCopy,
        originalReviews,
        "getReviewsByProduct should not modify input",
      );
    },
  },
];

export default createTestRunner("reviews", testCases);
