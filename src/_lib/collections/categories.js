/**
 * Categories collection and filters
 *
 * @module #collections/categories
 */

import { flatMap, pipe, reduce } from "#toolkit/fp/array.js";

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
 * Build a map of category slugs to property values, preferring highest order.
 * @param {CategoryCollectionItem[]} categories
 * @param {ProductCollectionItem[]} products
 * @param {"header_image" | "thumbnail"} propertyName
 * @returns {CategoryPropertyMap}
 */
const buildCategoryPropertyMap = (categories, products, propertyName) => {
  /** @type {CategoryPropertyMap} */
  const initialMapping = Object.fromEntries(
    categories.map((c) => [c.fileSlug, [c.data[propertyName], -1]]),
  );

  /** @type {(m: CategoryPropertyMap, e: PropertyMapEntry) => CategoryPropertyMap} */
  const mergeByHighestOrder = (mapping, { categorySlug, value, order }) => {
    const entry = mapping[categorySlug];
    return !entry || entry[1] < order
      ? { ...mapping, [categorySlug]: [value, order] }
      : mapping;
  };

  return pipe(
    flatMap((/** @type {ProductCollectionItem} */ product) => {
      const value = product.data[propertyName];
      if (!value) return [];
      return product.data.categories.map((slug) => ({
        categorySlug: slug,
        value,
        order: product.data.order ?? 0,
      }));
    }),
    reduce(mergeByHighestOrder, initialMapping),
  )(products);
};

/**
 * Get featured categories from a categories collection.
 * @param {CategoryCollectionItem[]} categories - Categories array from Eleventy collection
 * @returns {CategoryCollectionItem[]} Filtered array of featured categories
 */
const getFeaturedCategories = (categories) =>
  categories.filter((c) => c.data.featured);

/**
 * Create the categories collection with inherited images from products.
 * NOTE: Mutates category.data directly because Eleventy template objects have
 * special getters/internal state that break with spread operators.
 * @param {import("@11ty/eleventy").CollectionApi} collectionApi
 * @returns {CategoryCollectionItem[]}
 */
const createCategoriesCollection = (collectionApi) => {
  const categories =
    /** @type {CategoryCollectionItem[]} */
    (/** @type {unknown} */ (collectionApi.getFilteredByTag("categories")));
  if (categories.length === 0) return [];
  const products =
    /** @type {ProductCollectionItem[]} */
    (/** @type {unknown} */ (collectionApi.getFilteredByTag("products")));
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
  // @ts-expect-error - Filter returns array for data transformation, not string
  eleventyConfig.addFilter("getFeaturedCategories", getFeaturedCategories);
};

export { configureCategories, createCategoriesCollection };
