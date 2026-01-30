/**
 * Generic filtering library for items with filter_attributes.
 *
 * Used by both products and properties to provide URL-based filtering.
 *
 * This is the main entry point that re-exports from focused modules:
 * - filter-core.js: Parsing, normalization, lookup building, sorting
 * - filter-ui.js: UI data structure building
 * - filter-combinations.js: Combination generation and redirects
 *
 * Key functions:
 * - createFilterConfig(): Factory that creates Eleventy collections/filters
 * - generateFilterCombinations(): Pre-computes all valid filter combinations
 * - getItemsByFilters(): Returns items matching filter criteria
 * - buildFilterUIData(): Generates data for filter UI templates
 *
 * URL format: /products/search/size/small/color/red/ (keys sorted alphabetically)
 * Sort suffix: /products/search/size/small/price-asc/ (sort option at end)
 */

// Re-export combination generation
export {
  expandWithSortVariants,
  generateFilterCombinations,
  generateFilterRedirects,
  generateSortOnlyPages,
} from "#filters/filter-combinations.js";
// Re-export core utilities
export {
  buildDisplayLookup,
  buildItemLookup,
  filterWithSort,
  getAllFilterAttributes,
  getSortComparator,
  matchWithSort,
  SORT_OPTIONS,
  toSortedPath,
} from "#filters/filter-core.js";
// Re-export UI building functions
export {
  buildFilterPageBase,
  buildFilterUIData,
  buildPathLookup,
  buildUIWithLookup,
} from "#filters/filter-ui.js";

import {
  expandWithSortVariants,
  generateFilterCombinations,
  generateFilterRedirects,
  generateSortOnlyPages,
} from "#filters/filter-combinations.js";
// Internal imports for createFilterConfig
import {
  buildDisplayLookup,
  filterWithSort,
  getAllFilterAttributes,
} from "#filters/filter-core.js";
import {
  buildFilterPageBase,
  buildFilterUIData,
  enhanceWithFilterUI,
} from "#filters/filter-ui.js";
import { memoizeByRef } from "#toolkit/fp/memoize.js";

/** @typedef {import("#lib/types").FilterConfigOptions} FilterConfigOptions */

/**
 * Create a filter system for a specific item type
 * @param {FilterConfigOptions} options - Configuration options
 * @returns {{ configure: (eleventyConfig: import("@11ty/eleventy").UserConfig) => void }} Filter configuration
 */
export const createFilterConfig = (options) => {
  const { tag, permalinkDir, itemsKey, collections, uiDataFilterName } =
    options;
  const baseUrl = `/${permalinkDir}`;

  /** Build all filter pages from pre-computed combinations */
  const buildPages = (items, baseCombinations, filterData) => {
    const { displayLookup } = filterData;
    const allCombinations = [
      ...expandWithSortVariants(baseCombinations),
      ...generateSortOnlyPages(items.length),
    ];
    const pages = allCombinations.map((combo) => ({
      ...buildFilterPageBase(combo, displayLookup),
      sortKey: combo.sortKey,
      [itemsKey]: filterWithSort(items, combo.filters, combo.sortKey),
    }));
    return enhanceWithFilterUI(pages, filterData, baseUrl, baseCombinations);
  };

  /**
   * Compute all filter data in a single pass, cached by collectionApi reference.
   * All 4 collection functions pull from this shared cache, avoiding redundant
   * getFilteredByTag calls and repeated computation of combinations/attributes.
   */
  const computeAllData = memoizeByRef(
    /** @param {import("@11ty/eleventy").CollectionApi} collectionApi */
    (collectionApi) => {
      const items = collectionApi.getFilteredByTag(tag);
      const baseCombinations = generateFilterCombinations(items);
      const displayLookup = buildDisplayLookup(items);
      const filterData = {
        attributes: getAllFilterAttributes(items),
        displayLookup,
      };

      return {
        pages:
          baseCombinations.length === 0
            ? []
            : buildPages(items, baseCombinations, filterData),
        redirects: generateFilterRedirects(items, `${baseUrl}/search`),
        filterData,
        listingFilterUI: buildFilterUIData(
          filterData,
          {},
          baseCombinations,
          baseUrl,
          "default",
          items.length,
        ),
      };
    },
  );

  const configure = (eleventyConfig) => {
    eleventyConfig.addCollection(
      collections.pages,
      (collectionApi) => computeAllData(collectionApi).pages,
    );
    eleventyConfig.addCollection(
      collections.redirects,
      (collectionApi) => computeAllData(collectionApi).redirects,
    );
    if (collections.attributes) {
      eleventyConfig.addCollection(
        collections.attributes,
        (collectionApi) => computeAllData(collectionApi).filterData,
      );
    }
    eleventyConfig.addCollection(
      `${collections.pages}ListingFilterUI`,
      (collectionApi) => computeAllData(collectionApi).listingFilterUI,
    );
    eleventyConfig.addFilter(
      uiDataFilterName,
      (filterData, filters, pages, sortKey = "default", count = 2) =>
        buildFilterUIData(
          filterData,
          filters ?? {},
          pages,
          baseUrl,
          sortKey,
          count,
        ),
    );
  };

  return { configure };
};
