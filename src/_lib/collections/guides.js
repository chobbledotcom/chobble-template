import { groupByWithCache } from "#utils/memoize.js";

/** Index guides by category for O(1) lookups, cached per guides array */
const indexByGuideCategory = groupByWithCache((page) => {
  const category = page.data["guide-category"];
  return category ? [category] : [];
});

/**
 * @param {import("#lib/types").EleventyCollectionItem[]} guidePages
 * @param {string} categorySlug
 * @returns {import("#lib/types").EleventyCollectionItem[]}
 */
const guidesByCategory = (guidePages, categorySlug) =>
  indexByGuideCategory(guidePages)[categorySlug] ?? [];

const configureGuides = (eleventyConfig) => {
  eleventyConfig.addFilter("guidesByCategory", guidesByCategory);
};

export { guidesByCategory, configureGuides };
