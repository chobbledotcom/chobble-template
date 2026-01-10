import { sortItems } from "#utils/sorting.js";

/**
 * Creates the landing pages collection.
 * Fetches all items tagged with "landing-pages", filters out hidden ones, and sorts by order.
 *
 * @param {import("@11ty/eleventy").CollectionApi} collectionApi
 * @returns {import("#lib/types").EleventyCollectionItem[]}
 */
const createLandingPagesCollection = (collectionApi) => {
  const landingPages = collectionApi.getFilteredByTag("landing-pages");
  return landingPages
    .filter((page) => page.data.hidden !== true)
    .sort(sortItems);
};

/**
 * Configure landing pages collection for Eleventy
 */
const configureLandingPages = (eleventyConfig) => {
  eleventyConfig.addCollection("landingPages", createLandingPagesCollection);
};

export { createLandingPagesCollection, configureLandingPages };
