/**
 * Category-scoped product filtering.
 *
 * Generates filter pages and UI data for products within each category.
 * Reuses core functions from item-filters.js.
 *
 * Collections created:
 * - filteredCategoryProductPages: Pre-computed filter result pages per category
 * - categoryFilterAttributes: Filter attributes available per category
 * - categoryFilterRedirects: Redirects for invalid category filter paths
 *
 * Filters created:
 * - buildCategoryFilterUIData: Generates UI data for category-scoped filter display
 */
import { getProductsByCategory } from "#collections/products.js";
import {
  addFilterUIToPages,
  buildDisplayLookup,
  buildFilterPageBase,
  buildFilterUIData,
  generateFilterCombinations,
  generateFilterRedirects,
  getAllFilterAttributes,
  getItemsByFilters,
} from "#filters/item-filters.js";

/**
 * Generate filter pages for a single category
 * @param {string} categorySlug - The category's file slug
 * @param {import("#lib/types").EleventyCollectionItem[]} categoryProducts - Products in this category
 * @returns {Array} Filter page objects for this category
 */
const generateCategoryFilterPages = (categorySlug, categoryProducts) => {
  if (categoryProducts.length === 0) return [];

  const combinations = generateFilterCombinations(categoryProducts);
  const displayLookup = buildDisplayLookup(categoryProducts);
  const filterData = {
    attributes: getAllFilterAttributes(categoryProducts),
    displayLookup,
  };
  const baseUrl = `/categories/${categorySlug}`;

  const pages = combinations.map((combo) => {
    const matchedProducts = getItemsByFilters(categoryProducts, combo.filters);
    return {
      categorySlug,
      categoryUrl: baseUrl,
      ...buildFilterPageBase(combo, matchedProducts, displayLookup),
      products: matchedProducts,
    };
  });

  addFilterUIToPages(pages, filterData, baseUrl);
  return pages;
};

/**
 * Generate filter attributes for a single category
 * @param {import("#lib/types").EleventyCollectionItem[]} categoryProducts - Products in this category
 * @returns {Object|null} Filter attributes object or null if no attributes
 */
const generateCategoryFilterAttributes = (categoryProducts) => {
  if (categoryProducts.length === 0) return null;

  const attributes = getAllFilterAttributes(categoryProducts);
  if (Object.keys(attributes).length === 0) return null;

  return {
    attributes,
    displayLookup: buildDisplayLookup(categoryProducts),
  };
};

/**
 * Generate redirects for invalid filter paths within a category
 * @param {string} categorySlug - The category's file slug
 * @param {import("#lib/types").EleventyCollectionItem[]} categoryProducts - Products in this category
 * @returns {Array} Redirect objects for this category
 */
const generateCategoryFilterRedirects = (categorySlug, categoryProducts) =>
  generateFilterRedirects(
    categoryProducts,
    `/categories/${categorySlug}/search`,
  );

/**
 * Build category-scoped filter UI data
 * @param {Object} categoryFilterAttrs - { [categorySlug]: { attributes, displayLookup } }
 * @param {string} categorySlug - The category to build UI for
 * @param {Object|null} currentFilters - Currently active filters
 * @param {Array} filteredPages - All filtered category product pages
 * @returns {Object} Filter UI data for templates
 */
const buildCategoryFilterUIDataFn = (
  categoryFilterAttrs,
  categorySlug,
  currentFilters,
  filteredPages,
) => {
  const filterData = categoryFilterAttrs[categorySlug];
  if (!filterData) {
    return { hasFilters: false };
  }

  const categoryPages = filteredPages.filter(
    (p) => p.categorySlug === categorySlug,
  );
  const baseUrl = `/categories/${categorySlug}`;

  return buildFilterUIData(filterData, currentFilters, categoryPages, baseUrl);
};

/**
 * Process each category with its products using a mapper function.
 * Reduces duplication across collection creators.
 * @param {import("@11ty/eleventy").CollectionApi} collectionApi
 * @param {Function} mapFn - (categorySlug, categoryProducts) => result
 * @returns {Array} Results from mapFn for each category
 */
const mapCategoriesWithProducts = (collectionApi, mapFn) => {
  const categories = collectionApi.getFilteredByTag("categories");
  const products = collectionApi.getFilteredByTag("products");
  return categories.map((category) => {
    const categoryProducts = getProductsByCategory(products, category.fileSlug);
    return mapFn(category.fileSlug, categoryProducts);
  });
};

/**
 * Create the filtered category product pages collection
 * @param {import("@11ty/eleventy").CollectionApi} collectionApi
 * @returns {Array} All filter pages across all categories
 */
const createFilteredCategoryProductPages = (collectionApi) =>
  mapCategoriesWithProducts(collectionApi, generateCategoryFilterPages).flat();

/**
 * Create the category filter attributes collection
 * @param {import("@11ty/eleventy").CollectionApi} collectionApi
 * @returns {Object} Map of categorySlug -> { attributes, displayLookup }
 */
const createCategoryFilterAttributes = (collectionApi) => {
  const entries = mapCategoriesWithProducts(collectionApi, (slug, products) => {
    const attrs = generateCategoryFilterAttributes(products);
    return attrs ? [slug, attrs] : null;
  }).filter(Boolean);
  return Object.fromEntries(entries);
};

/**
 * Create the category filter redirects collection
 * @param {import("@11ty/eleventy").CollectionApi} collectionApi
 * @returns {Array} All redirects across all categories
 */
const createCategoryFilterRedirects = (collectionApi) =>
  mapCategoriesWithProducts(
    collectionApi,
    generateCategoryFilterRedirects,
  ).flat();

/**
 * Create listing filterUI for each category (for category main pages)
 * @param {import("@11ty/eleventy").CollectionApi} collectionApi
 * @returns {Object} Map of categorySlug -> filterUI
 */
const createCategoryListingFilterUI = (collectionApi) => {
  const filteredPages = createFilteredCategoryProductPages(collectionApi);
  const filterAttrs = createCategoryFilterAttributes(collectionApi);

  return Object.fromEntries(
    Object.entries(filterAttrs).map(([slug, attrs]) => {
      const categoryPages = filteredPages.filter(
        (p) => p.categorySlug === slug,
      );
      const baseUrl = `/categories/${slug}`;
      return [slug, buildFilterUIData(attrs, null, categoryPages, baseUrl)];
    }),
  );
};

export {
  generateCategoryFilterPages,
  generateCategoryFilterAttributes,
  generateCategoryFilterRedirects,
  buildCategoryFilterUIDataFn,
  createFilteredCategoryProductPages,
  createCategoryFilterAttributes,
  createCategoryFilterRedirects,
  createCategoryListingFilterUI,
};
