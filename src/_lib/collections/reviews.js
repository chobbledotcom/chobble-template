/**
 * Reviews collection and filters
 *
 * @module #collections/reviews
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import config from "#data/config.js";
import { SRC_DIR } from "#lib/paths.js";
import { hashString } from "#media/thumbnail-placeholder.js";
import { filter, filterMap, map, pipe } from "#toolkit/fp/array.js";
import { createArrayFieldIndexer } from "#utils/collection-utils.js";
import { sortByDateDescending } from "#utils/sorting.js";

/** @typedef {import("#lib/types").ReviewCollectionItem} ReviewCollectionItem */
/** @typedef {import("#lib/types").EleventyCollectionItem} EleventyCollectionItem */

/** @typedef {"products" | "categories" | "properties"} ReviewIndexField */

// Load SVG templates once at module initialization
const AVATAR_SVG_TEMPLATE = readFileSync(
  join(SRC_DIR, "assets", "icons", "reviewer-avatar.svg"),
  "utf8",
);
const STAR_SVG = readFileSync(
  join(SRC_DIR, "assets", "icons", "rating-star.svg"),
  "utf8",
);

/** Index reviews by products for O(1) lookups, cached per reviews array */
const indexByProducts = createArrayFieldIndexer("products");

/** Index reviews by categories for O(1) lookups, cached per reviews array */
const indexByCategories = createArrayFieldIndexer("categories");

/** Index reviews by properties for O(1) lookups, cached per reviews array */
const indexByProperties = createArrayFieldIndexer("properties");

/**
 * Map field names to their respective indexers.
 * @type {Record<ReviewIndexField, (reviews: ReviewCollectionItem[]) => Record<string, ReviewCollectionItem[]>>}
 */
const fieldIndexers = {
  products: indexByProducts,
  categories: indexByCategories,
  properties: indexByProperties,
};

/**
 * Creates the main reviews collection.
 * Fetches all items tagged with "review", filters out hidden ones, and sorts by date.
 *
 * @param {import("@11ty/eleventy").CollectionApi} collectionApi
 * @returns {ReviewCollectionItem[]}
 */
const createReviewsCollection = (collectionApi) =>
  collectionApi
    .getFilteredByTag("reviews")
    .filter((review) => review.data.hidden !== true)
    .sort(sortByDateDescending);

/**
 * Check if a value is a valid rating number.
 * @param {unknown} value
 * @returns {value is number}
 */
const isValidRating = (value) =>
  typeof value === "number" && !Number.isNaN(value);

/**
 * Get reviews for a specific item by field.
 * Uses cached indexes for O(1) lookups when available.
 *
 * @param {ReviewCollectionItem[]} reviews - Array of review objects
 * @param {string} slug - The slug to filter by
 * @param {ReviewIndexField} field - The field to check (products, categories, properties)
 * @returns {ReviewCollectionItem[]} Filtered and sorted reviews
 */
const getReviewsFor = (reviews, slug, field) => {
  const indexer = fieldIndexers[field];
  return (indexer(reviews)[slug] ?? []).sort(sortByDateDescending);
};

/**
 * Count reviews for a specific item.
 *
 * @param {ReviewCollectionItem[]} reviews - Array of review objects
 * @param {string} slug - The slug to count reviews for
 * @param {ReviewIndexField} field - The field to check
 * @returns {number} Number of reviews
 */
const countReviews = (reviews, slug, field) =>
  getReviewsFor(reviews, slug, field).length;

/**
 * Calculate average rating for reviews matching a specific item.
 * Uses cached indexes via getReviewsFor for O(1) lookups.
 *
 * @param {ReviewCollectionItem[]} reviews - Array of review objects
 * @param {string} slug - The slug to calculate rating for
 * @param {ReviewIndexField} field - The field to check
 * @returns {number | null} Ceiling of average rating, or null if no ratings
 */
const getRating = (reviews, slug, field) => {
  const matchingReviews = getReviewsFor(reviews, slug, field);
  const ratings = pipe(
    map((r) => r.data.rating),
    filter(isValidRating),
  )(matchingReviews);

  if (ratings.length === 0) return null;
  const avg = ratings.reduce((a, b) => a + b, 0) / ratings.length;
  return Math.ceil(avg);
};

/**
 * Convert numeric rating to star display.
 *
 * @param {number} rating - The numeric rating (1-5)
 * @param {boolean} [useSvg=false] - Whether to use SVG stars instead of emojis
 * @returns {string} Stars repeated by the rating count (emoji or SVG)
 */
const ratingToStars = (rating, useSvg = false) =>
  useSvg ? STAR_SVG.repeat(rating) : "⭐️".repeat(rating);

/**
 * Predefined list of slightly dark colors for avatar backgrounds.
 * These ensure good contrast with white text.
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
 * Extract initials from a name.
 * "John Smith" -> "JS", "JS" -> "JS", "John" -> "J", "" -> "?"
 *
 * @param {string} str - Name string
 * @returns {string} Initials (1-2 characters)
 */
