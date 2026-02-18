/**
 * Generic filtering library for items with filter_attributes.
 *
 * Provides shared utilities for building filter UI data.
 * All filtering uses client-side hash navigation (e.g. /products#size/small).
 *
 * Key functions:
 * - computeFilterBase(): Computes filter data and listing UI for a collection
 * - generateFilterCombinations(): Pre-computes all valid filter combinations
 * - buildFilterUIData(): Generates data for filter UI templates
 */

export { generateFilterCombinations } from "#filters/filter-combinations.js";
export {
  buildDisplayLookup,
  getAllFilterAttributes,
  SORT_OPTIONS,
  toSortedPath,
} from "#filters/filter-core.js";
export {
  buildFilterUIData,
  buildPathLookup,
  buildUIWithLookup,
} from "#filters/filter-ui.js";

import { generateFilterCombinations } from "#filters/filter-combinations.js";
import {
  buildDisplayLookup,
  getAllFilterAttributes,
} from "#filters/filter-core.js";
import { buildFilterUIData } from "#filters/filter-ui.js";

/**
 * Compute filter data and listing UI for a set of items.
 * Used by createListingFilterUI for product listing pages.
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
