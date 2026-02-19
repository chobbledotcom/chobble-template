/**
 * News collection
 *
 * @module #collections/news
 */

import { sortByDateDescending } from "#utils/sorting.js";

/** @typedef {import("#lib/types").NewsCollectionItem} NewsCollectionItem */

/**
 * Creates the news collection.
 * Fetches all items tagged with "news", filters out no_index ones, and sorts by date.
 * Individual post pages are still rendered - this only affects listings.
 *
 * @param {import("@11ty/eleventy").CollectionApi} collectionApi
 * @returns {NewsCollectionItem[]}
 */
const createNewsCollection = (collectionApi) =>
  collectionApi
    .getFilteredByTag("news")
    .filter(
      (/** @type {NewsCollectionItem} */ post) => post.data.no_index !== true,
    )
    .sort(sortByDateDescending);

/** @param {*} eleventyConfig */
const configureNews = (eleventyConfig) => {
  eleventyConfig.addCollection("news", createNewsCollection);
};

export { createNewsCollection, configureNews };
