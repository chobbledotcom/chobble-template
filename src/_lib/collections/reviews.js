import config from "#data/config.js";
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
 * Count reviews for a specific item
 * @param {Array} reviews - Array of review objects
 * @param {string} slug - The slug to count reviews for
 * @param {string} field - The field to check
 */
const countReviews = (reviews, slug, field) =>
  reviews.filter((review) => review.data[field]?.includes(slug)).length;

/**
 * Calculate average rating for reviews matching a specific item
 * @param {Array} reviews - Array of review objects
 * @param {string} slug - The slug to calculate rating for
 * @param {string} field - The field to check
 * @returns {number|null} Ceiling of average rating, or null if no ratings
 */
const getRating = (reviews, slug, field) => {
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
 * Convert numeric rating to star emojis
 */
const ratingToStars = (rating) => {
  if (rating == null) return "";
  return "⭐️".repeat(rating);
};

/**
 * Generic factory to create a collection of items that have enough reviews
 * to warrant a separate reviews page (more than reviews_truncate_limit)
 * @param {string} tag - The tag to filter items by (e.g., 'product', 'property')
 * @param {string} reviewsField - The field name in reviews (e.g., 'products', 'properties')
 * @param {Function} processItem - Optional function to process each item (e.g., addGallery)
 * @returns {Function} Collection creator function for Eleventy
 */
const createItemsWithReviewsPageCollection =
  (tag, reviewsField, processItem = (item) => item) =>
  (collectionApi) => {
    const items = collectionApi.getFilteredByTag(tag) || [];
    const visibleReviews = createReviewsCollection(collectionApi);
    const limit = config().reviews_truncate_limit;

    // If limit is -1, no truncation occurs so no separate page needed
    if (limit === -1) return [];

    return items
      .map(processItem)
      .filter(
        (item) => countReviews(visibleReviews, item.fileSlug, reviewsField) > limit,
      );
  };

/**
 * Generic factory to create a collection of redirect data for items that don't have
 * enough reviews for a separate page (reviews <= reviews_truncate_limit)
 * @param {string} tag - The tag to filter items by (e.g., 'product', 'property')
 * @param {string} reviewsField - The field name in reviews (e.g., 'products', 'properties')
 * @returns {Function} Collection creator function for Eleventy
 */
const createItemReviewsRedirectsCollection =
  (tag, reviewsField) => (collectionApi) => {
    const items = collectionApi.getFilteredByTag(tag) || [];
    const visibleReviews = createReviewsCollection(collectionApi);
    const limit = config().reviews_truncate_limit;

    // If limit is -1, no truncation occurs so all items need redirects
    if (limit === -1) {
      return items.map((item) => ({
        item,
        fileSlug: item.fileSlug,
      }));
    }

    return items
      .filter(
        (item) =>
          countReviews(visibleReviews, item.fileSlug, reviewsField) <= limit,
      )
      .map((item) => ({
        item,
        fileSlug: item.fileSlug,
      }));
  };

/**
 * Configure reviews collection and filters for Eleventy
 */
const configureReviews = (eleventyConfig) => {
  eleventyConfig.addCollection("reviews", createReviewsCollection);
  eleventyConfig.addFilter("getReviewsFor", getReviewsFor);
  eleventyConfig.addFilter("getRating", getRating);
  eleventyConfig.addFilter("ratingToStars", ratingToStars);
};

export {
  createReviewsCollection,
  getReviewsFor,
  countReviews,
  getRating,
  ratingToStars,
  createItemsWithReviewsPageCollection,
  createItemReviewsRedirectsCollection,
  configureReviews,
};
