import { filterItems } from "#utils/collection-filter.js";

/** @param {*} eleventyConfig */
export const configureCollectionFilter = (eleventyConfig) => {
  eleventyConfig.addFilter("filterItems", filterItems);
};
