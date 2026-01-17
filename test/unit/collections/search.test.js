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
      { data: { title: "Product 1", categories: [] } },
      { data: { title: "Product 2", keywords: null, categories: [] } },
    ];

    expect(getAllKeywords(products)).toEqual([]);
  });

  test("Extracts and sorts keywords from products", () => {
    const { getAllKeywords } = createConfiguredMock();
    const products = [
      {
        data: {
          title: "Product 1",
          keywords: ["widgets", "blue"],
          categories: [],
        },
      },
      {
        data: {
          title: "Product 2",
          keywords: ["gadgets", "red"],
          categories: [],
        },
      },
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
      {
        data: {
          title: "Product 1",
          keywords: ["portable", "blue"],
          categories: [],
        },
      },
      {
        data: {
          title: "Product 2",
          keywords: ["portable", "red"],
          categories: [],
        },
      },
      { data: { title: "Product 3", keywords: ["portable"], categories: [] } },
    ];

    expect(getAllKeywords(products)).toEqual(["blue", "portable", "red"]);
  });

  test("Handles mix of products with and without keywords", () => {
    const { getAllKeywords } = createConfiguredMock();
    const products = [
      { data: { title: "Product 1", keywords: ["alpha"], categories: [] } },
      { data: { title: "Product 2", categories: [] } },
      { data: { title: "Product 3", keywords: ["beta"], categories: [] } },
      { data: { title: "Product 4", keywords: null, categories: [] } },
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
      {
        data: {
          title: "Widget A",
          keywords: ["portable", "blue"],
          categories: [],
        },
      },
      {
        data: {
          title: "Widget B",
          keywords: ["stationary", "blue"],
          categories: [],
        },
      },
      {
        data: {
          title: "Widget C",
          keywords: ["portable", "red"],
          categories: [],
        },
      },
    ];

    const result = getProductsByKeyword(products, "portable");

    expectResultTitles(result, ["Widget A", "Widget C"]);
  });

  test("Returns empty array when no products match", () => {
    const { getProductsByKeyword } = createConfiguredMock();
    const products = [
      { data: { title: "Product 1", keywords: ["alpha"], categories: [] } },
      { data: { title: "Product 2", keywords: ["beta"], categories: [] } },
    ];

    expect(getProductsByKeyword(products, "gamma")).toEqual([]);
  });

  test("Handles products without keywords field", () => {
    const { getProductsByKeyword } = createConfiguredMock();
    const products = [
      { data: { title: "Product 1", categories: [] } },
      { data: { title: "Product 2", keywords: ["test"], categories: [] } },
      { data: { title: "Product 3", keywords: null, categories: [] } },
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
          {
            data: {
              title: "Product 1",
              keywords: ["zebra", "apple"],
              categories: [],
            },
          },
          {
            data: { title: "Product 2", keywords: ["banana"], categories: [] },
          },
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
        { data: { title: "Product 1", categories: [] } },
        { data: { title: "Product 2", categories: [] } },
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
