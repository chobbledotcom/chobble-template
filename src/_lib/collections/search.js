import { buildReverseIndex } from "#utils/grouping.js";
import { memoize } from "#utils/memoize.js";

/**
 * Normalize a category path to a search keyword
 * Handles full paths like "/categories/premium-widgets.md"
 */
const normaliseCategory = (category) => {
  if (!category) return "";
  return category
    .replace(/^\/categories\//, "")
    .replace(/\.md$/, "")
    .replace(/-/g, " ");
};

/**
 * Build a memoized reverse index: keyword -> [products]
 */
const buildProductKeywordMap = memoize((products) =>
  buildReverseIndex(products, (product) => {
    const explicitKeywords = product.data?.keywords || [];
    const categoryKeywords = (product.data?.categories || []).map(
      normaliseCategory,
    );
    return [...new Set([...explicitKeywords, ...categoryKeywords])];
  }),
);

const getAllKeywords = (products) =>
  [...buildProductKeywordMap(products).keys()].sort();

const getProductsByKeyword = (products, keyword) => {
  if (!products || !keyword) return [];
  return buildProductKeywordMap(products).get(keyword) || [];
};

const createSearchKeywordsCollection = (collectionApi) => {
  const products = collectionApi.getFilteredByTag("product");
  return getAllKeywords(products);
};

const configureSearch = (eleventyConfig) => {
  eleventyConfig.addCollection(
    "searchKeywords",
    createSearchKeywordsCollection,
  );
  eleventyConfig.addFilter("getProductsByKeyword", getProductsByKeyword);
  eleventyConfig.addFilter("getAllKeywords", getAllKeywords);
};

export {
  normaliseCategory,
  getAllKeywords,
  getProductsByKeyword,
  createSearchKeywordsCollection,
  configureSearch,
};
