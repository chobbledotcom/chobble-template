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
import { enhanceWithFilterUI } from "#filters/filter-ui.js";
import {
  buildDisplayLookup,
  buildFilterPageBase,
  buildFilterUIData,
  buildItemLookup,
  expandWithSortVariants,
  generateFilterCombinations,
  generateFilterRedirects,
  generateSortOnlyPages,
  getAllFilterAttributes,
  matchWithSort,
} from "#filters/item-filters.js";
import { groupByWithCache } from "#toolkit/fp/memoize.js";
import { mapObject } from "#toolkit/fp/object.js";

/**
 * Index filtered pages by categorySlug for O(1) lookups.
 * Cached per pages array using WeakMap.
 */
const pagesByCategory = groupByWithCache((page) => [page.categorySlug]);

/** Filter to base paths (without sort variants) */
const getBasePaths = (pages) =>
  pages.filter((p) => !p.sortKey || p.sortKey === "default");

/**
 * Build category-scoped filter UI data
 * @param {Object} categoryFilterAttrs - { [categorySlug]: { attributes, displayLookup } }
 * @param {string} categorySlug - The category to build UI for
 * @param {Object|null} currentFilters - Currently active filters
 * @param {Array} filteredPages - All filtered category product pages
 * @param {string} [currentSortKey="default"] - Current sort key
 * @param {number} [count=2] - Current item count (used to hide sort/filters when <= 1)
 * @returns {Object} Filter UI data for templates
 */
const categoryFilterData = (
  categoryFilterAttrs,
  categorySlug,
  currentFilters,
  filteredPages,
  currentSortKey = "default",
  count = 2,
) => {
  const filterData = categoryFilterAttrs[categorySlug];
  if (!filterData) {
    return { hasFilters: false };
  }

  const categoryPages = pagesByCategory(filteredPages)[categorySlug] ?? [];
  const baseUrl = `/categories/${categorySlug}`;

  return buildFilterUIData(
    filterData,
    currentFilters ?? {},
    getBasePaths(categoryPages),
    baseUrl,
    currentSortKey,
    count,
  );
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
const filteredCategoryPages = (collectionApi) =>
  mapCategoriesWithProducts(collectionApi, (categorySlug, categoryProducts) => {
    if (categoryProducts.length === 0) return [];

    const baseCombinations = generateFilterCombinations(categoryProducts);

    // No filter attributes = no pages (sort-only pages require filter attributes)
    if (baseCombinations.length === 0) return [];

    const lookup = buildItemLookup(categoryProducts);
    const displayLookup = buildDisplayLookup(categoryProducts);
    const filterData = {
      attributes: getAllFilterAttributes(categoryProducts),
      displayLookup,
    };
    const baseUrl = `/categories/${categorySlug}`;

    // Expand with sort variants
    const combinationsWithSort = expandWithSortVariants(baseCombinations);

    // Add sort-only pages (only when we have filter attributes)
    const sortOnlyPages = generateSortOnlyPages(categoryProducts.length);

    // Combine all pages
    const allCombinations = [...combinationsWithSort, ...sortOnlyPages];

    const pages = allCombinations.map((combo) => {
      const matchedProducts = matchWithSort(
        categoryProducts,
        combo.filters,
        lookup,
        combo.sortKey,
      );
      return {
        categorySlug,
        categoryUrl: baseUrl,
        sortKey: combo.sortKey,
        ...buildFilterPageBase(combo, matchedProducts, displayLookup),
        products: matchedProducts,
      };
    });

    return enhanceWithFilterUI(pages, filterData, baseUrl, baseCombinations);
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
const categoryListingUI = (collectionApi) => {
  const filteredPages = filteredCategoryPages(collectionApi);
  const filterAttrs = createCategoryFilterAttributes(collectionApi);
  const pagesByCategorySlug = pagesByCategory(filteredPages);

  return mapObject((slug, attrs) => {
    const categoryPages = pagesByCategorySlug[slug] ?? [];
    const baseUrl = `/categories/${slug}`;
    // Get total count from a sort-only page (has empty filters)
    const sortOnlyPage = categoryPages.find(
      (p) => Object.keys(p.filters).length === 0,
    );
    const totalCount = sortOnlyPage?.count ?? 0;
    return [
      slug,
      buildFilterUIData(
        attrs,
        {},
        getBasePaths(categoryPages),
        baseUrl,
        "default",
        totalCount,
      ),
    ];
  })(filterAttrs);
};

export {
  categoryFilterData,
  filteredCategoryPages,
  createCategoryFilterAttributes,
  createCategoryFilterRedirects,
  categoryListingUI,
};
