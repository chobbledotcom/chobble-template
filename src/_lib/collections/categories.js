/**
 * Categories collection and filters
 *
 * @module #collections/categories
 */

import { flatMap, pipe, reduce } from "#toolkit/fp/array.js";
import { groupBy } from "#toolkit/fp/grouping.js";
import {
  createFieldIndexer,
  featuredCollection,
  getCategoriesFromApi,
  getProductsFromApi,
} from "#utils/collection-utils.js";
import { normaliseSlug } from "#utils/slug-utils.js";
import { findFirst, findFromChildren } from "#utils/thumbnail-finder.js";

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
 * Build initial mapping from categories to [value, order] tuples.
 * @param {CategoryCollectionItem[]} categories
 * @param {"header_image" | "thumbnail"} propertyName
 * @returns {CategoryPropertyMap}
 */
const buildInitialMapping = (categories, propertyName) =>
  Object.fromEntries(
    categories.map((c) => [c.fileSlug, [c.data[propertyName], -1]]),
  );

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
 * Extract property entries from a product for all its categories.
 * @param {"header_image" | "thumbnail"} propertyName
 * @returns {(product: ProductCollectionItem) => PropertyMapEntry[]}
 */
const extractProductPropertyEntries = (propertyName) => (product) => {
  const value = product.data[propertyName];
  if (!value) return [];
  return product.data.categories.map((slug) => ({
    categorySlug: normaliseSlug(slug),
    value,
    order: product.data.order ?? 0,
  }));
};

/**
 * Build a map of category slugs to property values, preferring highest order.
 * @param {CategoryCollectionItem[]} categories
 * @param {ProductCollectionItem[]} products
 * @param {"header_image" | "thumbnail"} propertyName
 * @returns {CategoryPropertyMap}
 */
const buildCategoryPropertyMap = (categories, products, propertyName) =>
  pipe(
    flatMap(extractProductPropertyEntries(propertyName)),
    reduce(mergeByHighestOrder, buildInitialMapping(categories, propertyName)),
  )(products);

/**
 * Create a recursive thumbnail resolver.
 * Checks: 1) direct products, 2) subcategories (recursively checking their products).
 * @param {CategoryPropertyMap} thumbnails - Thumbnail lookup by category slug
 * @param {Map<string, CategoryCollectionItem[]>} childrenByParent - Child categories by parent
 * @returns {(slug: string) => string | undefined}
 */
const createThumbnailResolver = (thumbnails, childrenByParent) => {
  const resolve = (slug) =>
    findFirst(
      () => thumbnails[slug]?.[0],
      () =>
        findFromChildren(childrenByParent.get(slug), (child) =>
          resolve(child.fileSlug),
        ),
    );
  return resolve;
};

/**
 * Create the categories collection with inherited images from products.
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
  const images = buildCategoryPropertyMap(categories, products, "header_image");
  const thumbnails = buildCategoryPropertyMap(
    categories,
    products,
    "thumbnail",
  );
  const childrenByParent = groupBy(categories, (c) =>
    normaliseSlug(c.data.parent),
  );
  const resolveThumbnail = createThumbnailResolver(
    thumbnails,
    childrenByParent,
  );

  return categories.map((category) => {
    category.data.header_image = images[category.fileSlug]?.[0];
    const thumb = resolveThumbnail(category.fileSlug);
    if (thumb) category.data.thumbnail = thumb;
    return category;
  });
};

const indexByParent = createFieldIndexer("parent");

const getSubcategories = (categories, parentSlug) =>
  indexByParent(categories)[parentSlug] ?? [];
const configureCategories = (eleventyConfig) => {
  eleventyConfig.addCollection("categories", createCategoriesCollection);
  eleventyConfig.addCollection(
    "featuredCategories",
    featuredCollection(createCategoriesCollection),
  );
  eleventyConfig.addFilter("getSubcategories", getSubcategories);
};

export { configureCategories, createCategoriesCollection, getSubcategories };
