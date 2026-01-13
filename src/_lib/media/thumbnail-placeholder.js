/**
 * Thumbnail placeholder selection based on item path.
 *
 * Provides consistent placeholder image selection by hashing the item path.
 * The same path will always return the same placeholder.
 */

import { pipe } from "#utils/array-utils.js";

// Available placeholder colors in src/images/placeholders/
const PLACEHOLDER_COLORS = [
  "green",
  "blue",
  "pink",
  "yellow",
  "purple",
  "orange",
];

/**
 * Simple hash function for strings.
 * Produces a positive integer suitable for modulo operations.
 *
 * @param {string} str - String to hash
 * @returns {number} Positive hash value
 */
const hashString = (str) =>
  Math.abs(
    [...str].reduce((hash, char) => (hash * 31 + char.charCodeAt(0)) | 0, 0),
  );

/**
 * Get placeholder image path based on item path.
 * Uses a hash to consistently select the same placeholder for a given path.
 *
 * @param {string} itemPath - The item's URL path (e.g., "/products/widget/")
 * @returns {string} Path to placeholder SVG (e.g., "images/placeholders/green.svg")
 */
const getPlaceholderForPath = (itemPath) =>
  pipe(
    hashString,
    (hash) => hash % PLACEHOLDER_COLORS.length,
    (index) => PLACEHOLDER_COLORS[index],
    (color) => `images/placeholders/${color}.svg`,
  )(itemPath || "");

/**
 * Configure thumbnail placeholder filter for Eleventy.
 *
 * @param {Object} eleventyConfig - Eleventy configuration object
 */
const configureThumbnailPlaceholder = (eleventyConfig) => {
  eleventyConfig.addFilter("thumbnailPlaceholder", getPlaceholderForPath);
};

export {
  PLACEHOLDER_COLORS,
  hashString,
  getPlaceholderForPath,
  configureThumbnailPlaceholder,
};
