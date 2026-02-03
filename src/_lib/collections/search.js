import { map, pipe, unique } from "#toolkit/fp/array.js";
import { buildReverseIndex } from "#toolkit/fp/grouping.js";
import { memoizeByRef } from "#toolkit/fp/memoize.js";

/**
 * Build a memoized reverse index: keyword -> [products]
 *
 * @param {import("#lib/types").ProductCollectionItem[]} products - Products collection
 * @returns {Map<string, import("#lib/types").ProductCollectionItem[]>} Keyword to products map
 *
 * Eleventy guarantees: Collection items always have a `data` property.
 * Therefore, no optional chaining needed on `product.data`.
 * See: src/_lib/types/index.d.ts EleventyCollectionItem type definition
 */
const buildProductKeywordMap = memoizeByRef((products) =>
  buildReverseIndex(products, (product) =>
    pipe(
      // Normalize category paths to keywords: /categories/foo-bar.md -> foo bar
      map((c) =>
        c
          .replace(/^\/categories\//, "")
          .replace(/\.md$/, "")
          .replace(/-/g, " "),
      ),
      (categoryKeywords) => [
        product.data.title.toLowerCase(),
        ...product.data.keywords.map((k) => k.toLowerCase()),
        ...categoryKeywords,
      ],
      unique,
    )(product.data.categories),
  ),
);

/**
 * Build a memoized reverse index: keyword -> [categories]
 *
 * @param {import("#lib/types").CategoryCollectionItem[]} categories - Categories collection
 * @returns {Map<string, import("#lib/types").CategoryCollectionItem[]>} Keyword to categories map
 */
const buildCategoryKeywordMap = memoizeByRef((categories) =>
  buildReverseIndex(categories, (category) =>
    unique([
      category.data.title.toLowerCase(),
      ...category.data.keywords.map((k) => k.toLowerCase()),
    ]),
  ),
);

/**
 * Get all unique keywords from both products and categories, sorted alphabetically.
 * @param {import("#lib/types").ProductCollectionItem[]} products
 * @param {import("#lib/types").CategoryCollectionItem[]} categories
 * @returns {string[]}
 */
const getAllKeywords = (products, categories) =>
  unique([
    ...buildProductKeywordMap(products).keys(),
    ...buildCategoryKeywordMap(categories).keys(),
  ]).sort((a, b) => a.localeCompare(b));

/**
 * Get products matching a keyword.
 * @param {import("#lib/types").ProductCollectionItem[]} products
 * @param {string} keyword
 * @returns {import("#lib/types").ProductCollectionItem[]}
 */
const getProductsByKeyword = (products, keyword) => {
  if (!keyword) return [];
  return buildProductKeywordMap(products).get(keyword) || [];
};

/**
 * Get items (products and categories) matching a keyword.
 * @param {import("#lib/types").ProductCollectionItem[]} products
 * @param {import("#lib/types").CategoryCollectionItem[]} categories
 * @param {string} keyword
 * @returns {import("#lib/types").EleventyCollectionItem[]}
 */
const getItemsByKeyword = (products, categories, keyword) => {
  if (!keyword) return [];
  const matchingProducts = buildProductKeywordMap(products).get(keyword) || [];
  const matchingCategories =
    buildCategoryKeywordMap(categories).get(keyword) || [];
  return [...matchingCategories, ...matchingProducts];
};

const configureSearch = (eleventyConfig) => {
  eleventyConfig.addCollection("searchKeywords", (collectionApi) =>
    getAllKeywords(
      collectionApi.getFilteredByTag("products"),
      collectionApi.getFilteredByTag("categories"),
    ),
  );
  eleventyConfig.addFilter("getProductsByKeyword", getProductsByKeyword);
  eleventyConfig.addFilter("getAllKeywords", getAllKeywords);
  eleventyConfig.addFilter("getItemsByKeyword", getItemsByKeyword);
};

export { configureSearch };
