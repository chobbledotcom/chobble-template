const createGuideCategoriesCollection = (collectionApi) => {
  return collectionApi.getFilteredByTag("guide_category");
};

const createGuidePagesCollection = (collectionApi) => {
  return collectionApi.getFilteredByTag("guide_page");
};

const getGuidePagesByCategory = (guidePages, categorySlug) => {
  if (!guidePages || !categorySlug) return [];
  return guidePages.filter(
    (page) => page.data.guide_category === categorySlug,
  );
};

const configureGuides = (eleventyConfig) => {
  eleventyConfig.addCollection(
    "guide_categories",
    createGuideCategoriesCollection,
  );
  eleventyConfig.addCollection("guide_pages", createGuidePagesCollection);
  eleventyConfig.addFilter("getGuidePagesByCategory", getGuidePagesByCategory);
};

export {
  createGuideCategoriesCollection,
  createGuidePagesCollection,
  getGuidePagesByCategory,
  configureGuides,
};
