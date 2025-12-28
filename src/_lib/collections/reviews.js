import { sortByDateDescending } from "#utils/sorting.js";
import config from "#data/config.js";

/**
 * Creates the main reviews collection.
 * Fetches all items tagged with "review", filters out hidden ones, and sorts by date.
 */
const createReviewsCollection = (collectionApi) => {
  const reviews = collectionApi.getFilteredByTag("review") || [];
  return reviews
    .filter((review) => review.data.hidden !== true)
    .sort(sortByDateDescending);
};

/**
 * Generic function to filter reviews by a specific field (products, categories, properties).
 * @param {Array} reviews - Array of review objects
 * @param {string} slug - The slug to filter by
 * @param {string} field - The field to check (e.g., 'products', 'categories', 'properties')
 * @returns {Array} Filtered and sorted reviews
 */
const getReviewsFor = (reviews, slug, field) =>
  reviews
    .filter((review) => review.data[field]?.includes(slug))
    .sort(sortByDateDescending);

/**
 * Get reviews for a specific product
 */
const getReviewsByProduct = (reviews, productSlug) =>
  getReviewsFor(reviews, productSlug, "products");

/**
 * Get reviews for a specific category
 */
const getReviewsByCategory = (reviews, categorySlug) =>
  getReviewsFor(reviews, categorySlug, "categories");

/**
 * Get reviews for a specific property
 */
const getReviewsByProperty = (reviews, propertySlug) =>
  getReviewsFor(reviews, propertySlug, "properties");

/**
 * Count reviews for a specific item
 * @param {Array} reviews - Array of review objects
 * @param {string} slug - The slug to count reviews for
 * @param {string} field - The field to check (defaults to 'products')
 */
const countReviews = (reviews, slug, field = "products") =>
  reviews.filter((review) => review.data[field]?.includes(slug)).length;

/**
 * Helper to count reviews for a product (backward compatibility)
 */
const countProductReviews = (reviews, productSlug) =>
  countReviews(reviews, productSlug, "products");

/**
 * Calculate average rating for reviews matching a specific item
 * @param {Array} reviews - Array of review objects
 * @param {string} slug - The slug to calculate rating for
 * @param {string} field - The field to check (defaults to 'products')
 * @returns {number|null} Ceiling of average rating, or null if no ratings
 */
const getRating = (reviews, slug, field = "products") => {
  const matchingReviews = reviews.filter((review) =>
    review.data[field]?.includes(slug),
  );
  const ratingsWithValues = matchingReviews
    .map((r) => r.data.rating)
    .filter((r) => r != null && !isNaN(r));
  if (ratingsWithValues.length === 0) return null;
  const avg =
    ratingsWithValues.reduce((a, b) => a + b, 0) / ratingsWithValues.length;
  return Math.ceil(avg);
};

/**
 * Get product rating (backward compatibility wrapper)
 */
const getProductRating = (reviews, productSlug) =>
  getRating(reviews, productSlug, "products");

/**
 * Get category rating
 */
const getCategoryRating = (reviews, categorySlug) =>
  getRating(reviews, categorySlug, "categories");

/**
 * Get property rating
 */
const getPropertyRating = (reviews, propertySlug) =>
  getRating(reviews, propertySlug, "properties");

/**
 * Convert numeric rating to star emojis
 */
const ratingToStars = (rating) => {
  if (rating == null) return "";
  return "⭐️".repeat(rating);
};

/**
 * Creates a collection of products that have enough reviews
 * to warrant a separate reviews page (more than reviews_truncate_limit)
 */
const createProductsWithReviewsPageCollection = (
  collectionApi,
  addGalleryFn,
) => {
  const products = collectionApi.getFilteredByTag("product") || [];
  const reviews = collectionApi.getFilteredByTag("review") || [];
  const visibleReviews = reviews.filter((r) => r.data.hidden !== true);
  const limit = config().reviews_truncate_limit;

  // If limit is -1, no truncation occurs so no separate page needed
  if (limit === -1) return [];

  return products
    .map(addGalleryFn)
    .filter(
      (product) => countProductReviews(visibleReviews, product.fileSlug) > limit,
    );
};

/**
 * Creates a collection of redirect data for products that don't have
 * enough reviews for a separate page (reviews <= reviews_truncate_limit)
 */
const createProductReviewsRedirectsCollection = (collectionApi) => {
  const products = collectionApi.getFilteredByTag("product") || [];
  const reviews = collectionApi.getFilteredByTag("review") || [];
  const visibleReviews = reviews.filter((r) => r.data.hidden !== true);
  const limit = config().reviews_truncate_limit;

  // If limit is -1, no truncation occurs so all products need redirects
  if (limit === -1) {
    return products.map((product) => ({
      product,
      fileSlug: product.fileSlug,
    }));
  }

  return products
    .filter(
      (product) =>
        countProductReviews(visibleReviews, product.fileSlug) <= limit,
    )
    .map((product) => ({
      product,
      fileSlug: product.fileSlug,
    }));
};

/**
 * Configure reviews collections and filters for Eleventy
 */
const configureReviews = (eleventyConfig, { addGalleryFn } = {}) => {
  eleventyConfig.addCollection("reviews", createReviewsCollection);

  if (addGalleryFn) {
    eleventyConfig.addCollection("productsWithReviewsPage", (collectionApi) =>
      createProductsWithReviewsPageCollection(collectionApi, addGalleryFn),
    );
  }

  eleventyConfig.addCollection(
    "productReviewsRedirects",
    createProductReviewsRedirectsCollection,
  );

  // Product review filters (backward compatibility)
  eleventyConfig.addFilter("getReviewsByProduct", getReviewsByProduct);
  eleventyConfig.addFilter("getProductRating", getProductRating);

  // Category review filters
  eleventyConfig.addFilter("getReviewsByCategory", getReviewsByCategory);
  eleventyConfig.addFilter("getCategoryRating", getCategoryRating);

  // Property review filters
  eleventyConfig.addFilter("getReviewsByProperty", getReviewsByProperty);
  eleventyConfig.addFilter("getPropertyRating", getPropertyRating);

  // Generic filters
  eleventyConfig.addFilter("getRating", getRating);
  eleventyConfig.addFilter("ratingToStars", ratingToStars);
};

export {
  createReviewsCollection,
  getReviewsFor,
  getReviewsByProduct,
  getReviewsByCategory,
  getReviewsByProperty,
  countReviews,
  countProductReviews,
  getRating,
  getProductRating,
  getCategoryRating,
  getPropertyRating,
  ratingToStars,
  createProductsWithReviewsPageCollection,
  createProductReviewsRedirectsCollection,
  configureReviews,
};
