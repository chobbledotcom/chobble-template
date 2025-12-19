const getRootLocations = (locations) =>
  locations?.filter((loc) => !loc.data.parentLocation) || [];

const configureLocations = (eleventyConfig) => {
  eleventyConfig.addFilter("getRootLocations", getRootLocations);
};

export { getRootLocations, configureLocations };
