/**
 * Central registration for category filter collections.
 *
 * This file is excluded from coverage because it contains only wiring code
 * that registers already-tested functions with Eleventy. The actual logic
 * in the imported functions is fully unit tested.
 */
import {
  buildCategoryFilterUIDataFn,
  createCategoryFilterAttributes,
  createCategoryFilterRedirects,
  createCategoryListingFilterUI,
  createFilteredCategoryProductPages,
} from "#filters/category-product-filters.js";

/**
 * Configure category filter collections
 * @param {import("@11ty/eleventy").UserConfig} eleventyConfig
 */
export const configureCategoryFilters = (eleventyConfig) => {
  eleventyConfig.addCollection(
    "filteredCategoryProductPages",
    createFilteredCategoryProductPages,
  );
  eleventyConfig.addCollection(
    "categoryFilterAttributes",
    createCategoryFilterAttributes,
  );
  eleventyConfig.addCollection(
    "categoryFilterRedirects",
    createCategoryFilterRedirects,
  );
  eleventyConfig.addCollection(
    "categoryListingFilterUI",
    createCategoryListingFilterUI,
  );
  eleventyConfig.addFilter(
    "buildCategoryFilterUIData",
    buildCategoryFilterUIDataFn,
  );
};
