import { describe, expect, test } from "bun:test";
import {
  configureReviews,
  getReviewsFor,
  reviewsRedirects,
  withReviewsPage,
} from "#collections/reviews.js";
import configData from "#data/config.json" with { type: "json" };
import {
  item as baseItem,
  collectionApi,
  createMockEleventyConfig,
  createProduct,
  expectProp,
  expectResultTitles,
  taggedCollectionApi,
} from "#test/test-utils.js";

import { map } from "#toolkit/fp/array.js";

// Create configured mock and extract registered collection/filters
const createReviewsMock = () => {
  const mockConfig = createMockEleventyConfig();
  configureReviews(mockConfig);
  return {
    mockConfig,
    reviewsCollection: mockConfig.collections.reviews,
    getRating: mockConfig.filters.getRating,
    ratingToStars: mockConfig.filters.ratingToStars,
    reviewerAvatar: mockConfig.filters.reviewerAvatar,
  };
};

// Read truncate limit from config for portable tests across inherited sites
const TRUNCATE_LIMIT = configData.reviews_truncate_limit || 10;

// ============================================
// Functional Test Fixture Builders
// ============================================

/**
 * Create a review extending the base item with a date.
 * @param {string} title - Review title
 * @param {string} dateStr - Date string (YYYY-MM-DD format)
 * @param {Object} options - Additional options (rating, hidden, products, etc.)
 */
const reviewItem = (title, dateStr, options = {}) => ({
  ...baseItem(title, options),
  date: new Date(dateStr),
});

/**
 * Create items from an array of [title, dateStr, options] tuples
 * Curried for use with pipe
 */
const reviewItems = map(([title, dateStr, options]) =>
  reviewItem(title, dateStr, options),
);

/**
 * Create multiple reviews for a product with sequential dates.
 * Uses modulo to handle day overflow for large review counts.
 */
const itemsFor = (productId, count, rating = 5, monthPrefix = "01") =>
  Array.from({ length: count }, (_, i) => ({
    data: { products: [productId], rating },
    date: new Date(
      `2024-${monthPrefix}-${String((i % 28) + 1).padStart(2, "0")}`,
    ),
  }));

/**
 * Create review items with product association and flexible ratings.
 * Factory function for common test patterns.
 */
const createProductReviews = (productId, ratingSpecs) =>
  reviewItems(
    ratingSpecs.map((rating, i) => [
      `R${i + 1}`,
      `2024-01-0${i + 1}`,
      { products: [productId], rating },
    ]),
  );

/**
 * Create paired reviews and products for truncate limit testing.
 * Returns { reviews, products } pair.
 */
const createTruncatePair = (productSpecs) => ({
  reviews: productSpecs.flatMap(({ slug, count, rating, monthPrefix }) =>
    itemsFor(slug, count, rating, monthPrefix),
  ),
  products: productSpecs.map(({ slug, title }) =>
    createProduct({ slug, title }),
  ),
});

/**
 * Create limit test data with products above and below truncate threshold.
 * @param {boolean} aAboveLimit - whether product-a should be above limit
 */
const createLimitTestData = (aAboveLimit = true) =>
  createTruncatePair([
    {
      slug: "product-a",
      title: "Product A",
      count: aAboveLimit ? TRUNCATE_LIMIT + 1 : TRUNCATE_LIMIT,
      rating: 5,
      monthPrefix: "01",
    },
    {
      slug: "product-b",
      title: "Product B",
      count: aAboveLimit ? TRUNCATE_LIMIT : TRUNCATE_LIMIT + 1,
      rating: 4,
      monthPrefix: "02",
    },
  ]);

