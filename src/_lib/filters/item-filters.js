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

/** Build enhanced filter pages from items and pre-computed combinations */
const buildFilterPages =
  (itemsKey, baseUrl) => (items, baseCombinations, filterData) => {
    const allCombinations = [
      ...expandWithSortVariants(baseCombinations),
      ...generateSortOnlyPages(items.length),
    ];
    const pages = allCombinations.map((combo) => ({
      ...buildFilterPageBase(combo, filterData.displayLookup),
      sortKey: combo.sortKey,
      [itemsKey]: filterWithSort(items, combo),
    }));
    return enhanceWithFilterUI(pages, filterData, baseUrl, baseCombinations);
  };

/**
 * Compute filter data and listing UI for a set of items.
 * Shared between createFilterConfig and createListingFilterUI.
 * @param {import("@11ty/eleventy").CollectionApi} collectionApi
 * @param {string} tag - Eleventy collection tag
 * @param {string} baseUrl - Base URL for filter links
 */
export const computeFilterBase = (collectionApi, tag, baseUrl) => {
  const items = collectionApi.getFilteredByTag(tag);
  const baseCombinations = generateFilterCombinations(items);
  const filterData = {
    attributes: getAllFilterAttributes(items),
    displayLookup: buildDisplayLookup(items),
  };
  const listingFilterUI = buildFilterUIData(
    filterData,
    {},
    baseCombinations,
    baseUrl,
    "default",
    items.length,
  );
  return { items, baseCombinations, filterData, listingFilterUI };
};

/** Compute all filter data for a tag in a single pass */
const computeFilterData = (tag, baseUrl, itemsKey, collectionApi) => {
  const { items, baseCombinations, filterData, listingFilterUI } =
    computeFilterBase(collectionApi, tag, baseUrl);
  const makePages = buildFilterPages(itemsKey, baseUrl);
  const pages =
    baseCombinations.length === 0
      ? []
      : makePages(items, baseCombinations, filterData);

  return {
    pages,
    redirects: generateFilterRedirects(items, `${baseUrl}/search`),
    filterData,
    listingFilterUI,
  };
};

/** Register filter collections and filters with Eleventy */
const registerFilterCollections = (
  eleventyConfig,
  collections,
  computeAllData,
  uiDataFilterName,
  baseUrl,
) => {
  eleventyConfig.addCollection(
    collections.pages,
    (c) => computeAllData(c).pages,
  );
  eleventyConfig.addCollection(
    collections.redirects,
    (c) => computeAllData(c).redirects,
  );
  if (collections.attributes) {
    eleventyConfig.addCollection(
      collections.attributes,
      (c) => computeAllData(c).filterData,
    );
  }
  eleventyConfig.addCollection(
    `${collections.pages}ListingFilterUI`,
    (c) => computeAllData(c).listingFilterUI,
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

/**
 * Create a filter system for a specific item type
 * @param {FilterConfigOptions} options - Configuration options
 * @returns {{ configure: (eleventyConfig: import("@11ty/eleventy").UserConfig) => void }} Filter configuration
 */
export const createFilterConfig = (options) => {
  const { tag, permalinkDir, itemsKey, collections, uiDataFilterName } =
    options;
  const baseUrl = `/${permalinkDir}`;

  const computeAllData = memoizeByRef((collectionApi) =>
    computeFilterData(tag, baseUrl, itemsKey, collectionApi),
  );

  const configure = (eleventyConfig) =>
    registerFilterCollections(
      eleventyConfig,
      collections,
      computeAllData,
      uiDataFilterName,
      baseUrl,
    );

  return { configure };
};
