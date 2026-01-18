/**
 * Memoization utilities for caching function results.
 *
 * Supports configurable cache key functions with helpers:
 * - arraySlugKey: for (array, string) signatures
 * - jsonKey: for objects via sorted JSON stringify
 */
import { map, pipe } from "#utils/array-utils.js";
import { buildReverseIndex } from "#utils/grouping.js";
import { fromPairs } from "#utils/object-entries.js";

/**
 * Memoize a function with optional custom cache key
 * @param {Function} fn - Function to memoize
 * @param {{ cacheKey?: (args: unknown[]) => string | number }} [options]
 * @returns {Function} Memoized function
 */
const memoize = (fn, options = {}) => {
  const cache = new Map();
  const keyFn = options.cacheKey || ((args) => args[0]);

  return (...args) => {
    const key = keyFn(args);
    if (cache.has(key)) return cache.get(key);
    const result = fn(...args);
    cache.set(key, result);
    return result;
  };
};

/**
 * Cache key generator for (array, string) signatures
 * Uses array.length + slug for efficient keying
 * @param {[unknown[] | null | undefined, string]} args - Arguments tuple
 * @returns {string} Cache key
 */
const arraySlugKey = (args) => {
  const arr = args[0];
  const slug = args[1];
  return `${arr?.length || 0}:${slug}`;
};

/**
 * Recursively sort object keys for stable JSON serialization
 * @param {unknown} obj - Object to sort
 * @returns {unknown} Object with sorted keys
 */
const sortKeys = (obj) => {
  if (obj === null || typeof obj !== "object") return obj;
  if (Array.isArray(obj)) return obj.map(sortKeys);
  return pipe(
    (o) => Object.keys(o).sort(),
    map((key) => [key, sortKeys(obj[key])]),
    fromPairs,
  )(obj);
};

/**
 * Cache key generator for object arguments via sorted JSON stringify
 * @param {[unknown]} args - Arguments tuple with object as first element
 * @returns {string} Cache key (JSON string)
 */
const jsonKey = (args) => JSON.stringify(sortKeys(args[0]));

/**
 * Create a cached function using WeakMap for object identity caching.
 * The result is cached per array reference, allowing garbage collection.
 * @template T, R
 * @param {(arr: T[]) => R} buildFn - Function that builds the result from an array
 * @returns {(arr: T[]) => R} Cached version of the build function
 */
const withWeakMapCache = (buildFn) => {
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
 * Perfect for Eleventy collections that are reused across many pages.
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
const indexBy = (getKey) =>
  withWeakMapCache((arr) =>
    Object.fromEntries(arr.map((item) => [getKey(item), item])),
  );

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
 * Perfect for "get items by category/tag" patterns in Eleventy.
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
  withWeakMapCache((arr) =>
    Object.fromEntries(buildReverseIndex(arr, getKeys)),
  );

export { memoize, arraySlugKey, jsonKey, indexBy, groupByWithCache };