describe("reviews", () => {
  test("Creates reviews collection excluding hidden and sorted newest first", () => {
    const { reviewsCollection } = createReviewsMock();
    const testReviews = reviewItems([
      ["Review 1", "2024-01-01", { rating: 5 }],
      ["Review 2", "2024-01-02", { rating: 4, hidden: true }],
      ["Review 3", "2024-01-03", { rating: 5 }],
      ["Review 4", "2024-01-04", { rating: 3, hidden: true }],
    ]);

    const result = reviewsCollection(collectionApi(testReviews));

    expectResultTitles(result, ["Review 3", "Review 1"]);
  });

  test("Returns all reviews when none are hidden, sorted newest first", () => {
    const { reviewsCollection } = createReviewsMock();
    const testReviews = reviewItems([
      ["Review 1", "2024-01-01", { rating: 5 }],
      ["Review 2", "2024-01-03", { rating: 4 }],
      ["Review 3", "2024-01-02", { rating: 3 }],
    ]);

    const result = reviewsCollection(collectionApi(testReviews));

    expectResultTitles(result, ["Review 2", "Review 3", "Review 1"]);
  });

  test("Filters reviews by products field and sorts newest first", () => {
    const testReviews = reviewItems([
      ["Review 1", "2024-01-01", { products: ["product-a", "product-b"] }],
      ["Review 2", "2024-01-02", { products: ["product-c"] }],
      ["Review 3", "2024-01-03", { products: ["product-a"] }],
      ["Review 4", "2024-01-04", {}],
    ]);

    const result = getReviewsFor(testReviews, "product-a", "products");

    expectResultTitles(result, ["Review 3", "Review 1"]);
  });

  test("Handles reviews without matching field", () => {
    const testReviews = reviewItems([
      ["Review 1", "2024-01-01", {}],
      ["Review 2", "2024-01-02", { products: null }],
      ["Review 3", "2024-01-03", { products: [] }],
    ]);

    const result = getReviewsFor(testReviews, "product-a", "products");

    expect(result.length).toBe(0);
  });

  test("Filters reviews by categories field", () => {
    const testReviews = reviewItems([
      ["Review 1", "2024-01-01", { categories: ["category-a", "category-b"] }],
      ["Review 2", "2024-01-02", { categories: ["category-c"] }],
      ["Review 3", "2024-01-03", { categories: ["category-a"] }],
    ]);

    const result = getReviewsFor(testReviews, "category-a", "categories");

    expectResultTitles(result, ["Review 3", "Review 1"]);
  });

  test("Filters reviews by properties field", () => {
    const testReviews = reviewItems([
      ["Review 1", "2024-01-01", { properties: ["property-a"] }],
      ["Review 2", "2024-01-02", { properties: ["property-b"] }],
      ["Review 3", "2024-01-03", { properties: ["property-a", "property-b"] }],
    ]);

    const result = getReviewsFor(testReviews, "property-a", "properties");

    expectResultTitles(result, ["Review 3", "Review 1"]);
  });

  test("Generic function works with any field", () => {
    const testReviews = reviewItems([
      ["Review 1", "2024-01-01", { customField: ["item-a"] }],
      ["Review 2", "2024-01-02", { customField: ["item-b"] }],
    ]);

    const result = getReviewsFor(testReviews, "item-a", "customField");

    expectResultTitles(result, ["Review 1"]);
  });

  test("Calculates rating for any field type via filter", () => {
    const { getRating } = createReviewsMock();
    const productReviews = createProductReviews("product-a", [5, 3]);
    const testReviews = [
      ...productReviews,
      ...reviewItems([
        ["R3", "2024-01-03", { categories: ["category-a"], rating: 4 }],
      ]),
    ];

    expect(getRating(testReviews, "product-a", "products")).toBe(4);
    expect(getRating(testReviews, "category-a", "categories")).toBe(4);
  });

  test("Returns ceiling of average rating via filter", () => {
    const { getRating } = createReviewsMock();
    const testReviews = createProductReviews("product-a", [5, 4]);

    expect(getRating(testReviews, "product-a", "products")).toBe(5);
  });

  test("Returns null when no ratings exist via filter", () => {
    const { getRating } = createReviewsMock();
    const testReviews = reviewItems([
      ["R1", "2024-01-01", { products: ["product-a"] }],
      ["R2", "2024-01-02", { products: ["product-a"], rating: null }],
    ]);

    expect(getRating(testReviews, "product-a", "products")).toBe(null);
  });

  test("Returns null when no matching items via filter", () => {
    const { getRating } = createReviewsMock();
    const testReviews = reviewItems([
      ["R1", "2024-01-01", { products: ["product-b"], rating: 5 }],
    ]);

    expect(getRating(testReviews, "product-a", "products")).toBe(null);
  });

  test("Converts rating to star emojis via filter", () => {
    const { ratingToStars } = createReviewsMock();
    expect(ratingToStars(1)).toBe("⭐️");
    expect(ratingToStars(3)).toBe("⭐️⭐️⭐️");
    expect(ratingToStars(5)).toBe("⭐️⭐️⭐️⭐️⭐️");
  });

  test("Avatar displays initials from names via filter", () => {
    const { reviewerAvatar } = createReviewsMock();
    // Helper to check initials in URL-encoded SVG (>X< becomes %3EX%3C)
    const hasInitials = (avatar, initials) =>
      avatar.includes(`%3E${encodeURIComponent(initials)}%3C`);

    // Full names: first + last initial
    expect(hasInitials(reviewerAvatar("John Smith"), "JS")).toBe(true);
    expect(hasInitials(reviewerAvatar("Alice Bob Carol"), "AC")).toBe(true);
    expect(hasInitials(reviewerAvatar("Mary Jane Watson Parker"), "MP")).toBe(
      true,
    );
    // Single word names: first initial only
    expect(hasInitials(reviewerAvatar("Madonna"), "M")).toBe(true);
    // Short names: unchanged (uppercased)
    expect(hasInitials(reviewerAvatar("JS"), "JS")).toBe(true);
    expect(hasInitials(reviewerAvatar("ab"), "AB")).toBe(true);
    // Empty/null: fallback to "?"
    expect(hasInitials(reviewerAvatar(""), "?")).toBe(true);
    expect(hasInitials(reviewerAvatar(null), "?")).toBe(true);
    // Whitespace handling
    expect(hasInitials(reviewerAvatar("  John   Smith  "), "JS")).toBe(true);
    expect(hasInitials(reviewerAvatar("   "), "?")).toBe(true);
    // Case normalization
    expect(hasInitials(reviewerAvatar("john smith"), "JS")).toBe(true);
  });

  test("Returns a valid SVG data URI via filter", () => {
    const { reviewerAvatar } = createReviewsMock();
    const result = reviewerAvatar("John Smith");
    expect(result.startsWith("data:image/svg+xml,")).toBe(true);
  });

  test("Returns same color for same name via filter", () => {
    const { reviewerAvatar } = createReviewsMock();
    const result1 = reviewerAvatar("John Smith");
    const result2 = reviewerAvatar("John Smith");
    expect(result1).toBe(result2);
  });

  test("Returns different colors for different names via filter", () => {
    const { reviewerAvatar } = createReviewsMock();
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
    const originalReviews = reviewItems([
      ["Review 1", "2024-01-01", { products: ["product-1"] }],
    ]);
    const reviewsCopy = structuredClone(originalReviews);

    getReviewsFor(reviewsCopy, "product-1", "products");

    expect(reviewsCopy).toEqual(originalReviews);
  });

  test("Returns only items exceeding the truncate limit", () => {
    // product-a gets limit+1 reviews (above limit), product-b gets limit reviews (at limit)
    const { reviews: testReviews, products } = createLimitTestData(true);

    const factory = withReviewsPage("products");
    const result = factory(
      taggedCollectionApi({ products: products, reviews: testReviews }),
    );

    // Only product-a (above limit) should be included, not product-b (at limit)
    expect(result.length).toBe(1);
    expect(result[0].fileSlug).toBe("product-a");
  });

  test("Transforms items through the optional processItem callback", () => {
    const testReviews = itemsFor("product-a", TRUNCATE_LIMIT + 5);
    const products = [createProduct({ slug: "product-a", title: "Product A" })];

    const processItem = (item) => ({ ...item, transformed: true });
    const factory = withReviewsPage("products", processItem);
    const result = factory(
      taggedCollectionApi({ products: products, reviews: testReviews }),
    );

    expect(result.length).toBe(1);
    expect(result[0].transformed).toBe(true);
  });

  test("Returns redirect data for items not needing separate pages", () => {
    // product-a gets limit reviews (at limit), product-b gets limit+1 reviews (above limit)
    const { reviews: testReviews, products } = createLimitTestData(false);

    const factory = reviewsRedirects("products");
    const result = factory(
      taggedCollectionApi({ products: products, reviews: testReviews }),
    );

    // Only product-a (at limit) should get redirect, not product-b (above limit)
    expect(result.length).toBe(1);
    expect(result[0].fileSlug).toBe("product-a");
    expect(result[0].item.fileSlug).toBe("product-a");
  });

  test("Returns empty array when limit is -1 (no pagination)", () => {
    const testReviews = itemsFor("product-a", 100);
    const products = [createProduct({ slug: "product-a", title: "Product A" })];

    const factory = withReviewsPage("products", (i) => i, -1);
    const result = factory(
      taggedCollectionApi({ products: products, reviews: testReviews }),
    );

    // Even with 100 reviews, limit=-1 means no separate pages
    expect(result.length).toBe(0);
  });

  test("Returns all items when limit is -1 (no pagination)", () => {
    const testReviews = itemsFor("product-a", 100);
    const products = [
      createProduct({ slug: "product-a", title: "Product A" }),
      createProduct({ slug: "product-b", title: "Product B" }),
    ];

    const factory = reviewsRedirects("products", -1);
    const result = factory(
      taggedCollectionApi({ products: products, reviews: testReviews }),
    );

    // All items get redirects when limit=-1
    expectProp("fileSlug")(result, ["product-a", "product-b"]);
  });
});
