/**
 * Link list filter for creating comma-separated link lists from slugs
 */

import configModule from "#data/config.js";
import { compact } from "#utils/array-utils.js";
import { createHtml } from "#utils/dom-builder.js";
import { memoize } from "#utils/memoize.js";

const getConfig = memoize(configModule);

/**
 * Cache for collection slug lookup maps.
 * Uses WeakMap so collections can be garbage collected after build.
 * @type {WeakMap<Array, Map<string, Object>>}
 */
const slugMapCache = new WeakMap();

/**
 * Get or create a slug→item lookup map for a collection.
 * Builds the map once per collection, then reuses it for O(1) lookups.
 * @param {Array} collection - The collection to index
 * @returns {Map<string, Object>} Map of fileSlug to item
 */
const getSlugMap = (collection) => {
  let slugMap = slugMapCache.get(collection);
  if (!slugMap) {
    slugMap = new Map();
    for (const item of collection) {
      slugMap.set(item.fileSlug, item);
    }
    slugMapCache.set(collection, slugMap);
  }
  return slugMap;
};

/**
 * Look up an item in a collection by its fileSlug
 * @param {Array} collection - The collection to search
 * @param {string} slug - The fileSlug to find
 * @returns {Object|undefined} The matching item or undefined
 */
const findBySlug = (collection, slug) => getSlugMap(collection).get(slug);

/**
 * Get the anchor suffix based on config
 * @returns {Promise<string>} "#content" or ""
 */
const getAnchorSuffix = async () => {
  const config = await getConfig();
  return config?.navigation_content_anchor ? "#content" : "";
};

/**
 * Create a link element for an item
 * @param {string} anchor - Anchor suffix
 * @returns {(item: Object) => Promise<string>} Function that creates HTML anchor
 */
const createItemLink = (anchor) => async (item) => {
  const url = `${item.url}${anchor}`;
  const title = item.data?.title || item.fileSlug;
  return createHtml("a", { href: url }, title);
};

/**
 * Build links array from slugs and collection
 * @param {string[]} slugs - Array of fileSlug values
 * @param {Array} collection - The collection to search
 * @param {string} anchor - Anchor suffix
 * @returns {Promise<string[]>} Array of HTML links
 */
const buildLinks = async (slugs, collection, anchor) => {
  const items = compact(slugs.map((slug) => findBySlug(collection, slug)));
  return Promise.all(items.map(createItemLink(anchor)));
};

/**
 * Check if input is valid for processing
 * @param {unknown} slugs - Slugs input
 * @param {unknown} collection - Collection input
 * @returns {boolean} True if inputs are valid
 */
const isValidInput = (slugs, collection) =>
  Array.isArray(slugs) && slugs.length > 0 && Array.isArray(collection);

/**
 * Create a link list from an array of slugs
 * @param {string[]} slugs - Array of fileSlug values to look up
 * @param {Array} collection - The collection to search for items
 * @returns {Promise<string>} Comma-separated HTML links
 *
 * @example
 * // In Liquid template:
 * {{ review.data.products | linkList: collections.products }}
 */
const linkList = async (slugs, collection) => {
  if (!isValidInput(slugs, collection)) {
    return "";
  }
  const anchor = await getAnchorSuffix();
  const links = await buildLinks(slugs, collection, anchor);
  return links.join(", ");
};

/**
 * Configure the link list filter for Eleventy
 * @param {import("@11ty/eleventy").UserConfig} eleventyConfig
 */
const configureLinkList = (eleventyConfig) => {
  eleventyConfig.addFilter("linkList", linkList);
};

export { linkList, configureLinkList };
