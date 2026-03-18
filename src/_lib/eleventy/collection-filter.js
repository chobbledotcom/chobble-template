import { filterItems } from "#utils/collection-filter.js";

export const configureCollectionFilter = (eleventyConfig) => {
  eleventyConfig.addFilter("filterItems", filterItems);
};
