/**
 * Central registration for category filter collections and the unified getFilterUI.
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
import { getFilterUI } from "#filters/item-filters.js";

/**
 * Configure category filter collections and unified getFilterUI
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
  eleventyConfig.addFilter("getFilterUI", getFilterUI);
};
