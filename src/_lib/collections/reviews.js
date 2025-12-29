import { sortByDateDescending } from "#utils/sorting.js";

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
 * Count reviews for a product
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
 * Get product rating
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
 * Configure reviews collection and filters for Eleventy
 */
const configureReviews = (eleventyConfig) => {
  eleventyConfig.addCollection("reviews", createReviewsCollection);

  // Product review filters
  eleventyConfig.addFilter("getReviewsByProduct", getReviewsByProduct);
  eleventyConfig.addFilter("getProductRating", getProductRating);

  // Category review filters
  eleventyConfig.addFilter("getReviewsByCategory", getReviewsByCategory);
  eleventyConfig.addFilter("getCategoryRating", getCategoryRating);

  // Property review filters
  eleventyConfig.addFilter("getReviewsByProperty", getReviewsByProperty);
  eleventyConfig.addFilter("getPropertyRating", getPropertyRating);

  // Generic filters
  eleventyConfig.addFilter("getReviewsFor", getReviewsFor);
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
  configureReviews,
};
