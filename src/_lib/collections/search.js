import { map, pipe, unique } from "#utils/array-utils.js";
import { buildReverseIndex } from "#utils/grouping.js";
import { memoize } from "#utils/memoize.js";

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
        ...(product.data.keywords || []),
        ...categoryKeywords,
      ],
      unique,
    )(product.data.categories || []),
  ),
);

const getAllKeywords = (products) =>
  [...buildProductKeywordMap(products).keys()].sort();

const getProductsByKeyword = (products, keyword) => {
  if (!keyword) return [];
  return buildProductKeywordMap(products).get(keyword) || [];
};

const configureSearch = (eleventyConfig) => {
  eleventyConfig.addCollection("searchKeywords", (collectionApi) =>
    getAllKeywords(collectionApi.getFilteredByTag("products")),
  );
  eleventyConfig.addFilter("getProductsByKeyword", getProductsByKeyword);
  eleventyConfig.addFilter("getAllKeywords", getAllKeywords);
};

export { configureSearch };
