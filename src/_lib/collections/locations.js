/**
 * Locations collection and filters
 *
 * @module #collections/locations
 */

/** @typedef {import("#lib/types").LocationCollectionItem} LocationCollectionItem */

/**
 * Get root locations (locations without a parent).
 *
 * @param {LocationCollectionItem[]} locations - All locations
 * @returns {LocationCollectionItem[]} Locations without a parent
 */
const getRootLocations = (locations) =>
  locations.filter((loc) => !loc.data.parentLocation);

/**
 * Get sibling locations (same parent) excluding the current page.
 * Replaces gnarly Liquid loop with unless/push pattern.
 *
 * @param {LocationCollectionItem[]} locations - All locations
 * @param {string} parentLocationSlug - Parent location slug
 * @param {string} [currentUrl] - Current page URL to exclude
 * @returns {LocationCollectionItem[]} Sibling locations
 */
const getSiblingLocations = (locations, parentLocationSlug, currentUrl) =>
  locations.filter(
    (loc) =>
      loc.data.parentLocation === parentLocationSlug && loc.url !== currentUrl,
  );

/**
 * Configure locations filters for Eleventy.
 *
 * @param {import('11ty.ts').EleventyConfig} eleventyConfig
 */
const configureLocations = (eleventyConfig) => {
  // @ts-expect-error - Filter returns array for data transformation, not string
  eleventyConfig.addFilter("getRootLocations", getRootLocations);
  // @ts-expect-error - Filter returns array for data transformation, not string
  eleventyConfig.addFilter("getSiblingLocations", getSiblingLocations);
};

export { getRootLocations, getSiblingLocations, configureLocations };
