import { addDataFilter } from "#eleventy/add-data-filter.js";
import { createFieldIndexer } from "#utils/collection-utils.js";
import { normaliseSlug } from "#utils/slug-utils.js";

/** Index guides by category for O(1) lookups, cached per guides array */
const indexByGuideCategory = createFieldIndexer("guide-category");

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

/**
 * Guide categories or pages with no property of their own, i.e. the ones that
 * belong in a site-wide guide listing rather than a single property's guide.
 *
 * @param {import("#lib/types").EleventyCollectionItem[]} guides
 * @returns {import("#lib/types").EleventyCollectionItem[]}
 */
const generalGuides = (guides) =>
  guides.filter((guide) => !guide.data.property);

/**
 * Guide categories or pages to show within one property's guide: the ones
 * tagged with that property, plus the general ones that apply everywhere.
 * With no property slug (a category that isn't tied to a property) only the
 * general ones are left.
 *
 * @param {import("#lib/types").EleventyCollectionItem[]} guides
 * @param {string | undefined | null} propertySlug
 * @returns {import("#lib/types").EleventyCollectionItem[]}
 */
const guidesForProperty = (guides, propertySlug) => {
  if (!propertySlug) return generalGuides(guides);
  const slug = normaliseSlug(propertySlug);
  return guides.filter((guide) => {
    const { property } = guide.data;
    return !property || normaliseSlug(property) === slug;
  });
};

/** @param {*} eleventyConfig */
const configureGuides = (eleventyConfig) => {
  eleventyConfig.addFilter("guidesByCategory", guidesByCategory);
  addDataFilter(
    eleventyConfig,
    "guideCategoriesByProperty",
    guideCategoriesByProperty,
  );
  addDataFilter(eleventyConfig, "generalGuides", generalGuides);
  addDataFilter(eleventyConfig, "guidesForProperty", guidesForProperty);
};

export {
  configureGuides,
  generalGuides,
  guideCategoriesByProperty,
  guidesByCategory,
  guidesForProperty,
};
