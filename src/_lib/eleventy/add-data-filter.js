/**
 * Typed wrapper for registering non-string Eleventy filters.
 *
 * Eleventy filters can return any type at runtime, but the 11ty.ts
 * type definitions restrict the return type to `string`. This wrapper
 * accepts any return type so individual call sites stay clean.
 *
 * @module #eleventy/add-data-filter
 */

/**
 * Register a data-transformation filter with Eleventy.
 *
 * Use this instead of `eleventyConfig.addFilter` when the filter returns
 * a non-string value (array, number, object, etc.).
 *
 * @param {*} eleventyConfig - Eleventy configuration object
 * @param {string} name - Filter name
 * @param {Function} fn - Filter function
 */
const addDataFilter = (eleventyConfig, name, fn) => {
  eleventyConfig.addFilter(name, fn);
};

export { addDataFilter };
