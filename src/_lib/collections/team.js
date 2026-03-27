/**
 * Team collection - sorted by order then title.
 *
 * @module #collections/team
 */

import { sortItems } from "#utils/sorting.js";

/**
 * Configure team collection for Eleventy.
 *
 * @param {import('11ty.ts').EleventyConfig} eleventyConfig
 */
const configureTeam = (eleventyConfig) => {
  eleventyConfig.addCollection(
    "team",
    /** @param {*} collectionApi */
    (collectionApi) => collectionApi.getFilteredByTag("team").sort(sortItems),
  );
};

export { configureTeam };
