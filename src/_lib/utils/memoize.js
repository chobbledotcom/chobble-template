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

export { memoize, arraySlugKey };
