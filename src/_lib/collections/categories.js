/**
 * Categories collection and filters
 *
 * @module #collections/categories
 */

import { createChildThumbnailResolver } from "#collections/thumbnail-resolvers.js";
import { flatMap, pipe, reduce } from "#toolkit/fp/array.js";
import { groupBy } from "#toolkit/fp/grouping.js";
import {
  createFieldIndexer,
  featuredCollection,
  getByParent,
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
 * Build initial mapping from categories to [value, order] tuples.
 * @param {CategoryCollectionItem[]} categories
 * @param {"header_image" | "thumbnail"} propertyName
 * @returns {CategoryPropertyMap}
 */
const buildInitialMapping = (categories, propertyName) =>
  Object.fromEntries(
    categories.map((c) => {
      const value = c.data[propertyName];
      return [
        c.fileSlug,
        [value, value != null ? Number.POSITIVE_INFINITY : -1],
      ];
    }),
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
    order: product.data.order,
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

const PLACEHOLDER_PREFIX = "images/placeholders/";
const isRealImage = (value) =>
  value != null && !value.startsWith(PLACEHOLDER_PREFIX);

/**
 * Build a map of category slugs to product thumbnail values only (no category
 * own values). Used as the final fallback in the thumbnail resolution chain.
 * @param {ProductCollectionItem[]} products
 * @returns {CategoryPropertyMap}
 */
const buildProductThumbnailMap = (products) =>
  pipe(
    flatMap(extractProductPropertyEntries("thumbnail")),
    reduce(mergeByHighestOrder, {}),
  )(products);

/**
 * Snapshot each category's own images before mutation.
 * @param {CategoryCollectionItem[]} categories
 * @returns {Record<string, {header_image?: string, thumbnail?: string}>}
 */
const snapshotOwnImages = (categories) =>
  Object.fromEntries(
    categories.map((c) => [
      c.fileSlug,
      { header_image: c.data.header_image, thumbnail: c.data.thumbnail },
    ]),
  );

/**
 * Create a recursive thumbnail resolver.
 * Top-level chain: header_image > thumbnail > subcategories > products.
 * Subcategory recursion only checks thumbnail (not header_image).
 * @param {Record<string, {header_image?: string, thumbnail?: string}>} ownImages
 * @param {CategoryPropertyMap} productThumbnails - Product-only thumbnail lookup
 * @param {Map<string, CategoryCollectionItem[]>} childrenByParent
 * @returns {(category: CategoryCollectionItem) => string | undefined}
 */
const createThumbnailResolver = (
  ownImages,
  productThumbnails,
  childrenByParent,
) => {
  const resolveChild = createChildThumbnailResolver({
    childrenByParent,
    getOwnThumbnail: (category) => {
      const own = ownImages[category.fileSlug];
      return isRealImage(own?.thumbnail) ? own.thumbnail : undefined;
    },
    getFallbackThumbnail: (category) => {
      const thumb = productThumbnails[category.fileSlug]?.[0];
      return isRealImage(thumb) ? thumb : undefined;
    },
  });

  return (category) => {
    const own = ownImages[category.fileSlug];
    return own?.header_image ?? resolveChild(category);
  };
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
  const productThumbnails = buildProductThumbnailMap(products);
  const childrenByParent = groupBy(categories, (c) =>
    normaliseSlug(c.data.parent),
  );
  const ownImages = snapshotOwnImages(categories);
  const resolveThumbnail = createThumbnailResolver(
    ownImages,
    productThumbnails,
    childrenByParent,
  );

  return categories.map((category) => {
    category.data.header_image = images[category.fileSlug]?.[0];
    const thumb = resolveThumbnail(category);
    if (thumb) category.data.thumbnail = thumb;
    return category;
  });
};

const indexByParent = createFieldIndexer("parent");

const getSubcategories = (categories, parentSlug) =>
  getByParent(indexByParent, categories, parentSlug);
const configureCategories = (eleventyConfig) => {
  eleventyConfig.addCollection("categories", createCategoriesCollection);
  eleventyConfig.addCollection(
    "featuredCategories",
    featuredCollection(createCategoriesCollection),
  );
  eleventyConfig.addFilter("getSubcategories", getSubcategories);
};

export { configureCategories, createCategoriesCollection, getSubcategories };
