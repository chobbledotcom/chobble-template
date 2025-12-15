import strings from "../_data/strings.js";
import {
  parseFilterAttributes,
  getAllFilterAttributes,
  buildDisplayLookup,
  filterToPath,
  pathToFilter,
  itemMatchesFilters,
  getItemsByFilters,
  generateFilterCombinations,
  buildFilterUIData,
  createFilterConfig,
} from "./item-filters.js";

/**
 * Property-specific filter configuration using the shared item-filters library
 */

const propertyFilterConfig = createFilterConfig({
  tag: "property",
  permalinkDir: strings.property_permalink_dir,
  collectionPrefix: "filteredProperty",
  itemName: "property",
});

const propertyMatchesFilters = itemMatchesFilters;
const getPropertiesByFilters = getItemsByFilters;

/**
 * Create collection of filtered property pages
 */
const createFilteredPropertyPagesCollection = (collectionApi) => {
  const result =
    propertyFilterConfig.createFilteredPagesCollection(collectionApi);
  return result.map((page) => ({
    ...page,
    properties: page.items,
  }));
};

/**
 * Generate redirects for incomplete filter paths
 */
const createPropertyFilterRedirectsCollection =
  propertyFilterConfig.createRedirectsCollection;

/**
 * Create collection of filter data
 */
const createPropertyFilterAttributesCollection =
  propertyFilterConfig.createAttributesCollection;

/**
 * Build filter UI data for properties
 * Wrapper that provides the property base URL
 */
const buildPropertyFilterUIData = (filterData, currentFilters, validPages) => {
  const baseUrl = `/${strings.property_permalink_dir}`;
  return buildFilterUIData(filterData, currentFilters, validPages, baseUrl);
};

/**
 * Configure Eleventy with property filter collections and filters
 */
const configurePropertyFilters = (eleventyConfig) => {
  eleventyConfig.addCollection(
    "filteredPropertyPages",
    createFilteredPropertyPagesCollection,
  );

  eleventyConfig.addCollection(
    "propertyFilterRedirects",
    createPropertyFilterRedirectsCollection,
  );

  eleventyConfig.addCollection(
    "propertyFilterAttributes",
    createPropertyFilterAttributesCollection,
  );

  eleventyConfig.addFilter("getPropertiesByFilters", getPropertiesByFilters);
  eleventyConfig.addFilter(
    "buildPropertyFilterUIData",
    buildPropertyFilterUIData,
  );
};

export {
  parseFilterAttributes,
  getAllFilterAttributes,
  buildDisplayLookup,
  filterToPath,
  pathToFilter,
  propertyMatchesFilters,
  getPropertiesByFilters,
  generateFilterCombinations,
  createFilteredPropertyPagesCollection,
  createPropertyFilterRedirectsCollection,
  createPropertyFilterAttributesCollection,
  buildPropertyFilterUIData,
  configurePropertyFilters,
};
