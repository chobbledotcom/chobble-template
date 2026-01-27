import { describe, expect, test } from "bun:test";
import { configureSearch } from "#collections/search.js";
import {
  createMockEleventyConfig,
  data,
  expectResultTitles,
  withConfiguredMock,
} from "#test/test-utils.js";

// ============================================
// Curried Data Factories
// ============================================

/** Product with keywords and default empty categories */
const product = data({ categories: [] })("title", "keywords");

/** Product with categories (for category-based keyword tests) */
const productWithCats = data({})("title", "keywords", "categories");

// Create configured mock using curried helper
const createSearchMock = withConfiguredMock(configureSearch);

describe("search", () => {
  test("Returns empty array for empty products array", () => {
    const { filters } = createSearchMock();
    expect(filters.getAllKeywords([])).toEqual([]);
  });

  test("Returns empty array when products have no keywords", () => {
    const { filters } = createSearchMock();
    const products = product(["Product 1", undefined], ["Product 2", null]);

    expect(filters.getAllKeywords(products)).toEqual([]);
  });

  test("Extracts and sorts keywords from products", () => {
    const { filters } = createSearchMock();
    const products = product(
      ["Product 1", ["widgets", "blue"]],
      ["Product 2", ["gadgets", "red"]],
    );

    expect(filters.getAllKeywords(products)).toEqual([
      "blue",
      "gadgets",
      "red",
      "widgets",
    ]);
  });

  test("Deduplicates keywords across products", () => {
    const { filters } = createSearchMock();
    const products = product(
      ["Product 1", ["portable", "blue"]],
      ["Product 2", ["portable", "red"]],
      ["Product 3", ["portable"]],
    );

    expect(filters.getAllKeywords(products)).toEqual([
      "blue",
      "portable",
      "red",
    ]);
  });

  test("Handles mix of products with and without keywords", () => {
    const { filters } = createSearchMock();
    const products = product(
      ["Product 1", ["alpha"]],
      ["Product 2", undefined],
      ["Product 3", ["beta"]],
      ["Product 4", null],
    );

    expect(filters.getAllKeywords(products)).toEqual(["alpha", "beta"]);
  });

  test("Returns empty array for missing keyword", () => {
    const { filters } = createSearchMock();
    // null/undefined/empty keyword returns empty array
    // Note: null/undefined products will throw - we don't swallow those errors
    expect(filters.getProductsByKeyword([], null)).toEqual([]);
    expect(filters.getProductsByKeyword([], "")).toEqual([]);
  });

  test("Filters products by keyword", () => {
    const { filters } = createSearchMock();
    const products = product(
      ["Widget A", ["portable", "blue"]],
      ["Widget B", ["stationary", "blue"]],
      ["Widget C", ["portable", "red"]],
    );

    const result = filters.getProductsByKeyword(products, "portable");

    expectResultTitles(result, ["Widget A", "Widget C"]);
  });

  test("Returns empty array when no products match", () => {
    const { filters } = createSearchMock();
    const products = product(["Product 1", ["alpha"]], ["Product 2", ["beta"]]);

    expect(filters.getProductsByKeyword(products, "gamma")).toEqual([]);
  });

  test("Handles products without keywords field", () => {
    const { filters } = createSearchMock();
    const products = product(
      ["Product 1", undefined],
      ["Product 2", ["test"]],
      ["Product 3", null],
    );

    const result = filters.getProductsByKeyword(products, "test");

    expectResultTitles(result, ["Product 2"]);
  });

  test("Creates collection of unique keywords from products", () => {
    const { collections } = createSearchMock();
    const mockCollectionApi = {
      getFilteredByTag: (tag) => {
        expect(tag).toBe("products");
        return product(
          ["Product 1", ["zebra", "apple"]],
          ["Product 2", ["banana"]],
        );
      },
    };

    const result = collections.searchKeywords(mockCollectionApi);

    expect(result).toEqual(["apple", "banana", "zebra"]);
  });

  test("Returns empty array when no products have keywords", () => {
    const { collections } = createSearchMock();
    const mockCollectionApi = {
      getFilteredByTag: () =>
        product(["Product 1", undefined], ["Product 2", undefined]),
    };

    const result = collections.searchKeywords(mockCollectionApi);

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
    const { filters } = createSearchMock();
    const products = productWithCats(
      ["Product 1", undefined, ["/categories/premium-widgets.md"]],
      ["Product 2", undefined, ["/categories/basic-gadgets.md", "simple"]],
    );

    const keywords = filters.getAllKeywords(products);

    expect(keywords).toEqual(["basic gadgets", "premium widgets", "simple"]);
  });

  test("Finds products by normalized category name", () => {
    const { filters } = createSearchMock();
    const products = productWithCats(
      ["Widget Pro", undefined, ["/categories/premium-widgets.md"]],
      ["Basic Widget", undefined, ["/categories/basic-widgets.md"]],
    );

    const result = filters.getProductsByKeyword(products, "premium widgets");

    expectResultTitles(result, ["Widget Pro"]);
  });

  test("Combines explicit keywords with category-derived keywords", () => {
    const { filters } = createSearchMock();
    const products = productWithCats([
      "Product 1",
      ["sale", "featured"],
      ["/categories/premium.md"],
    ]);

    const keywords = filters.getAllKeywords(products);

    expect(keywords).toEqual(["featured", "premium", "sale"]);
  });
});
