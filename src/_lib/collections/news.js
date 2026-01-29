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
    .filter((post) => post.data.no_index !== true)
    .sort(sortByDateDescending);

/**
 * Check whether all news posts have a header_image.
 * Pre-computed once in JS instead of looping in Liquid on every render.
 *
 * @param {NewsCollectionItem[]} news - News collection items
 * @returns {boolean} True if every news post has a header_image
 */
const allNewsHaveImages = (news) =>
  news.length > 0 && news.every((post) => post.data.header_image);

/**
 * Configure news collection for Eleventy.
 *
 * @param {import('11ty.ts').EleventyConfig} eleventyConfig
 */
const configureNews = (eleventyConfig) => {
  eleventyConfig.addCollection("news", createNewsCollection);
  eleventyConfig.addFilter("allNewsHaveImages", allNewsHaveImages);
};

export { createNewsCollection, allNewsHaveImages, configureNews };
