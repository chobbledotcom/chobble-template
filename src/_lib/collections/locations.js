/**
 * @param {import("#lib/types").EleventyCollectionItem[]} locations
 * @returns {import("#lib/types").EleventyCollectionItem[]}
 */
const getRootLocations = (locations) =>
  locations.filter((loc) => !loc.data.parentLocation);

/**
 * Get sibling locations (same parent) excluding the current page
 * Replaces gnarly Liquid loop with unless/push pattern
 *
 * @param {import("#lib/types").EleventyCollectionItem[]} locations
 * @param {string} parentLocationSlug
 * @param {string} [currentUrl]
 * @returns {import("#lib/types").EleventyCollectionItem[]}
 */
const getSiblingLocations = (locations, parentLocationSlug, currentUrl) =>
  locations.filter(
    (loc) =>
      loc.data.parentLocation === parentLocationSlug && loc.url !== currentUrl,
  );

const configureLocations = (eleventyConfig) => {
  eleventyConfig.addFilter("getRootLocations", getRootLocations);
  eleventyConfig.addFilter("getSiblingLocations", getSiblingLocations);
};

export { getRootLocations, getSiblingLocations, configureLocations };