const extractInitials = (str) => {
  const trimmed = str.trim();
  if (trimmed.length === 0) return "?";
  if (trimmed.length <= 2) return trimmed.toUpperCase();
  const words = trimmed.split(/\s+/).filter(Boolean);
  if (words.length === 1) return words[0].charAt(0).toUpperCase();
  return (words[0].charAt(0) + words[words.length - 1].charAt(0)).toUpperCase();
};

/**
 * Generate an SVG data URI for a reviewer avatar.
 * Uses the name to pick a consistent color and display initials.
 *
 * @param {string} name - Reviewer name
 * @returns {string} Data URI for SVG avatar
 */
const reviewerAvatar = (name) => {
  const str = name ?? "";
  const color = AVATAR_COLORS[hashString(str) % AVATAR_COLORS.length];
  const initials = extractInitials(str);
  const svg = AVATAR_SVG_TEMPLATE.replace("{{color}}", color).replace(
    "{{initials}}",
    initials,
  );
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
};

/**
 * Redirect data for items without enough reviews.
 * @typedef {{ item: EleventyCollectionItem, fileSlug: string }} RedirectData
 */

/**
 * Map item to redirect data.
 *
 * @param {EleventyCollectionItem} item
 * @returns {RedirectData}
 */
const toRedirectData = (item) => ({ item, fileSlug: item.fileSlug });

/**
 * Factory helper for review-based collections.
 *
 * @template T
 * @param {ReviewIndexField} reviewsField - Field to check for reviews
 * @param {number | undefined} limitOverride - Optional limit override
 * @param {(items: EleventyCollectionItem[]) => T[]} onNoLimit - Handler when limit is -1
 * @param {(items: EleventyCollectionItem[], hasEnough: (item: EleventyCollectionItem) => boolean) => T[]} onLimit - Handler when limit applies
 * @returns {(collectionApi: import("@11ty/eleventy").CollectionApi) => T[]}
 */
const reviewsFactory =
  (reviewsField, limitOverride, onNoLimit, onLimit) => (collectionApi) => {
    const items = collectionApi.getFilteredByTag(reviewsField);
    const visibleReviews = createReviewsCollection(collectionApi);
    // config().reviews_truncate_limit is guaranteed by DEFAULTS (always number)
    const limit =
      limitOverride !== undefined
        ? limitOverride
        : config().reviews_truncate_limit;

    if (limit === -1) return onNoLimit(items);

    const hasEnoughReviews = (item) =>
      countReviews(visibleReviews, item.fileSlug, reviewsField) > limit;

    return onLimit(items, hasEnoughReviews);
  };

/**
 * Factory: items with enough reviews for a separate /reviews page.
 *
 * @template T
 * @param {ReviewIndexField} reviewsField - The collection tag and field to check for reviews
 * @param {(item: EleventyCollectionItem) => T} [processItem] - Optional function to transform items
 * @param {number} [limitOverride] - Optional limit override for testing
 * @returns {(collectionApi: import("@11ty/eleventy").CollectionApi) => T[]}
 */
const withReviewsPage = (
  reviewsField,
  processItem = (item) => /** @type {T} */ (item),
  limitOverride,
) =>
  reviewsFactory(
    reviewsField,
    limitOverride,
    () => [],
    (items, hasEnough) => pipe(map(processItem), filter(hasEnough))(items),
  );

/**
 * Factory: redirect data for items without enough reviews for a separate page.
 *
 * @param {ReviewIndexField} reviewsField - The collection tag and field to check for reviews
 * @param {number} [limitOverride] - Optional limit override for testing
 * @returns {(collectionApi: import("@11ty/eleventy").CollectionApi) => RedirectData[]}
 */
const reviewsRedirects = (reviewsField, limitOverride) =>
  reviewsFactory(
    reviewsField,
    limitOverride,
    (items) => pipe(map(toRedirectData))(items),
    (items, hasEnough) =>
      filterMap((item) => !hasEnough(item), toRedirectData)(items),
  );

/**
 * Configure reviews collection and filters for Eleventy.
 *
 * @param {import('11ty.ts').EleventyConfig} eleventyConfig
 */
const configureReviews = (eleventyConfig) => {
  eleventyConfig.addCollection("reviews", createReviewsCollection);
  // @ts-expect-error - Filter returns array for data transformation, not string
  eleventyConfig.addFilter("getReviewsFor", getReviewsFor);
  // @ts-expect-error - Filter returns number for data transformation, not string
  eleventyConfig.addFilter("getRating", getRating);
  eleventyConfig.addFilter("ratingToStars", ratingToStars);
  eleventyConfig.addFilter("reviewerAvatar", reviewerAvatar);
};

export { getReviewsFor, withReviewsPage, reviewsRedirects, configureReviews };
