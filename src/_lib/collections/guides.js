const guidesByCategory = (guidePages, categorySlug) => {
  if (!guidePages || !categorySlug) return [];
  return guidePages.filter((page) => page.data.guide_category === categorySlug);
};

const configureGuides = (eleventyConfig) => {
  eleventyConfig.addCollection("guide_categories", (collectionApi) =>
    collectionApi.getFilteredByTag("guide_category"),
  );
  eleventyConfig.addCollection("guide_pages", (collectionApi) =>
    collectionApi.getFilteredByTag("guide_page"),
  );
  eleventyConfig.addFilter("guidesByCategory", guidesByCategory);
};

export { configureGuides };
