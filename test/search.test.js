import {
  configureSearch,
  createSearchKeywordsCollection,
  getAllKeywords,
  getProductsByKeyword,
  normaliseCategory,
} from "#collections/search.js";
import {
  createMockEleventyConfig,
  createTestRunner,
  expectDeepEqual,
  expectFunctionType,
  expectStrictEqual,
} from "#test/test-utils.js";

const testCases = [
  // normaliseCategory tests
  {
    name: "normaliseCategory-null",
    description: "Returns empty string for null input",
    test: () => {
      expectStrictEqual(
        normaliseCategory(null),
        "",
        "Should return empty string for null",
      );
    },
  },
  {
    name: "normaliseCategory-undefined",
    description: "Returns empty string for undefined input",
    test: () => {
      expectStrictEqual(
        normaliseCategory(undefined),
        "",
        "Should return empty string for undefined",
      );
    },
  },
  {
    name: "normaliseCategory-empty-string",
    description: "Returns empty string for empty string input",
    test: () => {
      expectStrictEqual(
        normaliseCategory(""),
        "",
        "Should return empty string for empty string",
      );
    },
  },
  {
    name: "normaliseCategory-simple-slug",
    description: "Converts hyphens to spaces in simple slug",
    test: () => {
      expectStrictEqual(
        normaliseCategory("premium-widgets"),
        "premium widgets",
        "Should convert hyphens to spaces",
      );
    },
  },
  {
    name: "normaliseCategory-full-path",
    description: "Strips /categories/ prefix and .md suffix from full path",
    test: () => {
      expectStrictEqual(
        normaliseCategory("/categories/premium-widgets.md"),
        "premium widgets",
        "Should strip prefix, suffix, and convert hyphens",
      );
    },
  },
  {
    name: "normaliseCategory-with-prefix-only",
    description: "Strips /categories/ prefix",
    test: () => {
      expectStrictEqual(
        normaliseCategory("/categories/gadgets"),
        "gadgets",
        "Should strip prefix without .md suffix",
      );
    },
  },
  {
    name: "normaliseCategory-with-suffix-only",
    description: "Strips .md suffix",
    test: () => {
      expectStrictEqual(
        normaliseCategory("electronics.md"),
        "electronics",
        "Should strip .md suffix without prefix",
      );
    },
  },
  {
    name: "normaliseCategory-multiple-hyphens",
    description: "Converts all hyphens to spaces",
    test: () => {
      expectStrictEqual(
        normaliseCategory("super-premium-deluxe-widgets"),
        "super premium deluxe widgets",
        "Should convert all hyphens to spaces",
      );
    },
  },
  {
    name: "normaliseCategory-no-transformation-needed",
    description: "Returns category unchanged when no transformation needed",
    test: () => {
      expectStrictEqual(
        normaliseCategory("gadgets"),
        "gadgets",
        "Should return unchanged when no hyphens or paths",
      );
    },
  },
  // getAllKeywords with categories
  {
    name: "getAllKeywords-with-categories",
    description: "Extracts keywords from product categories",
    test: () => {
      const products = [
        { data: { title: "Widget A", categories: ["premium-widgets"] } },
        { data: { title: "Widget B", categories: ["budget-items"] } },
      ];

      const result = getAllKeywords(products);

      expectDeepEqual(
        result,
        ["budget items", "premium widgets"],
        "Should extract and normalize category names as keywords",
      );
    },
  },
  {
    name: "getAllKeywords-with-full-category-paths",
    description: "Normalizes full category paths to keywords",
    test: () => {
      const products = [
        {
          data: {
            title: "Product",
            categories: ["/categories/super-gadgets.md"],
          },
        },
      ];

      const result = getAllKeywords(products);

      expectDeepEqual(
        result,
        ["super gadgets"],
        "Should normalize full category paths",
      );
    },
  },
  {
    name: "getAllKeywords-mixed-keywords-and-categories",
    description: "Combines keywords and categories into single list",
    test: () => {
      const products = [
        {
          data: {
            title: "Multi-source",
            keywords: ["portable"],
            categories: ["premium-widgets"],
          },
        },
      ];

      const result = getAllKeywords(products);

      expectDeepEqual(
        result,
        ["portable", "premium widgets"],
        "Should combine keywords and normalized categories",
      );
    },
  },
  {
    name: "getAllKeywords-deduplicates-categories",
    description: "Deduplicates categories across products",
    test: () => {
      const products = [
        { data: { title: "A", categories: ["electronics"] } },
        { data: { title: "B", categories: ["electronics"] } },
        { data: { title: "C", categories: ["electronics", "gadgets"] } },
      ];

      const result = getAllKeywords(products);

      expectDeepEqual(
        result,
        ["electronics", "gadgets"],
        "Should deduplicate categories",
      );
    },
  },
  // getProductsByKeyword with categories
  {
    name: "getProductsByKeyword-matches-normalized-category",
    description: "Finds products by normalized category name",
    test: () => {
      const products = [
        { data: { title: "Widget A", categories: ["premium-widgets"] } },
        { data: { title: "Widget B", categories: ["budget-items"] } },
      ];

      const result = getProductsByKeyword(products, "premium widgets");

      expectStrictEqual(result.length, 1, "Should find 1 product");
      expectStrictEqual(
        result[0].data.title,
        "Widget A",
        "Should find product by normalized category",
      );
    },
  },
  {
    name: "getProductsByKeyword-category-and-keyword-overlap",
    description: "Finds products matching either keyword or category",
    test: () => {
      const products = [
        { data: { title: "A", keywords: ["portable"] } },
        { data: { title: "B", categories: ["portable-devices"] } },
        {
          data: { title: "C", keywords: ["portable"], categories: ["gadgets"] },
        },
      ];

      // Search for "portable" which matches keyword on A and C
      const portable = getProductsByKeyword(products, "portable");
      expectStrictEqual(
        portable.length,
        2,
        "Should find 2 products with portable keyword",
      );

      // Search for "portable devices" which matches normalized category on B
      const devices = getProductsByKeyword(products, "portable devices");
      expectStrictEqual(
        devices.length,
        1,
        "Should find 1 product with portable devices category",
      );
      expectStrictEqual(devices[0].data.title, "B", "Should find product B");
    },
  },
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
  {
    name: "normaliseCategory-transforms-category-paths",
    description:
      "Normalizes category paths from frontmatter format to display format",
    test: () => {
      // Full path as stored in frontmatter
      expectStrictEqual(
        normaliseCategory("/categories/premium-widgets.md"),
        "premium widgets",
        "Full category path should be normalized",
      );

      // Falsy values return empty string
      expectStrictEqual(normaliseCategory(null), "", "null → empty");
      expectStrictEqual(normaliseCategory(""), "", "empty → empty");
    },
  },
  {
    name: "getAllKeywords-with-categories",
    description: "Extracts keywords from product categories",
    test: () => {
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

      expectDeepEqual(
        keywords,
        ["basic gadgets", "premium widgets", "simple"],
        "Should extract and normalize category names as keywords",
      );
    },
  },
  {
    name: "getProductsByKeyword-via-category",
    description: "Finds products by normalized category name",
    test: () => {
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

      expectStrictEqual(result.length, 1, "Should find 1 product");
      expectStrictEqual(
        result[0].data.title,
        "Widget Pro",
        "Should find correct product",
      );
    },
  },
  {
    name: "getAllKeywords-combines-keywords-and-categories",
    description: "Combines explicit keywords with category-derived keywords",
    test: () => {
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

      expectDeepEqual(
        keywords,
        ["featured", "premium", "sale"],
        "Should include both explicit keywords and category-derived keywords",
      );
    },
  },
];

export default createTestRunner("search", testCases);
