import { registerFilters } from "#eleventy/register.js";
import {
  createFieldIndexer,
  createTagCollection,
} from "#utils/collection-utils.js";
import { normaliseSlug } from "#utils/slug-utils.js";

/** Index guides by category for O(1) lookups, cached per guides array */
const indexByGuideCategory = createFieldIndexer("guide-category");

/**
 * @param {import("#lib/types").EleventyCollectionItem[]} guidePages
 * @param {string} categorySlug
 * @returns {import("#lib/types").EleventyCollectionItem[]}
 */
const guidesByCategory = (guidePages, categorySlug) =>
  indexByGuideCategory(guidePages)[categorySlug] ?? [];

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

/**
 * The guide collections are registered by the library rather than only by
 * the demo content directory tags, so a child site can delete
 * `src/guide-pages` and `src/guide-categories` without unregistering the
 * collections that shared block templates reference. Both handlers keep the
 * plain tag-collection behavior: every tagged item, in build order.
 *
 * @type {(api: import("#lib/types").EleventyCollectionApi) => import("#lib/types").EleventyCollectionItem[]}
 */
const createGuidePagesCollection = createTagCollection("guide-pages");
const createGuideCategoriesCollection = createTagCollection("guide-categories");

/** @param {*} eleventyConfig */
const configureGuides = (eleventyConfig) => {
  /* jscpd:ignore-start -- declaration data: registered filter map */
  registerFilters(eleventyConfig)({
    guidesByCategory,
    generalGuides,
    guidesForProperty,
  });
  /* jscpd:ignore-end */
  eleventyConfig.addCollection("guide-pages", createGuidePagesCollection);
  eleventyConfig.addCollection(
    "guide-categories",
    createGuideCategoriesCollection,
  );
};

export {
  configureGuides,
  createGuideCategoriesCollection,
  createGuidePagesCollection,
  generalGuides,
  guidesByCategory,
  guidesForProperty,
};
