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
  item as baseItem,
  collectionApi,
  createMockEleventyConfig,
  createProduct,
  expectProp,
  expectResultTitles,
  taggedCollectionApi,
} from "#test/test-utils.js";

import { map } from "#utils/array-utils.js";

const expectFileSlugs = expectProp("fileSlug");

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
const item = (title, dateStr, options = {}) => ({
  ...baseItem(title, options),
  date: new Date(dateStr),
});

/**
 * Create items from an array of [title, dateStr, options] tuples
 * Curried for use with pipe
 */
const items = map(([title, dateStr, options]) => item(title, dateStr, options));

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

describe("reviews", () => {
  test("Creates reviews collection excluding hidden and sorted newest first", () => {
    const testReviews = items([
      ["Review 1", "2024-01-01", { rating: 5 }],
      ["Review 2", "2024-01-02", { rating: 4, hidden: true }],
      ["Review 3", "2024-01-03", { rating: 5 }],
      ["Review 4", "2024-01-04", { rating: 3, hidden: true }],
    ]);

    const result = createReviewsCollection(collectionApi(testReviews));

    expectResultTitles(result, ["Review 3", "Review 1"]);
  });

  test("Returns all reviews when none are hidden, sorted newest first", () => {
    const testReviews = items([
      ["Review 1", "2024-01-01", { rating: 5 }],
      ["Review 2", "2024-01-03", { rating: 4 }],
      ["Review 3", "2024-01-02", { rating: 3 }],
    ]);

    const result = createReviewsCollection(collectionApi(testReviews));

    expectResultTitles(result, ["Review 2", "Review 3", "Review 1"]);
  });

  test("Filters reviews by products field and sorts newest first", () => {
    const testReviews = items([
      ["Review 1", "2024-01-01", { products: ["product-a", "product-b"] }],
      ["Review 2", "2024-01-02", { products: ["product-c"] }],
      ["Review 3", "2024-01-03", { products: ["product-a"] }],
      ["Review 4", "2024-01-04", {}],
    ]);

    const result = getReviewsFor(testReviews, "product-a", "products");

    expectResultTitles(result, ["Review 3", "Review 1"]);
  });

  test("Handles reviews without matching field", () => {
    const testReviews = items([
      ["Review 1", "2024-01-01", {}],
      ["Review 2", "2024-01-02", { products: null }],
      ["Review 3", "2024-01-03", { products: [] }],
    ]);

    const result = getReviewsFor(testReviews, "product-a", "products");

    expect(result.length).toBe(0);
  });

  test("Filters reviews by categories field", () => {
    const testReviews = items([
      ["Review 1", "2024-01-01", { categories: ["category-a", "category-b"] }],
      ["Review 2", "2024-01-02", { categories: ["category-c"] }],
      ["Review 3", "2024-01-03", { categories: ["category-a"] }],
    ]);

    const result = getReviewsFor(testReviews, "category-a", "categories");

    expectResultTitles(result, ["Review 3", "Review 1"]);
  });

  test("Filters reviews by properties field", () => {
    const testReviews = items([
      ["Review 1", "2024-01-01", { properties: ["property-a"] }],
      ["Review 2", "2024-01-02", { properties: ["property-b"] }],
      ["Review 3", "2024-01-03", { properties: ["property-a", "property-b"] }],
    ]);

    const result = getReviewsFor(testReviews, "property-a", "properties");

    expectResultTitles(result, ["Review 3", "Review 1"]);
  });

  test("Generic function works with any field", () => {
    const testReviews = items([
      ["Review 1", "2024-01-01", { customField: ["item-a"] }],
      ["Review 2", "2024-01-02", { customField: ["item-b"] }],
    ]);

    const result = getReviewsFor(testReviews, "item-a", "customField");

    expectResultTitles(result, ["Review 1"]);
  });

  test("Counts reviews for any field type", () => {
    const testReviews = items([
      ["R1", "2024-01-01", { products: ["product-a", "product-b"] }],
      ["R2", "2024-01-02", { products: ["product-a"] }],
      ["R3", "2024-01-03", { products: ["product-c"] }],
      ["R4", "2024-01-04", { categories: ["category-a"] }],
    ]);

    expect(countReviews(testReviews, "product-a", "products")).toBe(2);
    expect(countReviews(testReviews, "product-b", "products")).toBe(1);
    expect(countReviews(testReviews, "product-d", "products")).toBe(0);
    expect(countReviews(testReviews, "category-a", "categories")).toBe(1);
  });

  test("Calculates rating for any field type", () => {
    const testReviews = items([
      ["R1", "2024-01-01", { products: ["product-a"], rating: 5 }],
      ["R2", "2024-01-02", { products: ["product-a"], rating: 3 }],
      ["R3", "2024-01-03", { categories: ["category-a"], rating: 4 }],
    ]);

    expect(getRating(testReviews, "product-a", "products")).toBe(4);
    expect(getRating(testReviews, "category-a", "categories")).toBe(4);
  });

  test("Returns ceiling of average rating", () => {
    const testReviews = items([
      ["R1", "2024-01-01", { products: ["product-a"], rating: 5 }],
      ["R2", "2024-01-02", { products: ["product-a"], rating: 4 }],
    ]);

    expect(getRating(testReviews, "product-a", "products")).toBe(5);
  });

  test("Returns null when no ratings exist", () => {
    const testReviews = items([
      ["R1", "2024-01-01", { products: ["product-a"] }],
      ["R2", "2024-01-02", { products: ["product-a"], rating: null }],
    ]);

    expect(getRating(testReviews, "product-a", "products")).toBe(null);
  });

  test("Returns null when no matching items", () => {
    const testReviews = items([
      ["R1", "2024-01-01", { products: ["product-b"], rating: 5 }],
    ]);

    expect(getRating(testReviews, "product-a", "products")).toBe(null);
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
    const originalReviews = items([
      ["Review 1", "2024-01-01", { products: ["product-1"] }],
    ]);
    const reviewsCopy = structuredClone(originalReviews);

    getReviewsFor(reviewsCopy, "product-1", "products");

    expect(reviewsCopy).toEqual(originalReviews);
  });

  test("Returns only items exceeding the truncate limit", () => {
    // product-a gets limit+1 reviews (above limit), product-b gets limit reviews (at limit)
    const testReviews = [
      ...itemsFor("product-a", TRUNCATE_LIMIT + 1, 5, "01"),
      ...itemsFor("product-b", TRUNCATE_LIMIT, 4, "02"),
    ];
    const products = [
      createProduct({ slug: "product-a", title: "Product A" }),
      createProduct({ slug: "product-b", title: "Product B" }),
    ];

    const factory = withReviewsPage("product", "products");
    const result = factory(
      taggedCollectionApi({ product: products, review: testReviews }),
    );

    // Only product-a (above limit) should be included, not product-b (at limit)
    expect(result.length).toBe(1);
    expect(result[0].fileSlug).toBe("product-a");
  });

  test("Transforms items through the optional processItem callback", () => {
    const testReviews = itemsFor("product-a", TRUNCATE_LIMIT + 5);
    const products = [createProduct({ slug: "product-a", title: "Product A" })];

    const processItem = (item) => ({ ...item, transformed: true });
    const factory = withReviewsPage("product", "products", processItem);
    const result = factory(
      taggedCollectionApi({ product: products, review: testReviews }),
    );

    expect(result.length).toBe(1);
    expect(result[0].transformed).toBe(true);
  });

  test("Returns redirect data for items not needing separate pages", () => {
    // product-a gets limit reviews (at limit), product-b gets limit+1 reviews (above limit)
    const testReviews = [
      ...itemsFor("product-a", TRUNCATE_LIMIT, 5, "01"),
      ...itemsFor("product-b", TRUNCATE_LIMIT + 1, 4, "02"),
    ];
    const products = [
      createProduct({ slug: "product-a", title: "Product A" }),
      createProduct({ slug: "product-b", title: "Product B" }),
    ];

    const factory = reviewsRedirects("product", "products");
    const result = factory(
      taggedCollectionApi({ product: products, review: testReviews }),
    );

    // Only product-a (at limit) should get redirect, not product-b (above limit)
    expect(result.length).toBe(1);
    expect(result[0].fileSlug).toBe("product-a");
    expect(result[0].item.fileSlug).toBe("product-a");
  });

  test("Returns empty array when limit is -1 (no pagination)", () => {
    const testReviews = itemsFor("product-a", 100);
    const products = [createProduct({ slug: "product-a", title: "Product A" })];

    const factory = withReviewsPage("product", "products", (i) => i, -1);
    const result = factory(
      taggedCollectionApi({ product: products, review: testReviews }),
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

    const factory = reviewsRedirects("product", "products", -1);
    const result = factory(
      taggedCollectionApi({ product: products, review: testReviews }),
    );

    // All items get redirects when limit=-1
    expectFileSlugs(result, ["product-a", "product-b"]);
  });
});
