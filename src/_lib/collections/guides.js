const guidesByCategory = (guidePages, categorySlug) => {
  if (!guidePages || !categorySlug) return [];
  return guidePages.filter(
    (page) => page.data["guide-category"] === categorySlug,
  );
};

const configureGuides = (eleventyConfig) => {
  eleventyConfig.addCollection(
    "guide-categories",
    (collectionApi) => collectionApi.getFilteredByTag("guide-category") || [],
  );
  eleventyConfig.addCollection(
    "guide-pages",
    (collectionApi) => collectionApi.getFilteredByTag("guide-page") || [],
  );
  eleventyConfig.addFilter("guidesByCategory", guidesByCategory);
};

export { guidesByCategory, configureGuides };
