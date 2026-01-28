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

  /** @param {import("@11ty/eleventy").CollectionApi} collectionApi */
  const pagesCollection = (collectionApi) => {
    const items = collectionApi.getFilteredByTag(tag);
    const baseCombinations = generateFilterCombinations(items);
    if (baseCombinations.length === 0) return [];

    const displayLookup = buildDisplayLookup(items);
    const filterData = {
      attributes: getAllFilterAttributes(items),
      displayLookup,
    };
    const allCombinations = [
      ...expandWithSortVariants(baseCombinations),
      ...generateSortOnlyPages(items.length),
    ];
    const pages = allCombinations.map((combo) => {
      const matchedItems = filterWithSort(items, combo.filters, combo.sortKey);
      return {
        ...buildFilterPageBase(combo, displayLookup),
        sortKey: combo.sortKey,
        [itemsKey]: matchedItems,
      };
    });
    return enhanceWithFilterUI(pages, filterData, baseUrl, baseCombinations);
  };

  /**
   * @param {import("@11ty/eleventy").CollectionApi} collectionApi
   */
  const redirectsCollection = (collectionApi) => {
    const items = collectionApi.getFilteredByTag(tag);
    return generateFilterRedirects(items, `${baseUrl}/search`);
  };

  /**
   * @param {import("@11ty/eleventy").CollectionApi} collectionApi
   */
  const attributesCollection = (collectionApi) => {
    const items = collectionApi.getFilteredByTag(tag);
    return {
      attributes: getAllFilterAttributes(items),
      displayLookup: buildDisplayLookup(items),
    };
  };

  /**
   * Build filterUI for listing page (no active filters, default sort)
   * @param {import("@11ty/eleventy").CollectionApi} collectionApi
   */
  const listingFilterUICollection = (collectionApi) => {
    const items = collectionApi.getFilteredByTag(tag);
    const filterData = {
      attributes: getAllFilterAttributes(items),
      displayLookup: buildDisplayLookup(items),
    };
    const baseCombinations = generateFilterCombinations(items);
    return buildFilterUIData(
      filterData,
      {},
      baseCombinations,
      baseUrl,
      "default",
      items.length,
    );
  };

  const configure = (eleventyConfig) => {
    eleventyConfig.addCollection(collections.pages, pagesCollection);
    eleventyConfig.addCollection(collections.redirects, redirectsCollection);
    eleventyConfig.addCollection(collections.attributes, attributesCollection);
    eleventyConfig.addCollection(
      `${collections.pages}ListingFilterUI`,
      listingFilterUICollection,
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
