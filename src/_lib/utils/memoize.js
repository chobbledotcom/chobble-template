import { map, pipe } from "#utils/array-utils.js";
import { fromPairs } from "#utils/object-entries.js";

// Simple memoization function - supports sync and async functions
// Options:
//   cacheKey: (args) => string - custom cache key function
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

// Cache key for functions with (array, string) signature
// Uses array length as a sanity check combined with the slug
const arraySlugKey = (args) => {
  const arr = args[0];
  const slug = args[1];
  return `${arr?.length || 0}:${slug}`;
};

// Sort object keys recursively for stable JSON stringification
const sortKeys = (obj) => {
  if (obj === null || typeof obj !== "object") return obj;
  if (Array.isArray(obj)) return obj.map(sortKeys);
  return pipe(
    (o) => Object.keys(o).sort(),
    map((key) => [key, sortKeys(obj[key])]),
    fromPairs,
  )(obj);
};

// Cache key for functions that take a single object argument
// Produces stable keys regardless of property order
const jsonKey = (args) => JSON.stringify(sortKeys(args[0]));

export { memoize, arraySlugKey, jsonKey };
