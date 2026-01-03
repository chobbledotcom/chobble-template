import { describe, expect, test } from "bun:test";
import {
  configureReviews,
  countReviews,
  createReviewsCollection,
  getInitials,
  getRating,
  getReviewsFor,
  ratingToStars,
  reviewerAvatar,
  reviewsRedirects,
  withReviewsPage,
} from "#collections/reviews.js";
import configData from "#data/config.json" with { type: "json" };
import {
  createMockEleventyConfig,
  expectResultTitles,
} from "#test/test-utils.js";

// Read truncate limit from config for portable tests across inherited sites
const TRUNCATE_LIMIT = configData.reviews_truncate_limit || 10;

// ============================================
// Test Helpers
// ============================================

/**
 * Create an array of review objects for a product.
 * Uses modulo to handle day overflow for large review counts.
 */
const createReviews = (productId, count, rating = 5, monthPrefix = "01") =>
  Array.from({ length: count }, (_, i) => ({
    data: { products: [productId], rating },
    date: new Date(
      `2024-${monthPrefix}-${String((i % 28) + 1).padStart(2, "0")}`,
    ),
  }));

/**
 * Create a mock collection API for testing.
 */
const createMockCollectionApi = (products, reviews) => ({
  getFilteredByTag: (tag) => {
    if (tag === "product") return products;
    if (tag === "review") return reviews;
    return [];
  },
});

/**
 * Create a product fixture.
 */
const createProduct = (slug, title) => ({
  fileSlug: slug,
  data: { title },
});

