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
  createCategoryFilterRedirects,
  filteredCategoryPages,
} from "#filters/category-product-filters.js";
import { createFilterConfig } from "#filters/item-filters.js";

const categoryCollections = {
  filteredCategoryProductPages: filteredCategoryPages,
  categoryFilterAttributes: createCategoryFilterAttributes,
  categoryFilterRedirects: createCategoryFilterRedirects,
  categoryListingFilterUI: categoryListingUI,
};

const itemFilterConfigs = [
  {
    tag: "products",
    permalinkDir: strings.product_permalink_dir,
    itemsKey: "products",
    collections: {
      pages: "filteredProductPages",
      redirects: "filterRedirects",
    },
    uiDataFilterName: "buildFilterUIData",
  },
  {
    tag: "property",
    permalinkDir: strings.property_permalink_dir,
    itemsKey: "properties",
    collections: {
      pages: "filteredPropertyPages",
      redirects: "propertyFilterRedirects",
      attributes: "propertyFilterAttributes",
    },
    uiDataFilterName: "buildPropertyFilterUIData",
  },
];

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

  // Product and property filters
  for (const config of itemFilterConfigs) {
    createFilterConfig(config).configure(eleventyConfig);
  }
};
