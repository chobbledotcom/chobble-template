/**
 * Memoization utilities for caching function results.
 *
 * For collection lookups, prefer indexBy or groupByWithCache which use WeakMap
 * caching for automatic garbage collection.
 */
import { buildReverseIndex } from "./grouping.js";

const DEFAULT_MAX_CACHE_SIZE = 2000;
/** @param {unknown[]} args @returns {string | number} */
const DEFAULT_KEY_FN = (args) => /** @type {string | number} */ (args[0]);

/**
 * Memoize a function with optional custom cache key.
 *
 * IMPORTANT: This uses a Map that grows indefinitely during a build.
 * For caching by array/object reference (e.g., collection lookups),
 * use memoizeByRef instead - it uses WeakMap for automatic cleanup.
 *
 * @param {Function} fn - Function to memoize
 * @param {{ cacheKey?: (args: unknown[]) => string | number, maxCacheSize?: number }} [options]
 * @returns {Function} Memoized function
 */
const memoize = (fn, options = {}) => {
  const cache = new Map();
  const keyFn = options.cacheKey || DEFAULT_KEY_FN;
  const maxSize = options.maxCacheSize ?? DEFAULT_MAX_CACHE_SIZE;

  /** @param {unknown[]} args */
  return (...args) => {
    const key = keyFn(args);
    if (cache.has(key)) return cache.get(key);

    if (cache.size >= maxSize) {
      throw new Error(
        `Memoize cache exceeded ${maxSize} entries. This likely indicates a memory leak - ` +
          "the function is being called with too many unique arguments. " +
          "Consider using memoizeByRef for collection-based caching, or increase maxCacheSize if this is intentional.",
      );
    }

    const result = fn(...args);
    cache.set(key, result);
    return result;
  };
};

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

const indexBy =
  /** @param {(item: *) => string} getKey */
  (getKey) => cachedEntries((arr) => arr.map((item) => [getKey(item), item]));

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

/**
 * Generate a cache key from function arguments by JSON stringifying them.
 * Useful for memoizing functions that take object arguments.
 * @param {unknown[]} args - Function arguments
 * @returns {string} JSON string key
 */
const jsonKey = (args) => JSON.stringify(args[0]);

/**
 * Deduplicate concurrent async calls by key.
 *
 * Only one operation runs per key at a time; concurrent calls wait for the
 * same Promise. Unlike memoize, the Promise is removed once it settles,
 * preventing memory leaks.
 *
 * @template {any[]} A
 * @template T
 * @param {(...args: A) => Promise<T>} fn - Async function to deduplicate
 * @param {{ cacheKey?: (args: A) => string | number }} [options]
 * @returns {(...args: A) => Promise<T>} Deduplicated async function
 *
 * @example
 * const fetchUser = dedupeAsync(async (id) => api.getUser(id));
 * // Concurrent calls for same id share one request
 * const [user1, user2] = await Promise.all([fetchUser(1), fetchUser(1)]);
 */
const dedupeAsync = (fn, { cacheKey = DEFAULT_KEY_FN } = {}) => {
  const pending = new Map();
  return (...args) =>
    pending.get(cacheKey(args)) ??
    pending
      .set(
        cacheKey(args),
        fn(...args).finally(() => pending.delete(cacheKey(args))),
      )
      .get(cacheKey(args));
};

export {
  memoize,
  indexBy,
  groupByWithCache,
  memoizeByRef,
  jsonKey,
  dedupeAsync,
};
