/**
 * News collection
 *
 * @module #collections/news
 */

import { sortByDateDescending } from "#utils/sorting.js";

/** @typedef {import("#lib/types").NewsCollectionItem} NewsCollectionItem */

/**
 * Get news items from collection API (typed wrapper).
 * @param {import("@11ty/eleventy").CollectionApi} collectionApi
 * @returns {NewsCollectionItem[]}
 */
const getNews = (collectionApi) => collectionApi.getFilteredByTag("news");

/**
 * Creates the news collection.
 * Fetches all items tagged with "news", filters out no_index ones, and sorts by date.
 * Individual post pages are still rendered - this only affects listings.
 *
 * @param {import("@11ty/eleventy").CollectionApi} collectionApi
 * @returns {NewsCollectionItem[]}
 */
const createNewsCollection = (collectionApi) =>
  getNews(collectionApi)
    .filter((post) => post.data.no_index !== true)
    .sort(sortByDateDescending);

/**
 * Configure news collection for Eleventy.
 *
 * @param {import('11ty.ts').EleventyConfig} eleventyConfig
 */
const configureNews = (eleventyConfig) => {
  eleventyConfig.addCollection("news", createNewsCollection);
};

export { createNewsCollection, configureNews };
