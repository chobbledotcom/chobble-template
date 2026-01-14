import { describe, expect, test } from "bun:test";
import { configureSearch } from "#collections/search.js";
import {
  createMockEleventyConfig,
  expectResultTitles,
} from "#test/test-utils.js";

// Create configured mock and extract registered collection/filters
const createConfiguredMock = () => {
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
    const { getAllKeywords } = createConfiguredMock();
    expect(getAllKeywords([])).toEqual([]);
  });

  test("Returns empty array when products have no keywords", () => {
    const { getAllKeywords } = createConfiguredMock();
    const products = [
      { data: { title: "Product 1" } },
      { data: { title: "Product 2", keywords: null } },
    ];

    expect(getAllKeywords(products)).toEqual([]);
  });

  test("Extracts and sorts keywords from products", () => {
    const { getAllKeywords } = createConfiguredMock();
    const products = [
      { data: { title: "Product 1", keywords: ["widgets", "blue"] } },
      { data: { title: "Product 2", keywords: ["gadgets", "red"] } },
    ];

    expect(getAllKeywords(products)).toEqual([
      "blue",
      "gadgets",
      "red",
      "widgets",
    ]);
  });

  test("Deduplicates keywords across products", () => {
    const { getAllKeywords } = createConfiguredMock();
    const products = [
      { data: { title: "Product 1", keywords: ["portable", "blue"] } },
      { data: { title: "Product 2", keywords: ["portable", "red"] } },
      { data: { title: "Product 3", keywords: ["portable"] } },
    ];

    expect(getAllKeywords(products)).toEqual(["blue", "portable", "red"]);
  });

  test("Handles mix of products with and without keywords", () => {
    const { getAllKeywords } = createConfiguredMock();
    const products = [
      { data: { title: "Product 1", keywords: ["alpha"] } },
      { data: { title: "Product 2" } },
      { data: { title: "Product 3", keywords: ["beta"] } },
      { data: { title: "Product 4", keywords: null } },
    ];

    expect(getAllKeywords(products)).toEqual(["alpha", "beta"]);
  });

  test("Returns empty array for missing keyword", () => {
    const { getProductsByKeyword } = createConfiguredMock();
    // null/undefined/empty keyword returns empty array
    // Note: null/undefined products will throw - we don't swallow those errors
    expect(getProductsByKeyword([], null)).toEqual([]);
    expect(getProductsByKeyword([], "")).toEqual([]);
  });

  test("Filters products by keyword", () => {
    const { getProductsByKeyword } = createConfiguredMock();
    const products = [
      { data: { title: "Product 1", keywords: ["portable", "blue"] } },
      { data: { title: "Product 2", keywords: ["stationary", "blue"] } },
      { data: { title: "Product 3", keywords: ["portable", "red"] } },
    ];

    const result = getProductsByKeyword(products, "portable");

    expectResultTitles(result, ["Product 1", "Product 3"]);
  });

  test("Returns empty array when no products match", () => {
    const { getProductsByKeyword } = createConfiguredMock();
    const products = [
      { data: { title: "Product 1", keywords: ["alpha"] } },
      { data: { title: "Product 2", keywords: ["beta"] } },
    ];

    expect(getProductsByKeyword(products, "gamma")).toEqual([]);
  });

  test("Handles products without keywords field", () => {
    const { getProductsByKeyword } = createConfiguredMock();
    const products = [
      { data: { title: "Product 1" } },
      { data: { title: "Product 2", keywords: ["test"] } },
      { data: { title: "Product 3", keywords: null } },
    ];

    const result = getProductsByKeyword(products, "test");

    expectResultTitles(result, ["Product 2"]);
  });

  test("Creates collection of unique keywords from products", () => {
    const { searchKeywordsCollection } = createConfiguredMock();
    const mockCollectionApi = {
      getFilteredByTag: (tag) => {
        expect(tag).toBe("products");
        return [
          { data: { title: "Product 1", keywords: ["zebra", "apple"] } },
          { data: { title: "Product 2", keywords: ["banana"] } },
        ];
      },
    };

    const result = searchKeywordsCollection(mockCollectionApi);

    expect(result).toEqual(["apple", "banana", "zebra"]);
  });

  test("Returns empty array when no products have keywords", () => {
    const { searchKeywordsCollection } = createConfiguredMock();
    const mockCollectionApi = {
      getFilteredByTag: () => [
        { data: { title: "Product 1" } },
        { data: { title: "Product 2" } },
      ],
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
    const { getAllKeywords } = createConfiguredMock();
    const products = [
      {
        data: {
          title: "Product 1",
          categories: ["/categories/premium-widgets.md"],
        },
      },
      {
        data: {
          title: "Product 2",
          categories: ["/categories/basic-gadgets.md", "simple"],
        },
      },
    ];

    const keywords = getAllKeywords(products);

    expect(keywords).toEqual(["basic gadgets", "premium widgets", "simple"]);
  });

  test("Finds products by normalized category name", () => {
    const { getProductsByKeyword } = createConfiguredMock();
    const products = [
      {
        data: {
          title: "Widget Pro",
          categories: ["/categories/premium-widgets.md"],
        },
      },
      {
        data: {
          title: "Basic Widget",
          categories: ["/categories/basic-widgets.md"],
        },
      },
    ];

    const result = getProductsByKeyword(products, "premium widgets");

    expectResultTitles(result, ["Widget Pro"]);
  });

  test("Combines explicit keywords with category-derived keywords", () => {
    const { getAllKeywords } = createConfiguredMock();
    const products = [
      {
        data: {
          title: "Product 1",
          keywords: ["sale", "featured"],
          categories: ["/categories/premium.md"],
        },
      },
    ];

    const keywords = getAllKeywords(products);

    expect(keywords).toEqual(["featured", "premium", "sale"]);
  });
});
