const getRootLocations = (locations) =>
  locations?.filter((loc) => !loc.data.parentLocation) || [];

/**
 * Get sibling locations (same parent) excluding the current page
 * Replaces gnarly Liquid loop with unless/push pattern
 */
const getSiblingLocations = (locations, parentLocationSlug, currentUrl) => {
  if (!locations || !parentLocationSlug) return [];
  return locations.filter(
    (loc) =>
      loc.data.parentLocation === parentLocationSlug && loc.url !== currentUrl,
  );
};

const configureLocations = (eleventyConfig) => {
  eleventyConfig.addFilter("getRootLocations", getRootLocations);
  eleventyConfig.addFilter("getSiblingLocations", getSiblingLocations);
};

export { getRootLocations, getSiblingLocations, configureLocations };
