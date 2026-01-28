/**
 * Memoization utilities for caching function results.
 *
 * Supports configurable cache key functions with helpers:
 * - jsonKey: for objects via JSON stringify
 *
 * For collection lookups, prefer indexBy or groupByWithCache which use WeakMap
 * caching for automatic garbage collection.
 */
import { buildReverseIndex } from "./grouping.js";

/**
 * Memoize a function with optional custom cache key.
 * The returned function has a `.clear()` method to reset the cache.
 * @param {Function} fn - Function to memoize
 * @param {{ cacheKey?: (args: unknown[]) => string | number }} [options]
 * @returns {Function & { clear: () => void }} Memoized function with clear method
 */
const memoize = (fn, options = {}) => {
  const cache = new Map();
  const keyFn = options.cacheKey || ((args) => args[0]);

  const memoized = (...args) => {
    const key = keyFn(args);
    if (cache.has(key)) return cache.get(key);
    const result = fn(...args);
    cache.set(key, result);
    return result;
  };

  memoized.clear = () => cache.clear();

  return memoized;
};

/**
 * Cache key generator for object arguments via JSON stringify
 * @param {[unknown]} args - Arguments tuple with object as first element
 * @returns {string} Cache key (JSON string)
 */
const jsonKey = (args) => JSON.stringify(args[0]);

/**
 * Create a cached function using WeakMap for object identity caching.
 * The result is cached per array reference, allowing garbage collection.
 * @template T, R
 * @param {(arr: T[]) => R} buildFn - Function that builds the result from an array
 * @returns {(arr: T[]) => R} Cached version of the build function
 */
const memoizeByRef = (buildFn) => {
  const cache = new WeakMap();
  return (arr) => {
    const cached = cache.get(arr);
    if (cached) return cached;
    const result = buildFn(arr);
    cache.set(arr, result);
    return result;
  };
};

/**
 * Create an indexer that builds and caches a lookup object for arrays.
 *
 * Returns a curried function: first call specifies the key extractor,
 * second call takes an array and returns a cached lookup object.
 *
 * The lookup object is cached per array reference using WeakMap, so:
 * - Same array returns the same cached object (O(1) lookup)
 * - Different arrays each get their own object
 * - Arrays can be garbage collected (no memory leaks)
 *
 * Perfect for collections that are reused across many operations.
 *
 * @template T
 * @param {(item: T) => string} getKey - Key extraction function (must return string)
 * @returns {(arr: T[]) => Record<string, T>} Indexer function that caches per array
 *
 * @example
 * // Create a slug indexer at module level
 * const indexBySlug = indexBy(item => item.fileSlug);
 *
 * // Use to get O(1) lookups from collections
 * const productMap = indexBySlug(collections.products);
 * const product = productMap["widget-a"];
 *
 * // Subsequent calls with same array return cached object
 * indexBySlug(collections.products)["widget-b"]; // Uses cached object
 *
 * @example
 * // Create different indexers for different keys
 * const indexBySlug = indexBy(item => item.fileSlug);
 * const indexByUrl = indexBy(item => item.url);
 *
 * // Each indexer maintains its own cache
 * const slugMap = indexBySlug(items);  // Cached per indexBySlug
 * const urlMap = indexByUrl(items);    // Cached per indexByUrl
 */
/**
 * Create a cached function that transforms array to object via entries
 * @template T
 * @template V
 * @param {(arr: T[]) => Iterable<[string, V]>} toEntries - Function that converts array to entries
 * @returns {(arr: T[]) => Record<string, V>} Cached transformer
 */
const cachedEntries = (toEntries) =>
  memoizeByRef((arr) => Object.fromEntries(toEntries(arr)));

const indexBy = (getKey) =>
  cachedEntries((arr) => arr.map((item) => [getKey(item), item]));

/**
 * Create a grouper that builds and caches a reverse index for arrays.
 *
 * For items that belong to multiple groups (e.g., products in categories),
 * builds a map from group key to array of items in that group.
 *
 * The index is cached per array reference using WeakMap, so:
 * - Same array returns the same cached index (O(1) lookup)
 * - Different arrays each get their own index
 * - Arrays can be garbage collected (no memory leaks)
 *
 * Perfect for "get items by category/tag" patterns.
 *
 * @template T
 * @param {(item: T) => string[]} getKeys - Function that extracts group keys from each item
 * @returns {(arr: T[]) => Record<string, T[]>} Grouper function that caches per array
 *
 * @example
 * // Create a category grouper at module level
 * const groupByCategories = groupByWithCache(item => item.data.categories ?? []);
 *
 * // Use to get O(1) lookups from collections
 * const productsByCategory = groupByCategories(collections.products);
 * const widgetProducts = productsByCategory["widgets"] ?? [];
 *
 * // Subsequent calls with same array return cached index
 * groupByCategories(collections.products)["gadgets"]; // Uses cached index
 */
const groupByWithCache = (getKeys) =>
  cachedEntries((arr) => buildReverseIndex(arr, getKeys));

export { memoize, jsonKey, indexBy, groupByWithCache, memoizeByRef };
