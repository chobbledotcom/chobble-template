/**
 * Shared collection utilities for common patterns across collection types.
 *
 * DRY utilities extracted from repeated patterns in:
 * - categories.js, products.js, events.js, properties.js (getFeatured)
 * - products.js, properties.js, reviews.js, guides.js (indexBy factories)
 */

import { groupByWithCache } from "#toolkit/fp/memoize.js";

/** @typedef {import("#lib/types").EleventyCollectionItem} EleventyCollectionItem */
/** @typedef {import("#lib/types").ProductCollectionItem} ProductCollectionItem */
/** @typedef {import("#lib/types").CategoryCollectionItem} CategoryCollectionItem */

/**
 * Get products from collection API (typed wrapper).
 * @param {import("@11ty/eleventy").CollectionApi} collectionApi
 * @returns {ProductCollectionItem[]}
 */
export const getProductsFromApi = (collectionApi) =>
  collectionApi.getFilteredByTag("products");

/**
 * Get categories from collection API (typed wrapper).
 * @param {import("@11ty/eleventy").CollectionApi} collectionApi
 * @returns {CategoryCollectionItem[]}
 */
export const getCategoriesFromApi = (collectionApi) =>
  collectionApi.getFilteredByTag("categories");

/**
 * Get events from collection API (typed wrapper).
 * @param {import("@11ty/eleventy").CollectionApi} collectionApi
 * @returns {import("#lib/types").EventCollectionItem[]}
 */
export const getEventsFromApi = (collectionApi) =>
  collectionApi.getFilteredByTag("events");

/**
 * Get locations from collection API (typed wrapper).
 * @param {import("@11ty/eleventy").CollectionApi} collectionApi
 * @returns {import("#lib/types").LocationCollectionItem[]}
 */
export const getLocationsFromApi = (collectionApi) =>
  collectionApi.getFilteredByTag("locations");

/**
 * Get featured items from a collection.
 * Works with any collection where items have data.featured property.
 *
 * @param {EleventyCollectionItem[]} items - Collection items
 * @returns {EleventyCollectionItem[]} Filtered array of featured items
 *
 * @example
 * const featured = getFeatured(collections.products);
 */
export const getFeatured = (items) =>
  items.filter((item) => item.data.featured);

/**
 * Configure shared collection utilities as Eleventy filters.
 * @param {import("@11ty/eleventy").UserConfig} eleventyConfig
 */
export const configureCollectionUtils = (eleventyConfig) => {
  eleventyConfig.addFilter("getFeatured", getFeatured);
};

/**
 * Create an indexer that groups items by a field that contains an array of slugs.
 * Returns a memoized function for O(1) lookups.
 *
 * @param {string} field - The data field name containing array of slugs (e.g., "categories", "events")
 * @returns {(items: any[]) => Record<string, any[]>} Memoized indexer function
 *
 * @example
 * const indexByCategory = createArrayFieldIndexer("categories");
 * const productsByCategory = indexByCategory(products);
 * const widgetProducts = productsByCategory["widgets"] ?? [];
 */
export const createArrayFieldIndexer = (field) =>
  groupByWithCache((item) => item.data[field] ?? []);

/**
 * Create an indexer with a custom key extractor function.
 * Use this when the indexing logic is more complex than simple field access.
 *
 * @param {(item: any) => string[]} keyExtractor - Function that returns array of keys for an item
 * @returns {(items: any[]) => Record<string, any[]>} Memoized indexer function
 *
 * @example
 * const indexByGuideCategory = createIndexer((page) => {
 *   const category = page.data["guide-category"];
 *   return category ? [category] : [];
 * });
 */
export const createIndexer = (keyExtractor) => groupByWithCache(keyExtractor);
