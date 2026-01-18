/**
 * Linked list filter for creating comma-separated link lists from slugs
 */

import configModule from "#data/config.js";
import { compact } from "#utils/array-utils.js";
import { createHtml } from "#utils/dom-builder.js";
import { memoize } from "#utils/memoize.js";

const getConfig = memoize(configModule);

/**
 * Look up an item in a collection by its fileSlug
 * @param {Array} collection - The collection to search
 * @param {string} slug - The fileSlug to find
 * @returns {Object|undefined} The matching item or undefined
 */
const findBySlug = (collection, slug) =>
  collection.find((item) => item.fileSlug === slug);

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
 * Create a linked list from an array of slugs
 * @param {string[]} slugs - Array of fileSlug values to look up
 * @param {Array} collection - The collection to search for items
 * @returns {Promise<string>} Comma-separated HTML links
 *
 * @example
 * // In Liquid template:
 * {{ review.data.products | linkedList: collections.products }}
 */
const linkedList = async (slugs, collection) => {
  if (!isValidInput(slugs, collection)) {
    return "";
  }
  const anchor = await getAnchorSuffix();
  const links = await buildLinks(slugs, collection, anchor);
  return links.join(", ");
};

/**
 * Configure the linked list filter for Eleventy
 * @param {import("@11ty/eleventy").UserConfig} eleventyConfig
 */
const configureLinkedList = (eleventyConfig) => {
  eleventyConfig.addFilter("linkedList", linkedList);
};

export { linkedList, configureLinkedList };
