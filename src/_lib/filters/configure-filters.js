/**
 * Central registration for all filter collections.
 *
 * This file is excluded from coverage because it contains only wiring code
 * that registers already-tested functions with Eleventy. The actual logic
 * in the imported functions is fully unit tested.
 */
import strings from "#data/strings.js";
import {
  categoryFilterData,
  categoryListingUI,
  createCategoryFilterAttributes,
} from "#filters/category-product-filters.js";
import { createListingFilterUI } from "#filters/product-listing-filter.js";

const categoryCollections = {
  categoryFilterAttributes: createCategoryFilterAttributes,
  categoryListingFilterUI: categoryListingUI,
};

/**
 * Configure all filter collections and filters
 * @param {import("@11ty/eleventy").UserConfig} eleventyConfig
 */
export const configureFilters = (eleventyConfig) => {
  // Category filter collections
  for (const [name, fn] of Object.entries(categoryCollections)) {
    eleventyConfig.addCollection(name, fn);
  }
  eleventyConfig.addFilter("buildCategoryFilterUIData", categoryFilterData);

  // Product listing filter UI (client-side filtering, server-rendered UI)
  eleventyConfig.addCollection(
    "filteredProductPagesListingFilterUI",
    createListingFilterUI("products", `/${strings.product_permalink_dir}`),
  );
};
