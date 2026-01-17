import { describe, expect, test } from "bun:test";
import { configureSearch } from "#collections/search.js";
import {
  createMockEleventyConfig,
  data,
  expectResultTitles,
} from "#test/test-utils.js";

// ============================================
// Curried Data Factories
// ============================================

/** Product with keywords and default empty categories */
const product = data({ categories: [] })("title", "keywords");

/** Product with categories (for category-based keyword tests) */
const productWithCats = data({})("title", "keywords", "categories");

// Create configured mock and extract registered collection/filters
const createSearchMock = () => {
  const mockConfig = createMockEleventyConfig();
  configureSearch(mockConfig);
  return {
    mockConfig,
    searchKeywordsCollection: mockConfig.collections.searchKeywords,
    getAllKeywords: mockConfig.filters.getAllKeywords,
    getProductsByKeyword: mockConfig.filters.getProductsByKeyword,
  };
};

describe("search", () => {
  test("Returns empty array for empty products array", () => {
    const { getAllKeywords } = createSearchMock();
    expect(getAllKeywords([])).toEqual([]);
  });

  test("Returns empty array when products have no keywords", () => {
    const { getAllKeywords } = createSearchMock();
    const products = product(["Product 1", undefined], ["Product 2", null]);

    expect(getAllKeywords(products)).toEqual([]);
  });

  test("Extracts and sorts keywords from products", () => {
    const { getAllKeywords } = createSearchMock();
    const products = product(
      ["Product 1", ["widgets", "blue"]],
      ["Product 2", ["gadgets", "red"]],
    );

    expect(getAllKeywords(products)).toEqual([
      "blue",
      "gadgets",
      "red",
      "widgets",
    ]);
  });

  test("Deduplicates keywords across products", () => {
    const { getAllKeywords } = createSearchMock();
    const products = product(
      ["Product 1", ["portable", "blue"]],
      ["Product 2", ["portable", "red"]],
      ["Product 3", ["portable"]],
    );

    expect(getAllKeywords(products)).toEqual(["blue", "portable", "red"]);
  });

  test("Handles mix of products with and without keywords", () => {
    const { getAllKeywords } = createSearchMock();
    const products = product(
      ["Product 1", ["alpha"]],
      ["Product 2", undefined],
      ["Product 3", ["beta"]],
      ["Product 4", null],
    );

    expect(getAllKeywords(products)).toEqual(["alpha", "beta"]);
  });

  test("Returns empty array for missing keyword", () => {
    const { getProductsByKeyword } = createSearchMock();
    // null/undefined/empty keyword returns empty array
    // Note: null/undefined products will throw - we don't swallow those errors
    expect(getProductsByKeyword([], null)).toEqual([]);
    expect(getProductsByKeyword([], "")).toEqual([]);
  });

  test("Filters products by keyword", () => {
    const { getProductsByKeyword } = createSearchMock();
    const products = product(
      ["Widget A", ["portable", "blue"]],
      ["Widget B", ["stationary", "blue"]],
      ["Widget C", ["portable", "red"]],
    );

    const result = getProductsByKeyword(products, "portable");

    expectResultTitles(result, ["Widget A", "Widget C"]);
  });

  test("Returns empty array when no products match", () => {
    const { getProductsByKeyword } = createSearchMock();
    const products = product(["Product 1", ["alpha"]], ["Product 2", ["beta"]]);

    expect(getProductsByKeyword(products, "gamma")).toEqual([]);
  });

  test("Handles products without keywords field", () => {
    const { getProductsByKeyword } = createSearchMock();
    const products = product(
      ["Product 1", undefined],
      ["Product 2", ["test"]],
      ["Product 3", null],
    );

    const result = getProductsByKeyword(products, "test");

    expectResultTitles(result, ["Product 2"]);
  });

  test("Creates collection of unique keywords from products", () => {
    const { searchKeywordsCollection } = createSearchMock();
    const mockCollectionApi = {
      getFilteredByTag: (tag) => {
        expect(tag).toBe("products");
        return product(
          ["Product 1", ["zebra", "apple"]],
          ["Product 2", ["banana"]],
        );
      },
    };

    const result = searchKeywordsCollection(mockCollectionApi);

    expect(result).toEqual(["apple", "banana", "zebra"]);
  });

  test("Returns empty array when no products have keywords", () => {
    const { searchKeywordsCollection } = createSearchMock();
    const mockCollectionApi = {
      getFilteredByTag: () =>
        product(["Product 1", undefined], ["Product 2", undefined]),
    };

    const result = searchKeywordsCollection(mockCollectionApi);

    expect(result).toEqual([]);
  });

  test("Configures search collection and filters", () => {
    const mockConfig = createMockEleventyConfig();

    configureSearch(mockConfig);

    expect(typeof mockConfig.collections.searchKeywords).toBe("function");
    expect(typeof mockConfig.filters.getProductsByKeyword).toBe("function");
    expect(typeof mockConfig.filters.getAllKeywords).toBe("function");
  });

  test("Extracts keywords from product categories", () => {
    const { getAllKeywords } = createSearchMock();
    const products = productWithCats(
      ["Product 1", undefined, ["/categories/premium-widgets.md"]],
      ["Product 2", undefined, ["/categories/basic-gadgets.md", "simple"]],
    );

    const keywords = getAllKeywords(products);

    expect(keywords).toEqual(["basic gadgets", "premium widgets", "simple"]);
  });

  test("Finds products by normalized category name", () => {
    const { getProductsByKeyword } = createSearchMock();
    const products = productWithCats(
      ["Widget Pro", undefined, ["/categories/premium-widgets.md"]],
      ["Basic Widget", undefined, ["/categories/basic-widgets.md"]],
    );

    const result = getProductsByKeyword(products, "premium widgets");

    expectResultTitles(result, ["Widget Pro"]);
  });

  test("Combines explicit keywords with category-derived keywords", () => {
    const { getAllKeywords } = createSearchMock();
    const products = productWithCats([
      "Product 1",
      ["sale", "featured"],
      ["/categories/premium.md"],
    ]);

    const keywords = getAllKeywords(products);

    expect(keywords).toEqual(["featured", "premium", "sale"]);
  });
});
