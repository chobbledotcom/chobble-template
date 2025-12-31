import { configureGuides, guidesByCategory } from "#collections/guides.js";
import {
  createMockEleventyConfig,
  createTestRunner,
  expectDeepEqual,
  expectFunctionType,
  expectStrictEqual,
} from "./test-utils.js";

const testCases = [
  {
    name: "guidesByCategory-basic",
    description: "Filters guide pages by category slug",
    test: () => {
      const guidePages = [
        { data: { title: "Guide 1", "guide-category": "getting-started" } },
        { data: { title: "Guide 2", "guide-category": "advanced" } },
        { data: { title: "Guide 3", "guide-category": "getting-started" } },
        { data: { title: "Guide 4", "guide-category": "tips" } },
      ];

      const result = guidesByCategory(guidePages, "getting-started");

      expectStrictEqual(
        result.length,
        2,
        "Should return 2 guides in getting-started category",
      );
      expectStrictEqual(
        result[0].data.title,
        "Guide 1",
        "Should include first matching guide",
      );
      expectStrictEqual(
        result[1].data.title,
        "Guide 3",
        "Should include second matching guide",
      );
    },
  },
  {
    name: "guidesByCategory-single-match",
    description: "Returns single guide when only one matches",
    test: () => {
      const guidePages = [
        { data: { title: "Guide 1", "guide-category": "getting-started" } },
        { data: { title: "Guide 2", "guide-category": "advanced" } },
        { data: { title: "Guide 3", "guide-category": "tips" } },
      ];

      const result = guidesByCategory(guidePages, "advanced");

      expectStrictEqual(result.length, 1, "Should return 1 guide");
      expectStrictEqual(
        result[0].data.title,
        "Guide 2",
        "Should return the correct guide",
      );
    },
  },
  {
    name: "guidesByCategory-no-matches",
    description: "Returns empty array when no guides match category",
    test: () => {
      const guidePages = [
        { data: { title: "Guide 1", "guide-category": "getting-started" } },
        { data: { title: "Guide 2", "guide-category": "advanced" } },
      ];

      const result = guidesByCategory(guidePages, "nonexistent");

      expectStrictEqual(result.length, 0, "Should return no guides");
    },
  },
  {
    name: "guidesByCategory-null-pages",
    description: "Handles null/undefined guide pages",
    test: () => {
      expectDeepEqual(
        guidesByCategory(null, "getting-started"),
        [],
        "Should return empty array for null pages",
      );
      expectDeepEqual(
        guidesByCategory(undefined, "getting-started"),
        [],
        "Should return empty array for undefined pages",
      );
    },
  },
  {
    name: "guidesByCategory-null-category",
    description: "Handles null/undefined category slug",
    test: () => {
      const guidePages = [
        { data: { title: "Guide 1", "guide-category": "getting-started" } },
      ];

      expectDeepEqual(
        guidesByCategory(guidePages, null),
        [],
        "Should return empty array for null category",
      );
      expectDeepEqual(
        guidesByCategory(guidePages, undefined),
        [],
        "Should return empty array for undefined category",
      );
    },
  },
  {
    name: "guidesByCategory-empty-pages",
    description: "Handles empty guide pages array",
    test: () => {
      const result = guidesByCategory([], "getting-started");

      expectDeepEqual(result, [], "Should return empty array for empty pages");
    },
  },
  {
    name: "guidesByCategory-missing-category-field",
    description: "Skips guides without guide-category field",
    test: () => {
      const guidePages = [
        { data: { title: "Guide 1", "guide-category": "getting-started" } },
        { data: { title: "Guide 2" } },
        { data: { title: "Guide 3", "guide-category": "getting-started" } },
      ];

      const result = guidesByCategory(guidePages, "getting-started");

      expectStrictEqual(
        result.length,
        2,
        "Should only return guides with matching category",
      );
    },
  },
  {
    name: "guidesByCategory-case-sensitive",
    description: "Category matching is case-sensitive",
    test: () => {
      const guidePages = [
        { data: { title: "Guide 1", "guide-category": "Getting-Started" } },
        { data: { title: "Guide 2", "guide-category": "getting-started" } },
      ];

      const result = guidesByCategory(guidePages, "getting-started");

      expectStrictEqual(result.length, 1, "Should only match exact case");
      expectStrictEqual(
        result[0].data.title,
        "Guide 2",
        "Should return correctly cased guide",
      );
    },
  },
  {
    name: "guidesByCategory-immutable",
    description: "Does not modify input array",
    test: () => {
      const originalPages = [
        { data: { title: "Guide 1", "guide-category": "getting-started" } },
        { data: { title: "Guide 2", "guide-category": "advanced" } },
      ];

      const pagesCopy = structuredClone(originalPages);

      guidesByCategory(pagesCopy, "getting-started");

      expectDeepEqual(
        pagesCopy,
        originalPages,
        "Should not modify input array",
      );
    },
  },
  {
    name: "configureGuides-collections",
    description: "Adds guide-categories and guide-pages collections",
    test: () => {
      const mockConfig = createMockEleventyConfig();

      configureGuides(mockConfig);

      expectFunctionType(
        mockConfig.collections,
        "guide-categories",
        "Should add guide-categories collection",
      );
      expectFunctionType(
        mockConfig.collections,
        "guide-pages",
        "Should add guide-pages collection",
      );
    },
  },
  {
    name: "configureGuides-filter",
    description: "Adds guidesByCategory filter",
    test: () => {
      const mockConfig = createMockEleventyConfig();

      configureGuides(mockConfig);

      expectFunctionType(
        mockConfig.filters,
        "guidesByCategory",
        "Should add guidesByCategory filter",
      );
      expectStrictEqual(
        mockConfig.filters.guidesByCategory,
        guidesByCategory,
        "Should use correct filter function",
      );
    },
  },
  {
    name: "configureGuides-collection-functions",
    description: "Collection functions filter by correct tags",
    test: () => {
      const mockConfig = createMockEleventyConfig();

      configureGuides(mockConfig);

      const mockCollectionApi = {
        getFilteredByTag: (tag) => {
          if (tag === "guide-category") return [{ slug: "cat-1" }];
          if (tag === "guide-page") return [{ slug: "page-1" }];
          return [];
        },
      };

      const categories =
        mockConfig.collections["guide-categories"](mockCollectionApi);
      const pages = mockConfig.collections["guide-pages"](mockCollectionApi);

      expectStrictEqual(
        categories.length,
        1,
        "Should return guide-category items",
      );
      expectStrictEqual(
        categories[0].slug,
        "cat-1",
        "Should return correct category",
      );
      expectStrictEqual(pages.length, 1, "Should return guide-page items");
      expectStrictEqual(pages[0].slug, "page-1", "Should return correct page");
    },
  },
];

export default createTestRunner("guides", testCases);
