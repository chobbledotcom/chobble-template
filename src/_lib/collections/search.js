import { buildReverseIndex } from "#utils/grouping.js";
import { memoize } from "#utils/memoize.js";

/**
 * Normalize a category path to a search keyword
 * Handles full paths like "/categories/premium-widgets.md"
 */
const normaliseCategory = (category) => {
  return category
    .replace(/^\/categories\//, "")
    .replace(/\.md$/, "")
    .replace(/-/g, " ");
};

/**
 * Build a memoized reverse index: keyword -> [products]
 *
 * @param {import("#lib/types").EleventyCollectionItem[]} products - Products collection
 * @returns {Map<string, import("#lib/types").EleventyCollectionItem[]>} Keyword to products map
 *
 * Eleventy guarantees: Collection items always have a `data` property.
 * Therefore, no optional chaining needed on `product.data`.
 * See: src/_lib/types/index.d.ts EleventyCollectionItem type definition
 */
const buildProductKeywordMap = memoize((products) =>
  buildReverseIndex(products, (product) => {
    const explicitKeywords = product.data.keywords || [];
    const categoryKeywords = (product.data.categories || []).map(
      normaliseCategory,
    );
    return [...new Set([...explicitKeywords, ...categoryKeywords])];
  }),
);

const getAllKeywords = (products) =>
  [...buildProductKeywordMap(products).keys()].sort();

const getProductsByKeyword = (products, keyword) => {
  if (!keyword) return [];
  return buildProductKeywordMap(products).get(keyword) || [];
};

const createSearchKeywordsCollection = (collectionApi) => {
  const products = collectionApi.getFilteredByTag("products");
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

export { configureSearch };
