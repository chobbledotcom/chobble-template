/**
 * Shared collection utilities for common patterns across collection types.
 *
 * DRY utilities extracted from repeated patterns in:
 * - categories.js, products.js, events.js, properties.js (getFeatured)
 * - products.js, properties.js, reviews.js, guides.js (indexBy factories)
 */

import { groupByWithCache } from "#toolkit/fp/memoize.js";
import { normaliseSlug } from "#utils/slug-utils.js";

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

/** Derive a "featured" collection from a base collection creator. */
export const featuredCollection = (createCollection) => (api) =>
  createCollection(api).filter((item) => item.data.featured);

/** @param {import("@11ty/eleventy").UserConfig} _eleventyConfig */
export const configureCollectionUtils = (_eleventyConfig) => {
  // Featured items are now pre-computed as collections (featuredCategories, etc.)
};

/**
 * Create an indexer that groups items by a scalar data field (one-to-many).
 * Like createArrayFieldIndexer but for fields holding a single value, not arrays.
 * Normalizes slug references so "events/foo.md", "events/foo", and "foo" all match.
 *
 * @param {string} field - The data field name (e.g., "parent", "parentLocation")
 * @returns {(items: any[]) => Record<string, any[]>} Memoized indexer function
 */
export const createFieldIndexer = (field) =>
  groupByWithCache((item) => {
    const key = normaliseSlug(item.data[field]);
    return key ? [key] : [];
  });

/**
 * Get children from a field indexer, returning empty array when missing.
 * @param {(items: any[]) => Record<string, any[]>} indexer
 * @param {any[]} items
 * @param {string} parentSlug
 * @returns {any[]}
 */
export const getByParent = (indexer, items, parentSlug) =>
  indexer(items)[parentSlug] ?? [];

/**
 * Create an indexer that groups items by a field that contains an array of slugs.
 * Returns a memoized function for O(1) lookups.
 * Normalizes slug references so "events/foo.md", "events/foo", and "foo" all match.
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
  groupByWithCache((item) => (item.data[field] ?? []).map(normaliseSlug));

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
