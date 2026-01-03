import { configureCategories } from "#collections/categories.js";
import { configureMenus } from "#collections/menus.js";
import { configureNavigation } from "#collections/navigation.js";
import { configureProducts } from "#collections/products.js";
import { configureTags } from "#collections/tags.js";
import { configureFeed } from "#eleventy/feed.js";
import { configureRecurringEvents } from "#eleventy/recurring-events.js";
import {
  createMockEleventyConfig,
  createTestRunner,
  expectTrue,
} from "#test/test-utils.js";

// Test that lib modules handle missing folders gracefully
const testLibModules = () => {
  const testCases = [];

  // Test categories module with empty collections
  testCases.push({
    name: "categories-handles-empty-collections",
    description: "Categories module handles empty collections",
    test: () => {
      const mockConfig = createMockEleventyConfig();

      // Should not throw when configuring
      configureCategories(mockConfig);

      // Test with empty collections
      const mockCollectionApi = {
        getFilteredByTag: (tag) => {
          if (tag === "category") return [];
          if (tag === "product") return [];
          return [];
        },
      };

      const result = mockConfig.collections.categories(mockCollectionApi);
      expectTrue(Array.isArray(result), "Should return an array");
      expectTrue(
        result.length === 0,
        "Should return empty array for no categories",
      );
    },
  });

  // Test menus module
  testCases.push({
    name: "menus-handles-missing-data",
    description: "Menus module handles missing menu data",
    test: () => {
      const mockConfig = createMockEleventyConfig();

      configureMenus(mockConfig);

      // Test filters with empty data
      const emptyCategories = [];
      const emptyItems = [];

      const categoriesByMenu = mockConfig.filters.getCategoriesByMenu(
        emptyCategories,
        "test-menu",
      );
      expectTrue(
        Array.isArray(categoriesByMenu),
        "Should return array for categories by menu",
      );
      expectTrue(
        categoriesByMenu.length === 0,
        "Should return empty array for no categories",
      );

      const itemsByCategory = mockConfig.filters.getItemsByCategory(
        emptyItems,
        "test-category",
      );
      expectTrue(
        Array.isArray(itemsByCategory),
        "Should return array for items by category",
      );
      expectTrue(
        itemsByCategory.length === 0,
        "Should return empty array for no items",
      );
    },
  });

  // Test products module
  testCases.push({
    name: "products-handles-empty-collections",
    description: "Products module handles empty collections",
    test: () => {
      const mockConfig = createMockEleventyConfig();

      configureProducts(mockConfig);

      // Test with empty collections
      const mockCollectionApi = {
        getFilteredByTag: (tag) => {
          if (tag === "product") return [];
          return [];
        },
      };

      const result = mockConfig.collections.products(mockCollectionApi);
      expectTrue(Array.isArray(result), "Should return an array");
      expectTrue(
        result.length === 0,
        "Should return empty array for no products",
      );
    },
  });

  // Test tags module
  testCases.push({
    name: "tags-handles-empty-collections",
    description: "Tags module handles empty collections",
    test: () => {
      const mockConfig = createMockEleventyConfig();

      configureTags(mockConfig);

      // Test with empty collections
      const mockCollectionApi = {
        getAll: () => [],
      };

      if (mockConfig.collections?.tagList) {
        const result = mockConfig.collections.tagList(mockCollectionApi);
        expectTrue(Array.isArray(result), "Should return an array");
      } else {
        // Tags module doesn't create collections, just filters
        expectTrue(
          mockConfig.filters !== undefined,
          "Should have filters configured",
        );
      }
    },
  });

  // Test recurring events module
  testCases.push({
    name: "events-handles-missing-files",
    description: "Recurring events handles missing event files",
    test: () => {
      const mockConfig = createMockEleventyConfig();

      // Should not throw when configuring
      configureRecurringEvents(mockConfig);

      // Test filter with empty data
      const emptyEvents = [];
      if (mockConfig.filters.generateRecurringEvents) {
        const result = mockConfig.filters.generateRecurringEvents(emptyEvents);
        expectTrue(Array.isArray(result), "Should return an array");
      }
    },
  });

  // Test navigation module
  testCases.push({
    name: "navigation-handles-missing-pages",
    description: "Navigation module handles missing pages",
    asyncTest: async () => {
      const mockConfig = createMockEleventyConfig();

      // Should not throw when configuring (async due to plugin loading)
      await configureNavigation(mockConfig);

      // Check that plugin was added
      expectTrue(
        mockConfig.pluginCalls !== undefined,
        "Should have plugin calls",
      );
    },
  });

  // Test feed module
  testCases.push({
    name: "feed-handles-missing-posts",
    description: "Feed module handles missing posts",
    asyncTest: async () => {
      const mockConfig = createMockEleventyConfig();

      // Should not throw when configuring (async due to plugin loading)
      await configureFeed(mockConfig);

      // Check that RSS date filters were added
      expectTrue(
        mockConfig.filters.dateToRfc3339 !== undefined,
        "Should add dateToRfc3339 filter",
      );
      expectTrue(
        mockConfig.filters.dateToRfc822 !== undefined,
        "Should add dateToRfc822 filter",
      );
    },
  });

  return testCases;
};

createTestRunner("missing-folders-lib", testLibModules());
