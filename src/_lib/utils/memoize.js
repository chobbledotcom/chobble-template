/**
 * Memoization utilities for caching function results.
 *
 * Supports sync and async functions with configurable cache key functions.
 * Includes helpers for common cache key patterns:
 * - arraySlugKey: for (array, string) signatures, uses array.length + slug
 * - jsonKey: for object arguments, produces stable keys via sorted JSON stringify
 */
import { map, pipe } from "#utils/array-utils.js";
import { fromPairs } from "#utils/object-entries.js";

/**
 * @template {unknown[]} Args
 * @template R
 * @typedef {Object} MemoizeOptions
 * @property {(args: Args) => string | number} [cacheKey] - Custom cache key function
 */

/**
 * Memoize a function with optional custom cache key
 * @template {unknown[]} Args
 * @template R
 * @param {(...args: Args) => R} fn - Function to memoize
 * @param {MemoizeOptions<Args, R>} [options] - Memoization options
 * @returns {(...args: Args) => R} Memoized function
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

export { memoize, arraySlugKey, jsonKey };
