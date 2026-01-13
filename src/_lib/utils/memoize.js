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

const arraySlugKey = (args) => {
  const arr = args[0];
  const slug = args[1];
  return `${arr?.length || 0}:${slug}`;
};

const sortKeys = (obj) => {
  if (obj === null || typeof obj !== "object") return obj;
  if (Array.isArray(obj)) return obj.map(sortKeys);
  return pipe(
    (o) => Object.keys(o).sort(),
    map((key) => [key, sortKeys(obj[key])]),
    fromPairs,
  )(obj);
};

const jsonKey = (args) => JSON.stringify(sortKeys(args[0]));

export { memoize, arraySlugKey, jsonKey };
