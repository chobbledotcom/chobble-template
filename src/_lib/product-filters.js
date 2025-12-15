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
  buildFilterDescription,
  buildFilterUIData,
  createFilterConfig,
} from "./item-filters.js";

/**
 * Product-specific filter configuration using the shared item-filters library
 */

const productFilterConfig = createFilterConfig({
  tag: "product",
  permalinkDir: strings.product_permalink_dir,
  collectionPrefix: "filteredProduct",
  itemName: "product",
});

// Legacy aliases for backwards compatibility with existing code
const productMatchesFilters = itemMatchesFilters;
const getProductsByFilters = getItemsByFilters;

/**
 * Create collection of filtered product pages
 * Uses legacy collection name for backwards compatibility
 */
const createFilteredProductPagesCollection = (collectionApi) => {
  const result = productFilterConfig.createFilteredPagesCollection(collectionApi);
  // Map 'items' to 'products' for backwards compatibility
  return result.map((page) => ({
    ...page,
    products: page.items,
  }));
};

/**
 * Generate redirects for incomplete filter paths
 */
const createFilterRedirectsCollection =
  productFilterConfig.createRedirectsCollection;

/**
 * Create collection of filter data
 */
const createFilterAttributesCollection =
  productFilterConfig.createAttributesCollection;

/**
 * Build filter UI data for products
 * Wrapper that provides the product base URL
 */
const buildProductFilterUIData = (filterData, currentFilters, validPages) => {
  const baseUrl = `/${strings.product_permalink_dir}`;
  return buildFilterUIData(filterData, currentFilters, validPages, baseUrl);
};

/**
 * Configure Eleventy with product filter collections and filters
 */
const configureProductFilters = (eleventyConfig) => {
  // Use legacy collection names for backwards compatibility
  eleventyConfig.addCollection(
    "filteredProductPages",
    createFilteredProductPagesCollection,
  );

  eleventyConfig.addCollection(
    "filterRedirects",
    createFilterRedirectsCollection,
  );

  eleventyConfig.addCollection(
    "filterAttributes",
    createFilterAttributesCollection,
  );

  eleventyConfig.addFilter("getProductsByFilters", getProductsByFilters);
  eleventyConfig.addFilter("getAllFilterAttributes", getAllFilterAttributes);
  eleventyConfig.addFilter("filterToPath", filterToPath);
  eleventyConfig.addFilter("pathToFilter", pathToFilter);
  eleventyConfig.addFilter("parseFilterAttributes", parseFilterAttributes);
  eleventyConfig.addFilter("buildFilterUIData", buildProductFilterUIData);
};

export {
  parseFilterAttributes,
  getAllFilterAttributes,
  buildDisplayLookup,
  filterToPath,
  pathToFilter,
  productMatchesFilters,
  getProductsByFilters,
  generateFilterCombinations,
  createFilteredProductPagesCollection,
  createFilterRedirectsCollection,
  createFilterAttributesCollection,
  buildFilterUIData,
  configureProductFilters,
};
