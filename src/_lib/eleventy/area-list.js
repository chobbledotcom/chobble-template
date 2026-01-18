/**
 * Area list formatting - filters and sorts location collections
 * for use with Liquid templates.
 *
 * Logic lives here; HTML markup lives in area-list.html template.
 */

import { filter, listSeparator, map, pipe, sortBy } from "#toolkit/fp/array.js";

const navKey = (loc) => loc.data?.eleventyNavigation?.key || "";

/**
 * Prepare area list data for template rendering.
 * Filters, sorts, and adds separators so the template just loops and renders.
 *
 * @param {import("#lib/types").EleventyCollectionItem[]} locations
 * @param {string} currentUrl
 * @returns {Array<{url: string, name: string, separator: string}>}
 */
const prepareAreaList = (locations, currentUrl) => {
  // Top-level locations have exactly 2 path segments: /locations/springfield/
  const isTopLevel = (url) =>
    url && url.split("/").filter(Boolean).length === 2;

  const filtered = pipe(
    filter((loc) => isTopLevel(loc.url) && loc.url !== currentUrl),
    sortBy(navKey),
  )(locations);

  const separator = listSeparator(filtered.length);

  return pipe(
    map((loc, index) => ({
      url: loc.url,
      name: navKey(loc),
      separator: separator(index),
    })),
  )(filtered);
};

/**
 * Configure the Eleventy filters for area list.
 *
 * @param {Object} eleventyConfig - Eleventy configuration object
 */
const configureAreaList = (eleventyConfig) => {
  eleventyConfig.addFilter("prepareAreaList", prepareAreaList);
};

export { configureAreaList };
