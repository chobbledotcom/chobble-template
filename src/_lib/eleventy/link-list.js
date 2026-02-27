/**
 * Link list filter for creating comma-separated link lists from slugs
 */

import configModule from "#data/config.js";
import { getBySlug } from "#eleventy/collection-lookup.js";
import { mapAsync } from "#toolkit/fp/array.js";
import { memoize } from "#toolkit/fp/memoize.js";
import { createHtml } from "#utils/dom-builder.js";

const getConfig = memoize(configModule);

/**
 * Get the internal link suffix from config
 * @returns {Promise<string>} e.g. "#content" or ""
 */
const getAnchorSuffix = async () => {
  const config = await getConfig();
  return config.internal_link_suffix;
};

/**
 * Create a link element for an item.
 * @param {string} anchor - Anchor suffix
 */
const createItemLink = (anchor) => async (item) => {
  const url = `${item.url}${anchor}`;
  return createHtml("a", { href: url }, item.data.title);
};

/**
 * Build links array from slugs and collection.
 * Throws if any slug is not found in the collection.
 * @param {string[]} slugs - Array of fileSlug values
 * @param {Array} collection - The collection to search
 * @param {string} anchor - Anchor suffix
 * @returns {Promise<string[]>} Array of HTML links
 */
const buildLinks = async (slugs, collection, anchor) => {
  const items = slugs.map((slug) => getBySlug(collection, slug));
  return mapAsync(createItemLink(anchor))(items);
};

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
  const isValidInput =
    Array.isArray(slugs) && slugs.length > 0 && Array.isArray(collection);
  if (!isValidInput) {
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
