/**
 * Product listing filter UI for client-side filtering.
 *
 * Computes the initial filter UI data for the products listing page.
 * Filtering is handled entirely client-side via hash navigation.
 */
import { computeFilterBase } from "#filters/item-filters.js";
import { memoizeByRef } from "#toolkit/fp/memoize.js";

/**
 * Create a collection function that returns listing filter UI data.
 * @param {string} tag - Eleventy collection tag (e.g., "products")
 * @param {string} baseUrl - Base URL for the item type (e.g., "/products")
 * @returns {(collectionApi: import("@11ty/eleventy").CollectionApi) => import("#lib/types").FilterUIData}
 */
export const createListingFilterUI = (tag, baseUrl) =>
  memoizeByRef(
    (collectionApi) =>
      computeFilterBase(collectionApi, tag, baseUrl).listingFilterUI,
  );
