/**
 * Categories collection and filters
 *
 * @module #collections/categories
 */

import { flatMap, pipe, reduce } from "#toolkit/fp/array.js";
import { groupBy } from "#toolkit/fp/grouping.js";
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
 * Build a map of category slugs to property values, preferring highest order.
 * @param {CategoryCollectionItem[]} categories
 * @param {ProductCollectionItem[]} products
 * @param {"header_image" | "thumbnail"} propertyName
 * @returns {CategoryPropertyMap}
 */
const buildCategoryPropertyMap = (categories, products, propertyName) => {
  const initialMapping = Object.fromEntries(
    categories.map((c) => [c.fileSlug, [c.data[propertyName], -1]]),
  );

  const mergeByHighestOrder = (mapping, { categorySlug, value, order }) => {
    const entry = mapping[categorySlug];
    return !entry || entry[1] < order
      ? { ...mapping, [categorySlug]: [value, order] }
      : mapping;
  };

  return pipe(
    flatMap((product) => {
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
 * Create a thumbnail resolver that checks lookup first, then child categories.
 * @param {CategoryPropertyMap} thumbnails - Thumbnail lookup by category slug
 * @param {Map<string, CategoryCollectionItem[]>} childrenByParent - Child categories by parent
 * @returns {(slug: string) => string | undefined}
 */
const createThumbnailResolver = (thumbnails, childrenByParent) => (slug) =>
  findFirst(
    () => thumbnails[slug]?.[0],
    () =>
      findFromChildren(
        childrenByParent.get(slug),
        (child) => thumbnails[child.fileSlug]?.[0],
      ),
  );

/**
 * Create the categories collection with inherited images from products.
 * For parent categories without thumbnails, inherit from child categories.
 * NOTE: Mutates category.data directly because Eleventy template objects
 * have special getters/internal state that break with spread operators.
 * @param {import("@11ty/eleventy").CollectionApi} collectionApi
 * @returns {CategoryCollectionItem[]}
 */
const createCategoriesCollection = (collectionApi) => {
  const categories = collectionApi.getFilteredByTag("categories");
  if (categories.length === 0) return [];

  const products = collectionApi.getFilteredByTag("products");
  const images = buildCategoryPropertyMap(categories, products, "header_image");
  const thumbnails = buildCategoryPropertyMap(
    categories,
    products,
    "thumbnail",
  );
  const childrenByParent = groupBy(categories, (c) => c.data.parent);
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

/**
 * Configure categories collection and filters.
 * @param {import('11ty.ts').EleventyConfig} eleventyConfig
 */
const configureCategories = (eleventyConfig) => {
  eleventyConfig.addCollection("categories", createCategoriesCollection);
};

export { configureCategories, createCategoriesCollection };
