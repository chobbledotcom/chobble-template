/**
 * Register a filter-name → implementation map on an Eleventy config.
 *
 * Curried so a configure* module binds its config (and registration method)
 * once and passes the map that differs per subsystem. Filters that belong to
 * a subsystem are declared as maps instead of one addFilter call per line;
 * the unused-filters gate runs every configure* module against a mock config
 * and reads the registered names back, so nothing is skipped by the helper.
 *
 * @param {*} eleventyConfig
 * @param {"addFilter" | "addAsyncFilter"} [method] - Defaults to addFilter
 * @returns {(filters: Record<string, unknown>) => void}
 */
export const registerFilters =
  (eleventyConfig, method = "addFilter") =>
  (filters) => {
    for (const [name, fn] of Object.entries(filters)) {
      eleventyConfig[method](name, fn);
    }
  };
