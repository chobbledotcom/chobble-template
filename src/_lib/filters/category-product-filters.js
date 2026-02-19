/**
 * Category-scoped product filtering.
 *
 * Provides filter UI data for products within each category.
 * All data is computed once per build and cached.
 *
 * Collections: categoryFilterAttributes, categoryListingFilterUI
 *
 * Filters: buildCategoryFilterUIData
 */
import {
  buildDisplayLookup,
  buildFilterUIData,
  buildPathLookup,
  buildUIWithLookup,
  generateFilterCombinations,
  getAllFilterAttributes,
} from "#filters/item-filters.js";
import { mapFilter } from "#toolkit/fp/array.js";
import { groupByWithCache, memoizeByRef } from "#toolkit/fp/memoize.js";
import { createArrayFieldIndexer } from "#utils/collection-utils.js";
import { sortItems } from "#utils/sorting.js";

/** Group products by category slug - cached per products array */
const productsByCategory = createArrayFieldIndexer("categories");

/** Group pages by category slug - cached per pages array */
const pagesByCategory = groupByWithCache((page) => [page.categorySlug]);

/** Get only base paths (no sort suffix) for path validation */
const getBasePaths = (pages) =>
  pages.filter((p) => !p.sortKey || p.sortKey === "default");

/** Build context object for filter UI generation */
const buildContext = (slug, sortedProducts, combinations) => {
  const displayLookup = buildDisplayLookup(sortedProducts);
  return {
    slug,
    products: sortedProducts,
    baseUrl: `/categories/${slug}`,
    filterData: {
      attributes: getAllFilterAttributes(sortedProducts),
      displayLookup,
    },
    pathLookup: buildPathLookup(combinations),
  };
};

const mapBySlug = (categoryData, key) =>
  Object.fromEntries(
    categoryData.map((category) => [category.slug, category[key]]),
  );

/** Build listing UI for category main page */
const buildListingUI = (ctx, productCount) =>
  buildUIWithLookup(ctx, {
    filters: {},
    sortKey: "default",
    count: productCount,
  });

/**
 * Build filter UI data for a single category.
 * Returns null if category has no products or no filter attributes.
 */
const buildCategoryData = (slug, products) => {
  if (products.length === 0) return null;

  const sortedProducts = [...products].sort(sortItems);
  const combinations = generateFilterCombinations(sortedProducts);
  if (combinations.length === 0) return null;

  const ctx = buildContext(slug, sortedProducts, combinations);

  return {
    slug,
    attributes: ctx.filterData,
    listingUI: buildListingUI(ctx, sortedProducts.length),
  };
};

/**
 * Compute all category filter data in a single pass.
 * Cached by collectionApi reference - only runs once per build.
 */
const computeAllCategoryData = memoizeByRef(
  /** @param {import("@11ty/eleventy").CollectionApi} collectionApi */
  (collectionApi) => {
    const categories = collectionApi.getFilteredByTag("categories");
    const products = collectionApi.getFilteredByTag("products");
    const grouped = productsByCategory(products);

    const categoryData = mapFilter((category) => {
      const categoryProducts = grouped[category.fileSlug];
      if (!categoryProducts) return null;
      return buildCategoryData(category.fileSlug, categoryProducts);
    })(categories);

    return {
      attributes: mapBySlug(categoryData, "attributes"),
      listingUI: mapBySlug(categoryData, "listingUI"),
    };
  },
);

/**
 * Get filter attributes for each category.
 * @param {import("@11ty/eleventy").CollectionApi} collectionApi
 */
const createCategoryFilterAttributes = (collectionApi) =>
  computeAllCategoryData(collectionApi).attributes;

/**
 * Get filter UI for category listing pages.
 * @param {import("@11ty/eleventy").CollectionApi} collectionApi
 */
const categoryListingUI = (collectionApi) =>
  computeAllCategoryData(collectionApi).listingUI;

/**
 * Build category-scoped filter UI data for templates.
 */
const categoryFilterData = (
  categoryFilterAttrs,
  categorySlug,
  currentFilters = {},
  filteredPages,
  currentSortKey = "default",
  count = 2,
) => {
  const filterData = categoryFilterAttrs[categorySlug];
  if (!filterData) return { hasFilters: false };

  const categoryPages = pagesByCategory(filteredPages)[categorySlug];
  if (!categoryPages) return { hasFilters: false };

  const baseUrl = `/categories/${categorySlug}`;

  return buildFilterUIData(
    filterData,
    currentFilters,
    getBasePaths(categoryPages),
    baseUrl,
    currentSortKey,
    count,
  );
};

export {
  categoryFilterData,
  createCategoryFilterAttributes,
  categoryListingUI,
};
