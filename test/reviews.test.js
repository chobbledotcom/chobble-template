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
import {
  createMockEleventyConfig,
  createTestRunner,
  expectDeepEqual,
  expectFunctionType,
  expectStrictEqual,
} from "#test/test-utils.js";

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
    name: "getReviewsFor-products",
    description: "Filters reviews by products field and sorts newest first",
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

      const result = getReviewsFor(reviews, "product-a", "products");

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
    name: "getReviewsFor-no-matches",
    description: "Handles reviews without matching field",
    test: () => {
      const reviews = [
        { data: { title: "Review 1" } },
        { data: { title: "Review 2", products: null } },
        { data: { title: "Review 3", products: [] } },
      ];

      const result = getReviewsFor(reviews, "product-a", "products");

      expectStrictEqual(
        result.length,
        0,
        "Should return no reviews when none have matching field",
      );
    },
  },
  {
    name: "getReviewsFor-categories",
    description: "Filters reviews by categories field",
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

      const result = getReviewsFor(reviews, "category-a", "categories");

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
    name: "getReviewsFor-properties",
    description: "Filters reviews by properties field",
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

      const result = getReviewsFor(reviews, "property-a", "properties");

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
    name: "getReviewsFor-custom-field",
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
    name: "countReviews-basic",
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
        countReviews(reviews, "product-b", "products"),
        1,
        "Should count 1 review for product-b",
      );
      expectStrictEqual(
        countReviews(reviews, "product-d", "products"),
        0,
        "Should count 0 reviews for non-existent product",
      );
      expectStrictEqual(
        countReviews(reviews, "category-a", "categories"),
        1,
        "Should count 1 review for category-a",
      );
    },
  },
  {
    name: "getRating-basic",
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
    name: "getRating-ceiling",
    description: "Returns ceiling of average rating",
    test: () => {
      const reviews = [
        { data: { products: ["product-a"], rating: 5 } },
        { data: { products: ["product-a"], rating: 4 } },
      ];

      expectStrictEqual(
        getRating(reviews, "product-a", "products"),
        5,
        "Should calculate ceiling of average (4.5 -> 5)",
      );
    },
  },
  {
    name: "getRating-no-ratings",
    description: "Returns null when no ratings exist",
    test: () => {
      const reviews = [
        { data: { products: ["product-a"] } },
        { data: { products: ["product-a"], rating: null } },
      ];

      expectStrictEqual(
        getRating(reviews, "product-a", "products"),
        null,
        "Should return null when no valid ratings",
      );
    },
  },
  {
    name: "getRating-no-matches",
    description: "Returns null when no matching items",
    test: () => {
      const reviews = [{ data: { products: ["product-b"], rating: 5 } }];

      expectStrictEqual(
        getRating(reviews, "product-a", "products"),
        null,
        "Should return null for non-existent product",
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
    name: "getInitials-full-name",
    description: "Extracts first and last initials from full name",
    test: () => {
      expectStrictEqual(
        getInitials("John Smith"),
        "JS",
        "Should return JS for John Smith",
      );
      expectStrictEqual(
        getInitials("Alice Bob Carol"),
        "AC",
        "Should return first and last initials for three-word name",
      );
      expectStrictEqual(
        getInitials("Mary Jane Watson Parker"),
        "MP",
        "Should use first and last word for four-word name",
      );
    },
  },
  {
    name: "getInitials-single-name",
    description: "Returns single initial for single word name",
    test: () => {
      expectStrictEqual(
        getInitials("Madonna"),
        "M",
        "Should return M for single name",
      );
      expectStrictEqual(getInitials("Cher"), "C", "Should return C for Cher");
    },
  },
  {
    name: "getInitials-already-initials",
    description: "Returns name unchanged if already 2 chars or less",
    test: () => {
      expectStrictEqual(getInitials("JS"), "JS", "Should return JS unchanged");
      expectStrictEqual(getInitials("A"), "A", "Should return A unchanged");
      expectStrictEqual(getInitials("ab"), "AB", "Should uppercase ab to AB");
    },
  },
  {
    name: "getInitials-empty-null",
    description: "Handles empty/null names gracefully",
    test: () => {
      expectStrictEqual(getInitials(""), "?", "Should return ? for empty");
      expectStrictEqual(getInitials(null), "?", "Should return ? for null");
      expectStrictEqual(
        getInitials(undefined),
        "?",
        "Should return ? for undefined",
      );
    },
  },
  {
    name: "getInitials-whitespace",
    description: "Handles extra whitespace in names",
    test: () => {
      expectStrictEqual(
        getInitials("  John   Smith  "),
        "JS",
        "Should handle extra whitespace",
      );
      expectStrictEqual(
        getInitials("   "),
        "?",
        "Should return ? for only whitespace",
      );
      expectStrictEqual(
        getInitials("\t\n"),
        "?",
        "Should return ? for tabs and newlines",
      );
    },
  },
  {
    name: "getInitials-lowercase",
    description: "Uppercases lowercase initials",
    test: () => {
      expectStrictEqual(
        getInitials("john smith"),
        "JS",
        "Should uppercase lowercase names",
      );
      expectStrictEqual(
        getInitials("mary jane"),
        "MJ",
        "Should uppercase mary jane to MJ",
      );
    },
  },
  {
    name: "getInitials-mixed-case",
    description: "Handles mixed case names correctly",
    test: () => {
      expectStrictEqual(
        getInitials("jOHN sMITH"),
        "JS",
        "Should handle inverted case",
      );
      expectStrictEqual(
        getInitials("McDonald"),
        "M",
        "Should return M for McDonald",
      );
    },
  },
  {
    name: "getInitials-hyphenated-names",
    description: "Treats hyphenated parts as single words",
    test: () => {
      expectStrictEqual(
        getInitials("Mary-Jane Watson"),
        "MW",
        "Should treat Mary-Jane as one word",
      );
      expectStrictEqual(
        getInitials("Jean-Claude Van Damme"),
        "JD",
        "Should return JD for Jean-Claude Van Damme",
      );
    },
  },
  {
    name: "getInitials-apostrophe-names",
    description: "Handles names with apostrophes",
    test: () => {
      expectStrictEqual(
        getInitials("O'Brien"),
        "O",
        "Should return O for O'Brien",
      );
      expectStrictEqual(
        getInitials("Shaquille O'Neal"),
        "SO",
        "Should return SO for Shaquille O'Neal",
      );
      expectStrictEqual(
        getInitials("D'Angelo Russell"),
        "DR",
        "Should return DR for D'Angelo Russell",
      );
    },
  },
  {
    name: "getInitials-accented-characters",
    description: "Handles accented and unicode characters",
    test: () => {
      expectStrictEqual(
        getInitials("José García"),
        "JG",
        "Should handle accented characters",
      );
      expectStrictEqual(
        getInitials("Müller Schmidt"),
        "MS",
        "Should handle umlauts",
      );
      expectStrictEqual(getInitials("Björk"), "B", "Should return B for Björk");
    },
  },
  {
    name: "getInitials-numbers-in-name",
    description: "Handles names containing numbers",
    test: () => {
      expectStrictEqual(
        getInitials("John Smith III"),
        "JI",
        "Should use III as last word",
      );
      expectStrictEqual(
        getInitials("R2D2"),
        "R",
        "Should return first char for single-word alphanumeric",
      );
      expectStrictEqual(
        getInitials("C3"),
        "C3",
        "Should return 2-char alphanumeric unchanged",
      );
    },
  },
  {
    name: "reviewerAvatar-returns-data-uri",
    description: "Returns a valid SVG data URI",
    test: () => {
      const result = reviewerAvatar("John Smith");
      expectStrictEqual(
        result.startsWith("data:image/svg+xml,"),
        true,
        "Should return data URI",
      );
      expectStrictEqual(
        result.includes("JS"),
        true,
        "Should include initials in SVG",
      );
    },
  },
  {
    name: "reviewerAvatar-consistent-color",
    description: "Returns same color for same name",
    test: () => {
      const result1 = reviewerAvatar("John Smith");
      const result2 = reviewerAvatar("John Smith");
      expectStrictEqual(
        result1,
        result2,
        "Same name should produce same avatar",
      );
    },
  },
  {
    name: "reviewerAvatar-different-colors",
    description: "Returns different colors for different names",
    test: () => {
      const result1 = reviewerAvatar("John Smith");
      const result2 = reviewerAvatar("Jane Doe");
      expectStrictEqual(
        result1 !== result2,
        true,
        "Different names should produce different avatars",
      );
    },
  },
  {
    name: "configureReviews-basic",
    description: "Configures reviews collection and filters",
    test: () => {
      const mockConfig = createMockEleventyConfig();

      configureReviews(mockConfig);

      expectFunctionType(
        mockConfig.collections,
        "reviews",
        "Should add reviews collection",
      );
      expectFunctionType(
        mockConfig.filters,
        "getReviewsFor",
        "Should add getReviewsFor filter",
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
      expectFunctionType(
        mockConfig.filters,
        "reviewerAvatar",
        "Should add reviewerAvatar filter",
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

      getReviewsFor(reviewsCopy, "product-1", "products");

      expectDeepEqual(
        reviewsCopy,
        originalReviews,
        "getReviewsFor should not modify input",
      );
    },
  },
  {
    name: "withReviewsPage-filters-by-review-count",
    description: "Returns only items exceeding the truncate limit",
    test: () => {
      // 11 reviews for product-a (above limit of 10), 10 for product-b (at limit)
      const reviews = [];
      for (let i = 0; i < 11; i++) {
        reviews.push({
          data: { products: ["product-a"], rating: 5 },
          date: new Date(`2024-01-${String(i + 1).padStart(2, "0")}`),
        });
      }
      for (let i = 0; i < 10; i++) {
        reviews.push({
          data: { products: ["product-b"], rating: 4 },
          date: new Date(`2024-02-${String(i + 1).padStart(2, "0")}`),
        });
      }

      const products = [
        { fileSlug: "product-a", data: { title: "Product A" } },
        { fileSlug: "product-b", data: { title: "Product B" } },
      ];

      const mockCollectionApi = {
        getFilteredByTag: (tag) => {
          if (tag === "product") return products;
          if (tag === "review") return reviews;
          return [];
        },
      };

      const factory = withReviewsPage("product", "products");
      const result = factory(mockCollectionApi);

      // Only product-a (11 reviews) should be included, not product-b (10 reviews)
      // This tests the boundary: > limit, not >= limit
      expectStrictEqual(result.length, 1, "Should return only items > limit");
      expectStrictEqual(
        result[0].fileSlug,
        "product-a",
        "Should include product-a (11 > 10)",
      );
    },
  },
  {
    name: "withReviewsPage-applies-processItem",
    description: "Transforms items through the optional processItem callback",
    test: () => {
      const reviews = [];
      for (let i = 0; i < 15; i++) {
        reviews.push({
          data: { products: ["product-a"], rating: 5 },
          date: new Date(`2024-01-${String(i + 1).padStart(2, "0")}`),
        });
      }

      const products = [
        { fileSlug: "product-a", data: { title: "Product A" } },
      ];

      const mockCollectionApi = {
        getFilteredByTag: (tag) => {
          if (tag === "product") return products;
          if (tag === "review") return reviews;
          return [];
        },
      };

      const processItem = (item) => ({ ...item, transformed: true });
      const factory = withReviewsPage("product", "products", processItem);
      const result = factory(mockCollectionApi);

      expectStrictEqual(result.length, 1, "Should return transformed item");
      expectStrictEqual(
        result[0].transformed,
        true,
        "Should apply processItem transformation",
      );
    },
  },
  {
    name: "reviewsRedirects-returns-items-at-or-below-limit",
    description: "Returns redirect data for items not needing separate pages",
    test: () => {
      // 10 reviews for product-a (at limit), 11 for product-b (above limit)
      const reviews = [];
      for (let i = 0; i < 10; i++) {
        reviews.push({
          data: { products: ["product-a"], rating: 5 },
          date: new Date(`2024-01-${String(i + 1).padStart(2, "0")}`),
        });
      }
      for (let i = 0; i < 11; i++) {
        reviews.push({
          data: { products: ["product-b"], rating: 4 },
          date: new Date(`2024-02-${String(i + 1).padStart(2, "0")}`),
        });
      }

      const products = [
        { fileSlug: "product-a", data: { title: "Product A" } },
        { fileSlug: "product-b", data: { title: "Product B" } },
      ];

      const mockCollectionApi = {
        getFilteredByTag: (tag) => {
          if (tag === "product") return products;
          if (tag === "review") return reviews;
          return [];
        },
      };

      const factory = reviewsRedirects("product", "products");
      const result = factory(mockCollectionApi);

      // Only product-a (10 reviews) should get redirect, not product-b (11 reviews)
      // This tests the boundary: <= limit, not < limit
      expectStrictEqual(result.length, 1, "Should return only items <= limit");
      expectStrictEqual(
        result[0].fileSlug,
        "product-a",
        "Should include product-a (10 <= 10)",
      );
      // Verify the return structure includes the item reference
      expectStrictEqual(
        result[0].item.fileSlug,
        "product-a",
        "Should include original item in return structure",
      );
    },
  },
  {
    name: "withReviewsPage-limit-negative-one-returns-empty",
    description: "Returns empty array when limit is -1 (no pagination)",
    test: () => {
      const reviews = [];
      for (let i = 0; i < 100; i++) {
        reviews.push({
          data: { products: ["product-a"], rating: 5 },
          date: new Date(`2024-01-01`),
        });
      }

      const products = [
        { fileSlug: "product-a", data: { title: "Product A" } },
      ];

      const mockCollectionApi = {
        getFilteredByTag: (tag) => {
          if (tag === "product") return products;
          if (tag === "review") return reviews;
          return [];
        },
      };

      // Pass -1 as limitOverride to test the "no pagination" branch
      const factory = withReviewsPage(
        "product",
        "products",
        (item) => item,
        -1,
      );
      const result = factory(mockCollectionApi);

      // Even with 100 reviews, limit=-1 means no separate pages
      expectStrictEqual(
        result.length,
        0,
        "Should return empty when limit is -1",
      );
    },
  },
  {
    name: "reviewsRedirects-limit-negative-one-returns-all",
    description: "Returns all items when limit is -1 (no pagination)",
    test: () => {
      const reviews = [];
      for (let i = 0; i < 100; i++) {
        reviews.push({
          data: { products: ["product-a"], rating: 5 },
          date: new Date(`2024-01-01`),
        });
      }

      const products = [
        { fileSlug: "product-a", data: { title: "Product A" } },
        { fileSlug: "product-b", data: { title: "Product B" } },
      ];

      const mockCollectionApi = {
        getFilteredByTag: (tag) => {
          if (tag === "product") return products;
          if (tag === "review") return reviews;
          return [];
        },
      };

      // Pass -1 as limitOverride to test the "all redirects" branch
      const factory = reviewsRedirects("product", "products", -1);
      const result = factory(mockCollectionApi);

      // All items get redirects when limit=-1
      expectStrictEqual(
        result.length,
        2,
        "Should return all items when limit is -1",
      );
      expectStrictEqual(
        result[0].fileSlug,
        "product-a",
        "Should include product-a",
      );
      expectStrictEqual(
        result[1].fileSlug,
        "product-b",
        "Should include product-b",
      );
    },
  },
];

export default createTestRunner("reviews", testCases);
