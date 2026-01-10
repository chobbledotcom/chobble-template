/**
 * @param {import("#lib/types").EleventyCollectionItem[]} guidePages
 * @param {string} categorySlug
 * @returns {import("#lib/types").EleventyCollectionItem[]}
 */
const guidesByCategory = (guidePages, categorySlug) =>
  guidePages.filter((page) => page.data["guide-category"] === categorySlug);

const configureGuides = (eleventyConfig) => {
  eleventyConfig.addFilter("guidesByCategory", guidesByCategory);
};

export { guidesByCategory, configureGuides };
