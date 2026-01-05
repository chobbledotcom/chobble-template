import { sortByDateDescending } from "#utils/sorting.js";

/**
 * Creates the news collection.
 * Fetches all items tagged with "news", filters out no_index ones, and sorts by date.
 * Individual post pages are still rendered - this only affects listings.
 */
const createNewsCollection = (collectionApi) => {
  const news = collectionApi.getFilteredByTag("news") || [];
  return news
    .filter((post) => post.data.no_index !== true)
    .sort(sortByDateDescending);
};

/**
 * Configure news collection for Eleventy
 */
const configureNews = (eleventyConfig) => {
  eleventyConfig.addCollection("news", createNewsCollection);
};

export { createNewsCollection, configureNews };
