import {
  configureSearch,
  createSearchKeywordsCollection,
  getAllKeywords,
  getProductsByKeyword,
} from "#collections/search.js";
import {
  createMockEleventyConfig,
  createTestRunner,
  expectDeepEqual,
  expectFunctionType,
  expectStrictEqual,
} from "./test-utils.js";

const testCases = [
  {
    name: "getAllKeywords-empty",
    description: "Returns empty array for null/undefined/empty products",
    test: () => {
      expectDeepEqual(getAllKeywords(null), [], "Should return [] for null");
      expectDeepEqual(
        getAllKeywords(undefined),
        [],
        "Should return [] for undefined",
      );
      expectDeepEqual(
        getAllKeywords([]),
        [],
        "Should return [] for empty array",
      );
    },
  },
  {
    name: "getAllKeywords-no-keywords",
    description: "Returns empty array when products have no keywords",
    test: () => {
      const products = [
        { data: { title: "Product 1" } },
        { data: { title: "Product 2", keywords: null } },
      ];

      expectDeepEqual(
        getAllKeywords(products),
        [],
        "Should return [] when no products have keywords",
      );
    },
  },
  {
    name: "getAllKeywords-basic",
    description: "Extracts and sorts keywords from products",
    test: () => {
      const products = [
        { data: { title: "Product 1", keywords: ["widgets", "blue"] } },
        { data: { title: "Product 2", keywords: ["gadgets", "red"] } },
      ];

      expectDeepEqual(
        getAllKeywords(products),
        ["blue", "gadgets", "red", "widgets"],
        "Should return sorted unique keywords",
      );
    },
  },
  {
    name: "getAllKeywords-deduplication",
    description: "Deduplicates keywords across products",
    test: () => {
      const products = [
        { data: { title: "Product 1", keywords: ["portable", "blue"] } },
        { data: { title: "Product 2", keywords: ["portable", "red"] } },
        { data: { title: "Product 3", keywords: ["portable"] } },
      ];

      expectDeepEqual(
        getAllKeywords(products),
        ["blue", "portable", "red"],
        "Should deduplicate keywords",
      );
    },
  },
  {
    name: "getAllKeywords-mixed",
    description: "Handles mix of products with and without keywords",
    test: () => {
      const products = [
        { data: { title: "Product 1", keywords: ["alpha"] } },
        { data: { title: "Product 2" } },
        { data: { title: "Product 3", keywords: ["beta"] } },
        { data: { title: "Product 4", keywords: null } },
      ];

      expectDeepEqual(
        getAllKeywords(products),
        ["alpha", "beta"],
        "Should only collect keywords from products that have them",
      );
    },
  },
  {
    name: "getProductsByKeyword-empty",
    description: "Returns empty array for null/undefined inputs",
    test: () => {
      expectDeepEqual(
        getProductsByKeyword(null, "test"),
        [],
        "Should return [] for null products",
      );
      expectDeepEqual(
        getProductsByKeyword([], null),
        [],
        "Should return [] for null keyword",
      );
      expectDeepEqual(
        getProductsByKeyword([], ""),
        [],
        "Should return [] for empty keyword",
      );
    },
  },
  {
    name: "getProductsByKeyword-basic",
    description: "Filters products by keyword",
    test: () => {
      const products = [
        { data: { title: "Product 1", keywords: ["portable", "blue"] } },
        { data: { title: "Product 2", keywords: ["stationary", "blue"] } },
        { data: { title: "Product 3", keywords: ["portable", "red"] } },
      ];

      const result = getProductsByKeyword(products, "portable");

      expectStrictEqual(result.length, 2, "Should return 2 products");
      expectStrictEqual(
        result[0].data.title,
        "Product 1",
        "Should include first product",
      );
      expectStrictEqual(
        result[1].data.title,
        "Product 3",
        "Should include third product",
      );
    },
  },
  {
    name: "getProductsByKeyword-no-match",
    description: "Returns empty array when no products match",
    test: () => {
      const products = [
        { data: { title: "Product 1", keywords: ["alpha"] } },
        { data: { title: "Product 2", keywords: ["beta"] } },
      ];

      expectDeepEqual(
        getProductsByKeyword(products, "gamma"),
        [],
        "Should return [] when no products match",
      );
    },
  },
  {
    name: "getProductsByKeyword-no-keywords",
    description: "Handles products without keywords field",
    test: () => {
      const products = [
        { data: { title: "Product 1" } },
        { data: { title: "Product 2", keywords: ["test"] } },
        { data: { title: "Product 3", keywords: null } },
      ];

      const result = getProductsByKeyword(products, "test");

      expectStrictEqual(result.length, 1, "Should return 1 product");
      expectStrictEqual(
        result[0].data.title,
        "Product 2",
        "Should only include product with matching keyword",
      );
    },
  },
  {
    name: "createSearchKeywordsCollection-basic",
    description: "Creates collection of unique keywords from products",
    test: () => {
      const mockCollectionApi = {
        getFilteredByTag: (tag) => {
          expectStrictEqual(tag, "product", "Should filter by product tag");
          return [
            { data: { title: "Product 1", keywords: ["zebra", "apple"] } },
            { data: { title: "Product 2", keywords: ["banana"] } },
          ];
        },
      };

      const result = createSearchKeywordsCollection(mockCollectionApi);

      expectDeepEqual(
        result,
        ["apple", "banana", "zebra"],
        "Should return sorted unique keywords",
      );
    },
  },
  {
    name: "createSearchKeywordsCollection-empty",
    description: "Returns empty array when no products have keywords",
    test: () => {
      const mockCollectionApi = {
        getFilteredByTag: () => [
          { data: { title: "Product 1" } },
          { data: { title: "Product 2" } },
        ],
      };

      const result = createSearchKeywordsCollection(mockCollectionApi);

      expectDeepEqual(result, [], "Should return empty array");
    },
  },
  {
    name: "configureSearch-basic",
    description: "Configures search collection and filters",
    test: () => {
      const mockConfig = createMockEleventyConfig();

      configureSearch(mockConfig);

      expectFunctionType(
        mockConfig.collections,
        "searchKeywords",
        "Should add searchKeywords collection",
      );
      expectFunctionType(
        mockConfig.filters,
        "getProductsByKeyword",
        "Should add getProductsByKeyword filter",
      );
      expectFunctionType(
        mockConfig.filters,
        "getAllKeywords",
        "Should add getAllKeywords filter",
      );
      expectStrictEqual(
        mockConfig.filters.getProductsByKeyword,
        getProductsByKeyword,
        "Should use correct filter function",
      );
      expectStrictEqual(
        mockConfig.filters.getAllKeywords,
        getAllKeywords,
        "Should use correct filter function",
      );
    },
  },
];

export default createTestRunner("search", testCases);
