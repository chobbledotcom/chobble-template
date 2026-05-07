/**
 * Categories collection and filters
 *
 * @module #collections/categories
 */

import { createChildThumbnailResolver } from "#collections/thumbnail-resolvers.js";
import { flatMap, pipe, reduce } from "#toolkit/fp/array.js";
import { groupBy } from "#toolkit/fp/grouping.js";
import {
  createParentChildFilter,
  featuredCollection,
  getCategoriesFromApi,
  getProductsFromApi,
} from "#utils/collection-utils.js";
import { normaliseSlug } from "#utils/slug-utils.js";

/** @typedef {import("#lib/types").CategoryCollectionItem} CategoryCollectionItem */
/** @typedef {import("#lib/types").ProductCollectionItem} ProductCollectionItem */

/**
 * Entry for building category property map.
 * @typedef {{ categorySlug: string, value: string, order: number }} PropertyMapEntry
 */

/**
 * Map of category slug to [value, order] tuple.
 * @typedef {Record<string, [string | undefined, number]>} CategoryPropertyMap
 */

/**
 * Merge a property entry into mapping, preferring higher order values.
 * @param {CategoryPropertyMap} mapping
 * @param {PropertyMapEntry} entry
 * @returns {CategoryPropertyMap}
 */
const mergeByHighestOrder = (mapping, { categorySlug, value, order }) => {
  const entry = mapping[categorySlug];
  return !entry || entry[1] < order
    ? { ...mapping, [categorySlug]: [value, order] }
    : mapping;
};

/**
 * Extract thumbnail entries from a product for all its categories.
 * @param {ProductCollectionItem} product
 * @returns {PropertyMapEntry[]}
 */
const extractProductThumbnailEntries = (product) => {
  if (!product.data.thumbnail) return [];
  return product.data.categories.map((slug) => ({
    categorySlug: normaliseSlug(slug),
    value: product.data.thumbnail,
    order: product.data.order,
  }));
};

const PLACEHOLDER_PREFIX = "images/placeholders/";
const isRealImage = (value) =>
  value != null && !value.startsWith(PLACEHOLDER_PREFIX);

/**
 * Build a map of category slugs to product thumbnail values, preferring
 * highest order. Used as the final fallback in the thumbnail resolution
 * chain.
 * @param {ProductCollectionItem[]} products
 * @returns {CategoryPropertyMap}
 */
const buildProductThumbnailMap = (products) =>
  pipe(
    flatMap(extractProductThumbnailEntries),
    reduce(mergeByHighestOrder, {}),
  )(products);

/**
 * Snapshot each category's own thumbnail before mutation.
 * @param {CategoryCollectionItem[]} categories
 * @returns {Record<string, string | undefined>}
 */
const snapshotOwnThumbnails = (categories) =>
  Object.fromEntries(categories.map((c) => [c.fileSlug, c.data.thumbnail]));

/**
 * Create a recursive thumbnail resolver.
 * Chain: own thumbnail > subcategory thumbnail > product thumbnail.
 * @param {Record<string, string | undefined>} ownThumbnails
 * @param {CategoryPropertyMap} productThumbnails - Product-only thumbnail lookup
 * @param {Map<string, CategoryCollectionItem[]>} childrenByParent
 * @returns {(category: CategoryCollectionItem) => string | undefined}
 */
const createThumbnailResolver = (
  ownThumbnails,
  productThumbnails,
  childrenByParent,
) =>
  createChildThumbnailResolver({
    childrenByParent,
    getOwnThumbnail: (category) => {
      const own = ownThumbnails[category.fileSlug];
      return isRealImage(own) ? own : undefined;
    },
    getFallbackThumbnail: (category) => {
      const thumb = productThumbnails[category.fileSlug]?.[0];
      return isRealImage(thumb) ? thumb : undefined;
    },
  });

/**
 * Create the categories collection with inherited thumbnails from products.
 * For parent categories without thumbnails, inherit from child categories.
 * NOTE: Mutates category.data directly because Eleventy template objects
 * have special getters/internal state that break with spread operators.
 * @param {import("@11ty/eleventy").CollectionApi} collectionApi
 * @returns {CategoryCollectionItem[]}
 */
const createCategoriesCollection = (collectionApi) => {
  const categories = getCategoriesFromApi(collectionApi);
  if (categories.length === 0) return [];
  const products = getProductsFromApi(collectionApi);
  const productThumbnails = buildProductThumbnailMap(products);
  const childrenByParent = groupBy(categories, (c) =>
    c.data.parent ? normaliseSlug(c.data.parent) : null,
  );
  const ownThumbnails = snapshotOwnThumbnails(categories);
  const resolveThumbnail = createThumbnailResolver(
    ownThumbnails,
    productThumbnails,
    childrenByParent,
  );

  return categories.map((category) => {
    const thumb = resolveThumbnail(category);
    if (thumb) category.data.thumbnail = thumb;
    return category;
  });
};

const getSubcategories = createParentChildFilter("parent");

const configureCategories = (eleventyConfig) => {
  eleventyConfig.addCollection("categories", createCategoriesCollection);
  eleventyConfig.addCollection(
    "featuredCategories",
    featuredCollection(createCategoriesCollection),
  );
  eleventyConfig.addFilter("getSubcategories", getSubcategories);
};

export { configureCategories, createCategoriesCollection, getSubcategories };
