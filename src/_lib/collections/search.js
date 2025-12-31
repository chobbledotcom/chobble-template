import { memoize } from "#utils/memoize.js";

const normaliseCategory = (category) => {
  if (!category) return "";
  // Handle full paths like "/categories/premium-widgets.md"
  // and convert hyphens to spaces
  return category
    .replace(/^\/categories\//, "")
    .replace(/\.md$/, "")
    .replace(/-/g, " ");
};

// Build a memoized reverse index: keyword -> [products]
// This avoids repeated nested loops when searching by keyword
const buildProductKeywordMap = memoize((products) => {
  const keywordProducts = new Map();

  for (const product of products) {
    const productKeywords = new Set();

    // Add explicit keywords
    const keywords = product.data?.keywords;
    if (keywords) {
      for (const kw of keywords) {
        productKeywords.add(kw);
      }
    }

    // Add normalized categories as keywords
    const categories = product.data?.categories;
    if (categories) {
      for (const cat of categories) {
        productKeywords.add(normaliseCategory(cat));
      }
    }

    // Build reverse index
    for (const kw of productKeywords) {
      if (!keywordProducts.has(kw)) {
        keywordProducts.set(kw, []);
      }
      keywordProducts.get(kw).push(product);
    }
  }

  return keywordProducts;
});

const getAllKeywords = (products) => {
  if (!products) return [];
  const map = buildProductKeywordMap(products);
  return Array.from(map.keys()).sort();
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
