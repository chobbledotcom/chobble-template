import { describe, expect, test } from "bun:test";
import { configureSearch } from "#collections/search.js";
import {
  createMockEleventyConfig,
  data,
  expectResultTitles,
  withConfiguredMock,
} from "#test/test-utils.js";

/** Product with keywords and default empty categories */
const product = data({ categories: [] })("title", "keywords");

/** Product with categories (for category-based keyword tests) */
const productWithCats = data({})("title", "keywords", "categories");

// Extract filters/collections once - pure functions, safe to reuse
const { filters, collections } = withConfiguredMock(configureSearch)();
const { getAllKeywords, getProductsByKeyword } = filters;
const { searchKeywords } = collections;

describe("search", () => {
  test("Returns empty array for empty products array", () => {
    expect(getAllKeywords([])).toEqual([]);
  });

  test("Returns empty array when products have no keywords", () => {
    const products = product(["Product 1", undefined], ["Product 2", null]);
    expect(getAllKeywords(products)).toEqual([]);
  });

  test("Extracts and sorts keywords from products", () => {
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
    const products = product(
      ["Product 1", ["portable", "blue"]],
      ["Product 2", ["portable", "red"]],
      ["Product 3", ["portable"]],
    );
    expect(getAllKeywords(products)).toEqual(["blue", "portable", "red"]);
  });

  test("Handles mix of products with and without keywords", () => {
    const products = product(
      ["Product 1", ["alpha"]],
      ["Product 2", undefined],
      ["Product 3", ["beta"]],
      ["Product 4", null],
    );
    expect(getAllKeywords(products)).toEqual(["alpha", "beta"]);
  });

  test("Returns empty array for missing keyword", () => {
    expect(getProductsByKeyword([], null)).toEqual([]);
    expect(getProductsByKeyword([], "")).toEqual([]);
  });

  test("Filters products by keyword", () => {
    const products = product(
      ["Widget A", ["portable", "blue"]],
      ["Widget B", ["stationary", "blue"]],
      ["Widget C", ["portable", "red"]],
    );
    expectResultTitles(getProductsByKeyword(products, "portable"), [
      "Widget A",
      "Widget C",
    ]);
  });

  test("Returns empty array when no products match", () => {
    const products = product(["Product 1", ["alpha"]], ["Product 2", ["beta"]]);
    expect(getProductsByKeyword(products, "gamma")).toEqual([]);
  });

  test("Handles products without keywords field", () => {
    const products = product(
      ["Product 1", undefined],
      ["Product 2", ["test"]],
      ["Product 3", null],
    );
    expectResultTitles(getProductsByKeyword(products, "test"), ["Product 2"]);
  });

  test("Creates collection of unique keywords from products", () => {
    const mockCollectionApi = {
      getFilteredByTag: (tag) => {
        expect(tag).toBe("products");
        return product(
          ["Product 1", ["zebra", "apple"]],
          ["Product 2", ["banana"]],
        );
      },
    };
    expect(searchKeywords(mockCollectionApi)).toEqual([
      "apple",
      "banana",
      "zebra",
    ]);
  });

  test("Returns empty array when no products have keywords", () => {
    const mockCollectionApi = {
      getFilteredByTag: () =>
        product(["Product 1", undefined], ["Product 2", undefined]),
    };
    expect(searchKeywords(mockCollectionApi)).toEqual([]);
  });

  test("Configures search collection and filters", () => {
    const mockConfig = createMockEleventyConfig();
    configureSearch(mockConfig);

    expect(typeof mockConfig.collections.searchKeywords).toBe("function");
    expect(typeof mockConfig.filters.getProductsByKeyword).toBe("function");
    expect(typeof mockConfig.filters.getAllKeywords).toBe("function");
  });

  test("Extracts keywords from product categories", () => {
    const products = productWithCats(
      ["Product 1", undefined, ["/categories/premium-widgets.md"]],
      ["Product 2", undefined, ["/categories/basic-gadgets.md", "simple"]],
    );
    expect(getAllKeywords(products)).toEqual([
      "basic gadgets",
      "premium widgets",
      "simple",
    ]);
  });

  test("Finds products by normalized category name", () => {
    const products = productWithCats(
      ["Widget Pro", undefined, ["/categories/premium-widgets.md"]],
      ["Basic Widget", undefined, ["/categories/basic-widgets.md"]],
    );
    expectResultTitles(getProductsByKeyword(products, "premium widgets"), [
      "Widget Pro",
    ]);
  });

  test("Combines explicit keywords with category-derived keywords", () => {
    const products = productWithCats([
      "Product 1",
      ["sale", "featured"],
      ["/categories/premium.md"],
    ]);
    expect(getAllKeywords(products)).toEqual(["featured", "premium", "sale"]);
  });
});