describe("reviews", () => {
  test("Creates reviews collection excluding hidden and sorted newest first", () => {
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
        expect(tag).toBe("review");
        return mockReviews;
      },
    };

    const result = createReviewsCollection(mockCollectionApi);

    expect(result.length).toBe(2);
    expect(result[0].data.name).toBe("Review 3");
    expect(result[1].data.name).toBe("Review 1");
  });

  test("Returns all reviews when none are hidden, sorted newest first", () => {
    const mockReviews = [
      { data: { name: "Review 1", rating: 5 }, date: new Date("2024-01-01") },
      { data: { name: "Review 2", rating: 4 }, date: new Date("2024-01-03") },
      { data: { name: "Review 3", rating: 3 }, date: new Date("2024-01-02") },
    ];

    const mockCollectionApi = {
      getFilteredByTag: (tag) => {
        expect(tag).toBe("review");
        return mockReviews;
      },
    };

    const result = createReviewsCollection(mockCollectionApi);

    expect(result.length).toBe(3);
    expect(result[0].data.name).toBe("Review 2");
    expect(result[1].data.name).toBe("Review 3");
    expect(result[2].data.name).toBe("Review 1");
  });

  test("Filters reviews by products field and sorts newest first", () => {
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

    const result = getReviewsFor(reviews, "product-a", "products");

    expectResultTitles(result, ["Review 3", "Review 1"]);
  });

  test("Handles reviews without matching field", () => {
    const reviews = [
      { data: { title: "Review 1" } },
      { data: { title: "Review 2", products: null } },
      { data: { title: "Review 3", products: [] } },
    ];

    const result = getReviewsFor(reviews, "product-a", "products");

    expect(result.length).toBe(0);
  });

  test("Filters reviews by categories field", () => {
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

    const result = getReviewsFor(reviews, "category-a", "categories");

    expectResultTitles(result, ["Review 3", "Review 1"]);
  });

  test("Filters reviews by properties field", () => {
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

    const result = getReviewsFor(reviews, "property-a", "properties");

    expectResultTitles(result, ["Review 3", "Review 1"]);
  });

  test("Generic function works with any field", () => {
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

    expectResultTitles(result, ["Review 1"]);
  });

  test("Counts reviews for any field type", () => {
    const reviews = [
      { data: { products: ["product-a", "product-b"] } },
      { data: { products: ["product-a"] } },
      { data: { products: ["product-c"] } },
      { data: { categories: ["category-a"] } },
    ];

    expect(countReviews(reviews, "product-a", "products")).toBe(2);
    expect(countReviews(reviews, "product-b", "products")).toBe(1);
    expect(countReviews(reviews, "product-d", "products")).toBe(0);
    expect(countReviews(reviews, "category-a", "categories")).toBe(1);
  });

  test("Calculates rating for any field type", () => {
    const reviews = [
      { data: { products: ["product-a"], rating: 5 } },
      { data: { products: ["product-a"], rating: 3 } },
      { data: { categories: ["category-a"], rating: 4 } },
    ];

    expect(getRating(reviews, "product-a", "products")).toBe(4);
    expect(getRating(reviews, "category-a", "categories")).toBe(4);
  });

  test("Returns ceiling of average rating", () => {
    const reviews = [
      { data: { products: ["product-a"], rating: 5 } },
      { data: { products: ["product-a"], rating: 4 } },
    ];

    expect(getRating(reviews, "product-a", "products")).toBe(5);
  });

  test("Returns null when no ratings exist", () => {
    const reviews = [
      { data: { products: ["product-a"] } },
      { data: { products: ["product-a"], rating: null } },
    ];

    expect(getRating(reviews, "product-a", "products")).toBe(null);
  });

  test("Returns null when no matching items", () => {
    const reviews = [{ data: { products: ["product-b"], rating: 5 } }];

    expect(getRating(reviews, "product-a", "products")).toBe(null);
  });

  test("Converts rating to star emojis", () => {
    expect(ratingToStars(1)).toBe("⭐️");
    expect(ratingToStars(3)).toBe("⭐️⭐️⭐️");
    expect(ratingToStars(5)).toBe("⭐️⭐️⭐️⭐️⭐️");
  });

  test("Returns empty string for null rating", () => {
    expect(ratingToStars(null)).toBe("");
    expect(ratingToStars(undefined)).toBe("");
  });

  test("Extracts first and last initials from full name", () => {
    expect(getInitials("John Smith")).toBe("JS");
    expect(getInitials("Alice Bob Carol")).toBe("AC");
    expect(getInitials("Mary Jane Watson Parker")).toBe("MP");
  });

  test("Returns single initial for single word name", () => {
    expect(getInitials("Madonna")).toBe("M");
    expect(getInitials("Cher")).toBe("C");
  });

  test("Returns name unchanged if already 2 chars or less", () => {
    expect(getInitials("JS")).toBe("JS");
    expect(getInitials("A")).toBe("A");
    expect(getInitials("ab")).toBe("AB");
  });

  test("Handles empty/null names gracefully", () => {
    expect(getInitials("")).toBe("?");
    expect(getInitials(null)).toBe("?");
    expect(getInitials(undefined)).toBe("?");
  });

  test("Handles extra whitespace in names", () => {
    expect(getInitials("  John   Smith  ")).toBe("JS");
    expect(getInitials("   ")).toBe("?");
    expect(getInitials("\t\n")).toBe("?");
  });

  test("Uppercases lowercase initials", () => {
    expect(getInitials("john smith")).toBe("JS");
    expect(getInitials("mary jane")).toBe("MJ");
  });

  test("Handles mixed case names correctly", () => {
    expect(getInitials("jOHN sMITH")).toBe("JS");
    expect(getInitials("McDonald")).toBe("M");
  });

  test("Treats hyphenated parts as single words", () => {
    expect(getInitials("Mary-Jane Watson")).toBe("MW");
    expect(getInitials("Jean-Claude Van Damme")).toBe("JD");
  });

  test("Handles names with apostrophes", () => {
    expect(getInitials("O'Brien")).toBe("O");
    expect(getInitials("Shaquille O'Neal")).toBe("SO");
    expect(getInitials("D'Angelo Russell")).toBe("DR");
  });

  test("Handles accented and unicode characters", () => {
    expect(getInitials("José García")).toBe("JG");
    expect(getInitials("Müller Schmidt")).toBe("MS");
    expect(getInitials("Björk")).toBe("B");
  });

  test("Handles names containing numbers", () => {
    expect(getInitials("John Smith III")).toBe("JI");
    expect(getInitials("R2D2")).toBe("R");
    expect(getInitials("C3")).toBe("C3");
  });

  test("Returns a valid SVG data URI", () => {
    const result = reviewerAvatar("John Smith");
    expect(result.startsWith("data:image/svg+xml,")).toBe(true);
    expect(result.includes("JS")).toBe(true);
  });

  test("Returns same color for same name", () => {
    const result1 = reviewerAvatar("John Smith");
    const result2 = reviewerAvatar("John Smith");
    expect(result1).toBe(result2);
  });

  test("Returns different colors for different names", () => {
    const result1 = reviewerAvatar("John Smith");
    const result2 = reviewerAvatar("Jane Doe");
    expect(result1 !== result2).toBe(true);
  });

  test("Configures reviews collection and filters", () => {
    const mockConfig = createMockEleventyConfig();

    configureReviews(mockConfig);

    expect(typeof mockConfig.collections.reviews).toBe("function");
    expect(typeof mockConfig.filters.getReviewsFor).toBe("function");
    expect(typeof mockConfig.filters.getRating).toBe("function");
    expect(typeof mockConfig.filters.ratingToStars).toBe("function");
    expect(typeof mockConfig.filters.reviewerAvatar).toBe("function");
  });

  test("Filter functions should be pure and not modify inputs", () => {
    const testDate = new Date("2024-01-01");
    const originalReviews = [
      {
        data: { title: "Review 1", products: ["product-1"] },
        date: testDate,
      },
    ];

    const reviewsCopy = structuredClone(originalReviews);

    getReviewsFor(reviewsCopy, "product-1", "products");

    expect(reviewsCopy).toEqual(originalReviews);
  });

  test("Returns only items exceeding the truncate limit", () => {
    // Create reviews relative to the configured limit for portability
    // product-a gets limit+1 reviews (above limit), product-b gets limit reviews (at limit)
    const reviews = [
      ...createReviews("product-a", TRUNCATE_LIMIT + 1, 5, "01"),
      ...createReviews("product-b", TRUNCATE_LIMIT, 4, "02"),
    ];
    const products = [
      createProduct("product-a", "Product A"),
      createProduct("product-b", "Product B"),
    ];
    const mockCollectionApi = createMockCollectionApi(products, reviews);

    const factory = withReviewsPage("product", "products");
    const result = factory(mockCollectionApi);

    // Only product-a (above limit) should be included, not product-b (at limit)
    // This tests the boundary: > limit, not >= limit
    expect(result.length).toBe(1);
    expect(result[0].fileSlug).toBe("product-a");
  });

  test("Transforms items through the optional processItem callback", () => {
    // Use limit+5 to ensure we're clearly above the limit
    const reviews = createReviews("product-a", TRUNCATE_LIMIT + 5);
    const products = [createProduct("product-a", "Product A")];
    const mockCollectionApi = createMockCollectionApi(products, reviews);

    const processItem = (item) => ({ ...item, transformed: true });
    const factory = withReviewsPage("product", "products", processItem);
    const result = factory(mockCollectionApi);

    expect(result.length).toBe(1);
    expect(result[0].transformed).toBe(true);
  });

  test("Returns redirect data for items not needing separate pages", () => {
    // Create reviews relative to the configured limit for portability
    // product-a gets limit reviews (at limit), product-b gets limit+1 reviews (above limit)
    const reviews = [
      ...createReviews("product-a", TRUNCATE_LIMIT, 5, "01"),
      ...createReviews("product-b", TRUNCATE_LIMIT + 1, 4, "02"),
    ];
    const products = [
      createProduct("product-a", "Product A"),
      createProduct("product-b", "Product B"),
    ];
    const mockCollectionApi = createMockCollectionApi(products, reviews);

    const factory = reviewsRedirects("product", "products");
    const result = factory(mockCollectionApi);

    // Only product-a (at limit) should get redirect, not product-b (above limit)
    // This tests the boundary: <= limit, not < limit
    expect(result.length).toBe(1);
    expect(result[0].fileSlug).toBe("product-a");
    // Verify the return structure includes the item reference
    expect(result[0].item.fileSlug).toBe("product-a");
  });

  test("Returns empty array when limit is -1 (no pagination)", () => {
    // Use fixed date for all reviews (count doesn't matter for this test)
    const reviews = Array.from({ length: 100 }, () => ({
      data: { products: ["product-a"], rating: 5 },
      date: new Date("2024-01-01"),
    }));
    const products = [createProduct("product-a", "Product A")];
    const mockCollectionApi = createMockCollectionApi(products, reviews);

    // Pass -1 as limitOverride to test the "no pagination" branch
    const factory = withReviewsPage("product", "products", (item) => item, -1);
    const result = factory(mockCollectionApi);

    // Even with 100 reviews, limit=-1 means no separate pages
    expect(result.length).toBe(0);
  });

  test("Returns all items when limit is -1 (no pagination)", () => {
    const reviews = Array.from({ length: 100 }, () => ({
      data: { products: ["product-a"], rating: 5 },
      date: new Date("2024-01-01"),
    }));
    const products = [
      createProduct("product-a", "Product A"),
      createProduct("product-b", "Product B"),
    ];
    const mockCollectionApi = createMockCollectionApi(products, reviews);

    // Pass -1 as limitOverride to test the "all redirects" branch
    const factory = reviewsRedirects("product", "products", -1);
    const result = factory(mockCollectionApi);

    // All items get redirects when limit=-1
    expect(result.length).toBe(2);
    expect(result[0].fileSlug).toBe("product-a");
    expect(result[1].fileSlug).toBe("product-b");
  });
});
