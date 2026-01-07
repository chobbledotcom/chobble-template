// Load and process a module based on options
const loadModule = async (modulePath, options) => {
  const imported = await import(modulePath);

  if (options.transform) {
    return await options.transform(imported);
  }

  if (options.property) {
    return imported[options.property];
  }

  return imported;
};

/**
 * Lazy module loader utility
 *
 * Creates a lazy-loading getter function for heavy dependencies.
 * Modules are only imported when first accessed, not at startup.
 *
 * @param {string|null} modulePath - The module to import (e.g., "sass", "sharp"), or null when using init
 * @param {Object} options - Configuration options
 * @param {string} options.property - Optional property to extract from the imported module
 * @param {Function} options.transform - Optional function to transform the imported module
 * @param {Function} options.init - Optional initialization function (no module import)
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
// @ts-expect-error - Default empty object for lazy loading
const createLazyLoader = (modulePath, options = {}) => {
  let cached = null;

  return async () => {
    if (cached === null) {
      cached = options.init
        ? await options.init()
        : await loadModule(modulePath, options);
    }

    return cached;
  };
};

export { createLazyLoader };
