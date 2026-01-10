import { describe, expect, test } from "bun:test";
import { configureCategories } from "#collections/categories.js";
import { configureMenus } from "#collections/menus.js";
import { configureNavigation } from "#collections/navigation.js";
import { configureProducts } from "#collections/products.js";
import { configureTags } from "#collections/tags.js";
import { configureFeed } from "#eleventy/feed.js";
import { createMockEleventyConfig } from "#test/test-utils.js";

describe("missing-folders-lib", () => {
  // Test that lib modules handle missing folders gracefully
  test("Categories module handles empty collections", () => {
    const mockConfig = createMockEleventyConfig();

    // Should not throw when configuring
    configureCategories(mockConfig);

    // Test with empty collections
    const mockCollectionApi = {
      getFilteredByTag: (tag) => {
        if (tag === "categories") return [];
        if (tag === "products") return [];
        return [];
      },
    };

    const result = mockConfig.collections.categories(mockCollectionApi);
    expect(Array.isArray(result)).toBe(true);
    expect(result.length === 0).toBe(true);
  });

  test("Menus module handles missing menu data", () => {
    const mockConfig = createMockEleventyConfig();

    configureMenus(mockConfig);

    // Test filters with empty data
    const emptyCategories = [];
    const emptyItems = [];

    const categoriesByMenu = mockConfig.filters.getCategoriesByMenu(
      emptyCategories,
      "test-menu",
    );
    expect(Array.isArray(categoriesByMenu)).toBe(true);
    expect(categoriesByMenu.length === 0).toBe(true);

    const itemsByCategory = mockConfig.filters.getItemsByCategory(
      emptyItems,
      "test-category",
    );
    expect(Array.isArray(itemsByCategory)).toBe(true);
    expect(itemsByCategory.length === 0).toBe(true);
  });

  test("Products module handles empty collections", () => {
    const mockConfig = createMockEleventyConfig();

    configureProducts(mockConfig);

    // Test with empty collections
    const mockCollectionApi = {
      getFilteredByTag: (tag) => {
        if (tag === "products") return [];
        return [];
      },
    };

    const result = mockConfig.collections.products(mockCollectionApi);
    expect(Array.isArray(result)).toBe(true);
    expect(result.length === 0).toBe(true);
  });

  test("Tags module handles empty collections", () => {
    const mockConfig = createMockEleventyConfig();

    configureTags(mockConfig);

    // Test with empty collections
    const mockCollectionApi = {
      getAll: () => [],
    };

    if (mockConfig.collections?.tagList) {
      const result = mockConfig.collections.tagList(mockCollectionApi);
      expect(Array.isArray(result)).toBe(true);
    } else {
      // Tags module doesn't create collections, just filters
      expect(mockConfig.filters !== undefined).toBe(true);
    }
  });

  test("Navigation module handles missing pages", async () => {
    const mockConfig = createMockEleventyConfig();

    // Should not throw when configuring (async due to plugin loading)
    await configureNavigation(mockConfig);

    // Check that plugin was added
    expect(mockConfig.pluginCalls !== undefined).toBe(true);
  });

  test("Feed module handles missing posts", async () => {
    const mockConfig = createMockEleventyConfig();

    // Should not throw when configuring (async due to plugin loading)
    await configureFeed(mockConfig);

    // Check that RSS date filters were added
    expect(mockConfig.filters.dateToRfc3339 !== undefined).toBe(true);
    expect(mockConfig.filters.dateToRfc822 !== undefined).toBe(true);
  });
});
