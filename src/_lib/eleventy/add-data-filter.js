/**
 * Typed wrapper for registering non-string Eleventy filters.
 *
 * Eleventy filters can return any type at runtime, but the 11ty.ts
 * type definitions restrict the return type to `string`. This wrapper
 * centralises the type assertion so individual call sites stay clean.
 *
 * @module #eleventy/add-data-filter
 */

/**
 * Register a data-transformation filter with Eleventy.
 *
 * Use this instead of `eleventyConfig.addFilter` when the filter returns
 * a non-string value (array, number, object, etc.).
 *
 * @param {import('11ty.ts').EleventyConfig} eleventyConfig
 * @param {string} name - Filter name
 * @param {(...args: any[]) => any} fn - Filter function
 */
const addDataFilter = (eleventyConfig, name, fn) => {
  const config =
    /** @type {{ addFilter: (name: string, fn: Function) => void }} */ (
      eleventyConfig
    );
  config.addFilter(name, fn);
};

export { addDataFilter };
