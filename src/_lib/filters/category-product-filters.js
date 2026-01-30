/**
 * Category-scoped product filtering.
 *
 * Generates filter pages and UI data for products within each category.
 * All data is computed once per build and cached - the four collection functions
 * just pull from this shared cache.
 *
 * Collections: filteredCategoryProductPages, categoryFilterAttributes,
 * categoryFilterRedirects, categoryListingFilterUI
 *
 * Filters: buildCategoryFilterUIData
 */
import {
  expandWithSortVariants,
  generateFilterCombinations,
  generateFilterRedirects,
  generateSortOnlyPages,
} from "#filters/filter-combinations.js";
import {
  buildDisplayLookup,
  buildItemLookup,
  getAllFilterAttributes,
  matchWithSort,
} from "#filters/filter-core.js";
import {
  buildFilterPageBase,
  buildFilterUIData,
  buildPathLookup,
  buildUIWithLookup,
} from "#filters/filter-ui.js";
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

/**
 * Build a single filter page with all its data.
 */
const buildPage = (ctx, combo) => {
  const matchedProducts = matchWithSort(
    ctx.products,
    combo.filters,
    ctx.itemLookup,
    combo.sortKey,
  );
  return {
    categorySlug: ctx.slug,
    categoryUrl: ctx.baseUrl,
    sortKey: combo.sortKey,
    ...buildFilterPageBase(combo, ctx.displayLookup),
    products: matchedProducts,
    filterUI: buildUIWithLookup(
      ctx.filterData,
      combo.filters,
      ctx.pathLookup,
      ctx.baseUrl,
      combo.sortKey,
      combo.count,
    ),
  };
};

/**
 * Build all filter pages for a category.
 */
const buildPages = (ctx, combinations) => {
  const allCombinations = [
    ...expandWithSortVariants(combinations),
    ...generateSortOnlyPages(ctx.products.length),
  ];
  return allCombinations.map((combo) => buildPage(ctx, combo));
};

/** Build context object for page generation */
const buildContext = (slug, sortedProducts, combinations) => {
  const displayLookup = buildDisplayLookup(sortedProducts);
  return {
    slug,
    products: sortedProducts,
    baseUrl: `/categories/${slug}`,
    itemLookup: buildItemLookup(sortedProducts),
    displayLookup,
    filterData: {
      attributes: getAllFilterAttributes(sortedProducts),
      displayLookup,
    },
    pathLookup: buildPathLookup(combinations),
  };
};

/** Build listing UI for category main page */
const buildListingUI = (ctx, productCount) =>
  buildUIWithLookup(
    ctx.filterData,
    {},
    ctx.pathLookup,
    ctx.baseUrl,
    "default",
    productCount,
  );

/**
 * Build all filter data for a single category.
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
    pages: buildPages(ctx, combinations),
    attributes: ctx.filterData,
    listingUI: buildListingUI(ctx, sortedProducts.length),
    redirects: generateFilterRedirects(sortedProducts, `${ctx.baseUrl}/search`),
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

    const categoryData = mapFilter((category) =>
      buildCategoryData(category.fileSlug, grouped[category.fileSlug]),
    )(categories);

    return {
      pages: categoryData.flatMap((c) => c.pages),
      redirects: categoryData.flatMap((c) => c.redirects),
      attributes: Object.fromEntries(
        categoryData.map((c) => [c.slug, c.attributes]),
      ),
      listingUI: Object.fromEntries(
        categoryData.map((c) => [c.slug, c.listingUI]),
      ),
    };
  },
);

/**
 * Get all filtered category product pages.
 * @param {import("@11ty/eleventy").CollectionApi} collectionApi
 */
const filteredCategoryPages = (collectionApi) =>
  computeAllCategoryData(collectionApi).pages;

/**
 * Get filter attributes for each category.
 * @param {import("@11ty/eleventy").CollectionApi} collectionApi
 */
const createCategoryFilterAttributes = (collectionApi) =>
  computeAllCategoryData(collectionApi).attributes;

/**
 * Get redirects for invalid filter paths.
 * @param {import("@11ty/eleventy").CollectionApi} collectionApi
 */
const createCategoryFilterRedirects = (collectionApi) =>
  computeAllCategoryData(collectionApi).redirects;

/**
 * Get filter UI for category listing pages.
 * @param {import("@11ty/eleventy").CollectionApi} collectionApi
 */
const categoryListingUI = (collectionApi) =>
  computeAllCategoryData(collectionApi).listingUI;

/**
 * Build category-scoped filter UI data for templates.
 * Used when rendering filter UI on filtered-category-products pages.
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
  if (!filterData) return { hasFilters: false };

  const categoryPages = pagesByCategory(filteredPages)[categorySlug];
  if (!categoryPages) return { hasFilters: false };

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

export {
  categoryFilterData,
  filteredCategoryPages,
  createCategoryFilterAttributes,
  createCategoryFilterRedirects,
  categoryListingUI,
};
