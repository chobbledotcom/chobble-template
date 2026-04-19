import { filterItems } from "#utils/collection-filter.js";
import { sortItems } from "#utils/sorting.js";

/** @param {*} eleventyConfig */
export const configureCollectionFilter = (eleventyConfig) => {
  eleventyConfig.addFilter("filterItems", filterItems);
  eleventyConfig.addFilter("sortItems", (items) => [...items].sort(sortItems));
};
