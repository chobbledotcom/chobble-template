/**
 * Categories collection and filters
 *
 * @module #collections/categories
 */

import { flatMap, pipe, reduce } from "#toolkit/fp/array.js";
import {
  getCategoriesFromApi,
  getProductsFromApi,
} from "#utils/collection-utils.js";

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
    categorySlug: slug,
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
 * Create the categories collection with inherited images from products.
 * NOTE: Mutates category.data directly because Eleventy template objects have
 * special getters/internal state that break with spread operators.
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
  return categories.map((category) => {
    category.data.header_image = images[category.fileSlug]?.[0];
    const thumb = thumbnails[category.fileSlug]?.[0];
    if (thumb) category.data.thumbnail = thumb;
    return category;
  });
};

/**
 * Configure categories collection and filters.
 * @param {import('11ty.ts').EleventyConfig} eleventyConfig
 */
const configureCategories = (eleventyConfig) => {
  eleventyConfig.addCollection("categories", createCategoriesCollection);
};

export { configureCategories, createCategoriesCollection };
