/**
 * Team collection - sorted by order then title.
 *
 * @module #collections/team
 */

import { sortItems } from "#utils/sorting.js";

/** @typedef {import("#lib/types").TeamCollectionItem} TeamCollectionItem */

/**
 * Create the team collection, sorted by order then title.
 * @param {import("@11ty/eleventy").CollectionApi} collectionApi
 * @returns {TeamCollectionItem[]}
 */
const createTeamCollection = (collectionApi) =>
  collectionApi.getFilteredByTag("team").sort(sortItems);

/**
 * Configure team collection for Eleventy.
 *
 * @param {import('11ty.ts').EleventyConfig} eleventyConfig
 */
const configureTeam = (eleventyConfig) => {
  eleventyConfig.addCollection("team", createTeamCollection);
};

export { configureTeam };
