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
 * Simple string hash function for consistent color selection
 */
const hashString = (str) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return Math.abs(hash);
};

/**
 * Extract initials from a name
 * Handles: "John Smith" -> "JS", "JS" -> "JS", "John" -> "J"
 */
const getInitials = (name) => {
  if (!name) return "?";
  const trimmed = name.trim();
  if (!trimmed) return "?";
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
  const color = AVATAR_COLORS[hashString(name || "") % AVATAR_COLORS.length];
  const initials = getInitials(name);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40"><rect width="40" height="40" fill="${color}"/><text x="20" y="20" text-anchor="middle" dominant-baseline="central" fill="white" font-family="system-ui,sans-serif" font-size="16" font-weight="bold">${initials}</text></svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
};

/**
 * Factory: items with enough reviews for a separate /reviews page
 */
const withReviewsPage =
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
        (item) =>
          countReviews(visibleReviews, item.fileSlug, reviewsField) > limit,
      );
  };

/**
 * Factory: redirect data for items without enough reviews for a separate page
 */
const reviewsRedirects = (tag, reviewsField) => (collectionApi) => {
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
