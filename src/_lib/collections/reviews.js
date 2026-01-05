import config from "#data/config.js";
import { filter, map, pipe } from "#utils/array-utils.js";
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
  const ratings = pipe(
    filter((review) => review.data[field]?.includes(slug)),
    map((r) => r.data.rating),
    filter((r) => r !== null && r !== undefined && !Number.isNaN(r)),
  )(reviews);

  if (ratings.length === 0) return null;
  const avg = ratings.reduce((a, b) => a + b, 0) / ratings.length;
  return Math.ceil(avg);
};

/**
 * Convert numeric rating to star emojis
 */
const ratingToStars = (rating) => {
  if (rating === null || rating === undefined) return "";
  return "⭐️".repeat(rating);
};

/**
 * Predefined list of slightly dark colors for avatar backgrounds
 * These ensure good contrast with white text
 */
const AVATAR_COLORS = [
  "#5C6BC0", // Indigo
  "#7E57C2", // Deep Purple
  "#AB47BC", // Purple
  "#EC407A", // Pink
  "#EF5350", // Red
  "#FF7043", // Deep Orange
  "#8D6E63", // Brown
  "#78909C", // Blue Grey
  "#26A69A", // Teal
  "#66BB6A", // Green
  "#9CCC65", // Light Green
  "#42A5F5", // Blue
];

/**
 * Extract initials from a name
 * Handles: "John Smith" -> "JS", "JS" -> "JS", "John" -> "J"
 */
const getInitials = (name) => {
  if (!name) return "?";
  const trimmed = name.trim();
  if (trimmed === "") return "?";
  if (trimmed.length <= 2) return trimmed.toUpperCase();
  const words = trimmed.split(/\s+/).filter(Boolean);
  if (words.length === 1) return words[0].charAt(0).toUpperCase();
  return (words[0].charAt(0) + words[words.length - 1].charAt(0)).toUpperCase();
};

/**
 * Generate an SVG data URI for a reviewer avatar
 * Uses the name to pick a consistent color and display initials
 */
const reviewerAvatar = (name) => {
  const str = name || "";
  const hash = Math.abs(
    [...str].reduce((h, char) => {
      const next = (h << 5) - h + char.charCodeAt(0);
      return next & next;
    }, 0),
  );
  const color = AVATAR_COLORS[hash % AVATAR_COLORS.length];
  const initials = getInitials(name);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40"><rect width="40" height="40" fill="${color}"/><text x="20" y="20" text-anchor="middle" dominant-baseline="central" fill="white" font-family="system-ui,sans-serif" font-size="16" font-weight="bold">${initials}</text></svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
};

/**
 * Default reviews truncate limit when not configured
 */
const DEFAULT_REVIEWS_LIMIT = 10;

/**
 * Helper to get items and reviews data for review page filtering
 * @param {string} tag - The tag to filter items by
 * @param {number} limitOverride - Optional limit override for testing
 * @param {Object} collectionApi - Eleventy collection API
 * @returns {Object} Object containing items, visibleReviews, and limit
 */
const getItemsAndReviewsData = (tag, limitOverride, collectionApi) => ({
  items: collectionApi.getFilteredByTag(tag) || [],
  visibleReviews: createReviewsCollection(collectionApi),
  limit:
    limitOverride !== undefined
      ? limitOverride
      : (config().reviews_truncate_limit ?? DEFAULT_REVIEWS_LIMIT),
});

/**
 * Factory: items with enough reviews for a separate /reviews page
 * @param {string} tag - The tag to filter items by
 * @param {string} reviewsField - The field to check for reviews
 * @param {Function} processItem - Optional function to transform items
 * @param {number} limitOverride - Optional limit override for testing
 */
const withReviewsPage =
  (tag, reviewsField, processItem = (item) => item, limitOverride) =>
  (collectionApi) => {
    const { items, visibleReviews, limit } = getItemsAndReviewsData(
      tag,
      limitOverride,
      collectionApi,
    );

    // If limit is -1, no truncation occurs so no separate page needed
    if (limit === -1) return [];

    return items
      .map(processItem)
      .filter(
        (item) =>
          countReviews(visibleReviews, item.fileSlug, reviewsField) > limit,
      );
  };

/**
 * Factory: redirect data for items without enough reviews for a separate page
 * @param {string} tag - The tag to filter items by
 * @param {string} reviewsField - The field to check for reviews
 * @param {number} limitOverride - Optional limit override for testing
 */
const reviewsRedirects =
  (tag, reviewsField, limitOverride) => (collectionApi) => {
    const { items, visibleReviews, limit } = getItemsAndReviewsData(
      tag,
      limitOverride,
      collectionApi,
    );

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
  eleventyConfig.addFilter("reviewerAvatar", reviewerAvatar);
};

export {
  createReviewsCollection,
  getReviewsFor,
  countReviews,
  getRating,
  ratingToStars,
  getInitials,
  reviewerAvatar,
  withReviewsPage,
  reviewsRedirects,
  configureReviews,
};
