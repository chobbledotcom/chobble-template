import { addDataFilter } from "#eleventy/add-data-filter.js";
import { createFieldIndexer, createIndexer } from "#utils/collection-utils.js";
import { normaliseSlug } from "#utils/slug-utils.js";

/** Index guides by category for O(1) lookups, cached per guides array */
const indexByGuideCategory = createIndexer((page) => {
  const category = normaliseSlug(page.data["guide-category"]);
  return category ? [category] : [];
});

/** Index guide categories by property for O(1) lookups */
const indexByProperty = createFieldIndexer("property");

/**
 * @param {import("#lib/types").EleventyCollectionItem[]} guidePages
 * @param {string} categorySlug
 * @returns {import("#lib/types").EleventyCollectionItem[]}
 */
const guidesByCategory = (guidePages, categorySlug) =>
  indexByGuideCategory(guidePages)[categorySlug] ?? [];

/**
 * @param {import("#lib/types").EleventyCollectionItem[]} guideCategories
 * @param {string} propertySlug
 * @returns {import("#lib/types").EleventyCollectionItem[]}
 */
const guideCategoriesByProperty = (guideCategories, propertySlug) =>
  indexByProperty(guideCategories)[propertySlug] ?? [];

/** @param {*} eleventyConfig */
const configureGuides = (eleventyConfig) => {
  eleventyConfig.addFilter("guidesByCategory", guidesByCategory);
  addDataFilter(
    eleventyConfig,
    "guideCategoriesByProperty",
    guideCategoriesByProperty,
  );
};

export { guidesByCategory, guideCategoriesByProperty, configureGuides };
