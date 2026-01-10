/**
 * @typedef {Object} LazyLoaderOptions
 * @property {string} [property] - Optional property to extract from the imported module
 * @property {Function} [transform] - Optional function to transform the imported module
 * @property {Function} [init] - Optional initialization function (no module import)
 */

/**
 * Lazy module loader utility
 *
 * Creates a lazy-loading getter function for heavy dependencies.
 * Modules are only imported when first accessed, not at startup.
 *
 * @param {string|null} modulePath - The module to import (e.g., "sass", "sharp"), or null when using init
 * @param {LazyLoaderOptions} [options] - Configuration options
 * @returns {Function} An async getter function that returns the lazily-loaded module
 *
 * @example
 * // Load entire module
 * const getSass = createLazyLoader("sass");
 *
 * @example
 * // Load with .default extraction
 * const getSharp = createLazyLoader("sharp", { property: "default" });
 *
 * @example
 * // Load specific property
 * const getPdfRenderer = createLazyLoader("json-to-pdf", { property: "renderPdfTemplate" });
 *
 * @example
 * // Custom transformation
 * const getDOM = createLazyLoader("happy-dom", {
 *   transform: (mod) => {
 *     const { Window } = mod;
 *     return class DOM {
 *       constructor(html) {
 *         this.window = new Window();
 *         if (html) this.window.document.write(html);
 *       }
 *     };
 *   }
 * });
 *
 * @example
 * // Lazy initialization without module import
 * const getSharedDocument = createLazyLoader(null, {
 *   init: async () => {
 *     const dom = await loadDOM("");
 *     return dom.window.document;
 *   }
 * });
 */
const createLazyLoader = (modulePath, options = {}) => {
  let cached = null;

  // Pre-determine how to extract the value from the imported module
  const extractValue = options.transform
    ? (imported) => options.transform(imported)
    : options.property
      ? (imported) => imported[options.property]
      : (imported) => imported;

  return async () => {
    if (cached !== null) return cached;
    cached = options.init
      ? await options.init()
      : await extractValue(await import(modulePath));
    return cached;
  };
};

export { createLazyLoader };
