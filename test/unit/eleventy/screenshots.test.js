import { describe, expect, test } from "bun:test";
import {
  configureScreenshots,
  getDefaultOptions,
  getViewports,
  VIEWPORTS,
} from "#eleventy/screenshots.js";
import { createMockEleventyConfig } from "#test/test-utils.js";

describe("screenshots eleventy plugin", () => {
  describe("configureScreenshots", () => {
    test("Adds _screenshotPages collection", () => {
      const mockConfig = createMockEleventyConfig();

      configureScreenshots(mockConfig);

      expect(mockConfig.collections).toBeDefined();
      expect(typeof mockConfig.collections._screenshotPages).toBe("function");
    });

    test("Adds eleventy.after event handler", () => {
      const mockConfig = createMockEleventyConfig();

      configureScreenshots(mockConfig);

      expect(mockConfig.eventHandlers).toBeDefined();
      expect(typeof mockConfig.eventHandlers["eleventy.after"]).toBe(
        "function",
      );
    });

    test("Adds screenshotPath filter", () => {
      const mockConfig = createMockEleventyConfig();

      configureScreenshots(mockConfig);

      expect(mockConfig.filters).toBeDefined();
      expect(typeof mockConfig.filters.screenshotPath).toBe("function");
    });

    test("Screenshot collection returns empty array", () => {
      const mockConfig = createMockEleventyConfig();

      configureScreenshots(mockConfig);

      const mockCollectionApi = {
        getFilteredByTag: () => [],
        getAll: () => [],
      };

      const result = mockConfig.collections._screenshotPages(mockCollectionApi);
      expect(result).toEqual([]);
    });
  });

  describe("screenshotPath filter", () => {
    test("Generates correct path for root page", () => {
      const mockConfig = createMockEleventyConfig();
      configureScreenshots(mockConfig);

      const result = mockConfig.filters.screenshotPath("/");
      expect(result).toBe("/screenshots/home.png");
    });

    test("Generates correct path for simple page", () => {
      const mockConfig = createMockEleventyConfig();
      configureScreenshots(mockConfig);

      const result = mockConfig.filters.screenshotPath("/about/");
      expect(result).toBe("/screenshots/about.png");
    });

    test("Generates correct path for nested page", () => {
      const mockConfig = createMockEleventyConfig();
      configureScreenshots(mockConfig);

      const result = mockConfig.filters.screenshotPath("/products/category/");
      expect(result).toBe("/screenshots/products-category.png");
    });

    test("Adds viewport suffix for mobile", () => {
      const mockConfig = createMockEleventyConfig();
      configureScreenshots(mockConfig);

      const result = mockConfig.filters.screenshotPath("/about/", "mobile");
      expect(result).toBe("/screenshots/about-mobile.png");
    });

    test("Adds viewport suffix for tablet", () => {
      const mockConfig = createMockEleventyConfig();
      configureScreenshots(mockConfig);

      const result = mockConfig.filters.screenshotPath("/about/", "tablet");
      expect(result).toBe("/screenshots/about-tablet.png");
    });

    test("Does not add suffix for desktop viewport", () => {
      const mockConfig = createMockEleventyConfig();
      configureScreenshots(mockConfig);

      const result = mockConfig.filters.screenshotPath("/about/", "desktop");
      expect(result).not.toContain("-desktop");
      expect(result).toBe("/screenshots/about.png");
    });
  });

  describe("eleventy.after handler", () => {
    test("Does not throw when screenshots config is missing", async () => {
      const mockConfig = createMockEleventyConfig();
      configureScreenshots(mockConfig);

      await mockConfig.eventHandlers["eleventy.after"]({
        dir: { output: "_site" },
      });
    });
  });

  describe("re-exports", () => {
    test("Exports getViewports function", () => {
      expect(typeof getViewports).toBe("function");
      expect(getViewports()).toHaveProperty("mobile");
      expect(getViewports()).toHaveProperty("desktop");
    });

    test("Exports getDefaultOptions function", () => {
      expect(typeof getDefaultOptions).toBe("function");
      expect(getDefaultOptions()).toHaveProperty("viewport");
      expect(getDefaultOptions()).toHaveProperty("baseUrl");
    });

    test("Exports VIEWPORTS constant", () => {
      expect(VIEWPORTS).toBeDefined();
      expect(VIEWPORTS.mobile).toBeDefined();
      expect(VIEWPORTS.desktop).toBeDefined();
    });
  });
});
