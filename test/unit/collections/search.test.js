import { describe, expect, test } from "bun:test";
import { configureSearch } from "#collections/search.js";
import {
  createMockEleventyConfig,
  data,
  expectResultTitles,
  withConfiguredMock,
} from "#test/test-utils.js";

/** Product with keywords and default empty categories */
const product = data({ categories: [], keywords: [] })("title", "keywords");

/** Product with categories (for category-based keyword tests) */
const productWithCats = data({ keywords: [] })(
  "title",
  "keywords",
  "categories",
);

// Extract filters/collections once - pure functions, safe to reuse
const { filters, collections } = withConfiguredMock(configureSearch)();
const { getAllKeywords, getProductsByKeyword } = filters;
const { searchKeywords } = collections;

describe("search", () => {
  test("Returns empty array for empty products array", () => {
    expect(getAllKeywords([])).toEqual([]);
  });

  test("Includes product names as keywords even when no explicit keywords", () => {
    const products = product(["Product 1", []], ["Product 2", []]);
    expect(getAllKeywords(products)).toEqual(["product 1", "product 2"]);
  });

  test("Extracts and sorts keywords from products including names", () => {
    const products = product(
      ["Product 1", ["widgets", "blue"]],
      ["Product 2", ["gadgets", "red"]],
    );
    expect(getAllKeywords(products)).toEqual([
      "blue",
      "gadgets",
      "product 1",
      "product 2",
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
    expect(getAllKeywords(products)).toEqual([
      "blue",
      "portable",
      "product 1",
      "product 2",
      "product 3",
      "red",
    ]);
  });

  test("Lowercases and alphabetises mixed-case keywords", () => {
    const products = product(
      ["Zebra Widget", ["Blue", "ALPHA"]],
      ["Apple Gadget", ["cherry"]],
    );
    expect(getAllKeywords(products)).toEqual([
      "alpha",
      "apple gadget",
      "blue",
      "cherry",
      "zebra widget",
    ]);
  });

  test("Handles mix of products with and without keywords", () => {
    const products = product(
      ["Product 1", ["alpha"]],
      ["Product 2", []],
      ["Product 3", ["beta"]],
      ["Product 4", []],
    );
    expect(getAllKeywords(products)).toEqual([
      "alpha",
      "beta",
      "product 1",
      "product 2",
      "product 3",
      "product 4",
    ]);
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

  test("Finds product by keyword when others have none", () => {
    const products = product(
      ["Product 1", []],
      ["Product 2", ["test"]],
      ["Product 3", []],
    );
    expectResultTitles(getProductsByKeyword(products, "test"), ["Product 2"]);
  });

  test("Finds products by their lowercased name", () => {
    const products = product(
      ["Widget Pro", ["portable"]],
      ["Gadget Max", ["stationary"]],
    );
    expectResultTitles(getProductsByKeyword(products, "widget pro"), [
      "Widget Pro",
    ]);
    expectResultTitles(getProductsByKeyword(products, "gadget max"), [
      "Gadget Max",
    ]);
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
      "product 1",
      "product 2",
      "zebra",
    ]);
  });

  test("Returns product names when no explicit keywords", () => {
    const mockCollectionApi = {
      getFilteredByTag: () => product(["Product 1", []], ["Product 2", []]),
    };
    expect(searchKeywords(mockCollectionApi)).toEqual([
      "product 1",
      "product 2",
    ]);
  });

  test("Configures search collection and filters", () => {
    const mockConfig = createMockEleventyConfig();
    configureSearch(mockConfig);

    expect(typeof mockConfig.collections.searchKeywords).toBe("function");
    expect(typeof mockConfig.filters.getProductsByKeyword).toBe("function");
    expect(typeof mockConfig.filters.getAllKeywords).toBe("function");
  });

  test("Extracts keywords from product categories and names", () => {
    const products = productWithCats(
      ["Product 1", [], ["/categories/premium-widgets.md"]],
      ["Product 2", [], ["/categories/basic-gadgets.md", "simple"]],
    );
    expect(getAllKeywords(products)).toEqual([
      "basic gadgets",
      "premium widgets",
      "product 1",
      "product 2",
      "simple",
    ]);
  });

  test("Finds products by normalized category name", () => {
    const products = productWithCats(
      ["Widget Pro", [], ["/categories/premium-widgets.md"]],
      ["Basic Widget", [], ["/categories/basic-widgets.md"]],
    );
    expectResultTitles(getProductsByKeyword(products, "premium widgets"), [
      "Widget Pro",
    ]);
  });

  test("Finds products by name via category-based search", () => {
    const products = productWithCats(
      ["Widget Pro", [], ["/categories/widgets.md"]],
      ["Gadget Max", [], ["/categories/gadgets.md"]],
    );
    expectResultTitles(getProductsByKeyword(products, "widget pro"), [
      "Widget Pro",
    ]);
  });

  test("Combines product name, explicit keywords, and category-derived keywords", () => {
    const products = productWithCats([
      "Product 1",
      ["sale", "featured"],
      ["/categories/premium.md"],
    ]);
    expect(getAllKeywords(products)).toEqual([
      "featured",
      "premium",
      "product 1",
      "sale",
    ]);
  });
});
