/**
 * Products collection
 *
 * Products live in src/products/ as one page each, with the `options` a
 * visitor can add to a quote. The collection lists them by `order`, then
 * name; a product marked `hidden` keeps its page but leaves the listings.
 *
 * @module #collections/products
 */

import { createTagCollection } from "#utils/collection-utils.js";
import { sortItems } from "#utils/sorting.js";

/** @param {import("#lib/types").UserConfig} eleventyConfig */
export const configureProducts = (eleventyConfig) => {
  eleventyConfig.addCollection(
    "products",
    createTagCollection("products", "hidden", sortItems),
  );
};
