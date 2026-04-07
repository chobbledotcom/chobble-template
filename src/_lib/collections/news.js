/**
 * News collection
 *
 * @module #collections/news
 */

import { createTagCollection } from "#utils/collection-utils.js";
import { sortByDateDescending } from "#utils/sorting.js";

/** @typedef {import("#lib/types").NewsCollectionItem} NewsCollectionItem */

/**
 * Creates the news collection.
 * Fetches all items tagged with "news", filters out no_index ones, and sorts by date.
 * Individual post pages are still rendered - this only affects listings.
 *
 * @type {(collectionApi: import("@11ty/eleventy").CollectionApi) => NewsCollectionItem[]}
 */
const createNewsCollection = createTagCollection(
  "news",
  "no_index",
  sortByDateDescending,
);

/** @param {*} eleventyConfig */
const configureNews = (eleventyConfig) => {
  eleventyConfig.addCollection("news", createNewsCollection);
};

export { configureNews, createNewsCollection };
