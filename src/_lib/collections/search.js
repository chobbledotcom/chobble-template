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
 * Extract all keywords from a product (explicit keywords + normalized categories)
 */
const getProductKeywords = (product) => {
  const explicitKeywords = product.data?.keywords || [];
  const categoryKeywords = (product.data?.categories || []).map(
    normaliseCategory,
  );
  return [...new Set([...explicitKeywords, ...categoryKeywords])];
};

/**
 * Build a memoized reverse index: keyword -> [products]
 * Uses flatMap to create (keyword, product) pairs, then reduce to group
 */
const buildProductKeywordMap = memoize((products) => {
  const pairs = products.flatMap((product) =>
    getProductKeywords(product).map((keyword) => ({ keyword, product })),
  );

  return pairs.reduce((map, { keyword, product }) => {
    const existing = map.get(keyword) || [];
    return new Map(map).set(keyword, [...existing, product]);
  }, new Map());
});

const getAllKeywords = (products) => {
  if (!products) return [];
  const map = buildProductKeywordMap(products);
  return [...map.keys()].sort();
};

const getProductsByKeyword = (products, keyword) => {
  if (!products || !keyword) return [];
  const map = buildProductKeywordMap(products);
  return map.get(keyword) || [];
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
