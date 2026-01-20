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
  buildItemLookup,
  generateFilterCombinations,
  generateFilterRedirects,
  getAllFilterAttributes,
  getItemsWithLookup,
} from "#filters/item-filters.js";
import { groupByWithCache } from "#toolkit/fp/memoize.js";

/**
 * Index filtered pages by categorySlug for O(1) lookups.
 * Cached per pages array using WeakMap.
 */
const indexPagesByCategorySlug = groupByWithCache((page) => [
  page.categorySlug,
]);

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

  const pagesByCategorySlug = indexPagesByCategorySlug(filteredPages);
  const categoryPages = pagesByCategorySlug[categorySlug] ?? [];
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
 * Create the filtered category product pages collection.
 * Builds inverted index once per category and reuses it for all filter lookups.
 *
 * @param {import("@11ty/eleventy").CollectionApi} collectionApi
 * @returns {Array} All filter pages across all categories
 */
const createFilteredCategoryProductPages = (collectionApi) =>
  mapCategoriesWithProducts(collectionApi, (categorySlug, categoryProducts) => {
    if (categoryProducts.length === 0) return [];

    const lookup = buildItemLookup(categoryProducts);
    const combinations = generateFilterCombinations(categoryProducts);
    const displayLookup = buildDisplayLookup(categoryProducts);
    const filterData = {
      attributes: getAllFilterAttributes(categoryProducts),
      displayLookup,
    };
    const baseUrl = `/categories/${categorySlug}`;

    const pages = combinations.map((combo) => {
      const matchedProducts = getItemsWithLookup(
        categoryProducts,
        combo.filters,
        lookup,
      );
      return {
        categorySlug,
        categoryUrl: baseUrl,
        ...buildFilterPageBase(combo, matchedProducts, displayLookup),
        products: matchedProducts,
      };
    });

    addFilterUIToPages(pages, filterData, baseUrl);
    return pages;
  }).flat();

/**
 * Create the category filter attributes collection
 * @param {import("@11ty/eleventy").CollectionApi} collectionApi
 * @returns {Object} Map of categorySlug -> { attributes, displayLookup }
 */
const createCategoryFilterAttributes = (collectionApi) => {
  const entries = mapCategoriesWithProducts(
    collectionApi,
    (slug, categoryProducts) => {
      if (categoryProducts.length === 0) return null;

      const attributes = getAllFilterAttributes(categoryProducts);
      if (Object.keys(attributes).length === 0) return null;

      return [
        slug,
        { attributes, displayLookup: buildDisplayLookup(categoryProducts) },
      ];
    },
  ).filter(Boolean);
  return Object.fromEntries(entries);
};

/**
 * Create the category filter redirects collection
 * @param {import("@11ty/eleventy").CollectionApi} collectionApi
 * @returns {Array} All redirects across all categories
 */
const createCategoryFilterRedirects = (collectionApi) =>
  mapCategoriesWithProducts(collectionApi, (categorySlug, categoryProducts) =>
    generateFilterRedirects(
      categoryProducts,
      `/categories/${categorySlug}/search`,
    ),
  ).flat();

/**
 * Create listing filterUI for each category (for category main pages)
 * @param {import("@11ty/eleventy").CollectionApi} collectionApi
 * @returns {Object} Map of categorySlug -> filterUI
 */
const createCategoryListingFilterUI = (collectionApi) => {
  const filteredPages = createFilteredCategoryProductPages(collectionApi);
  const filterAttrs = createCategoryFilterAttributes(collectionApi);
  const pagesByCategorySlug = indexPagesByCategorySlug(filteredPages);

  return Object.fromEntries(
    Object.entries(filterAttrs).map(([slug, attrs]) => {
      const categoryPages = pagesByCategorySlug[slug] ?? [];
      const baseUrl = `/categories/${slug}`;
      return [slug, buildFilterUIData(attrs, null, categoryPages, baseUrl)];
    }),
  );
};

export {
  buildCategoryFilterUIDataFn,
  createFilteredCategoryProductPages,
  createCategoryFilterAttributes,
  createCategoryFilterRedirects,
  createCategoryListingFilterUI,
};
