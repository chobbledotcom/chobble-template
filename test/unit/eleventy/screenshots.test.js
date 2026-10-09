import { describe, expect, test } from "vitest";
import { configureScreenshots } from "#eleventy/screenshots.js";
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

  describe("eleventy.after handler", () => {
    test("Does not throw when screenshots config is missing", async () => {
      const mockConfig = createMockEleventyConfig();
      configureScreenshots(mockConfig);

      await mockConfig.eventHandlers["eleventy.after"]({
        dir: { output: "_site" },
      });
    });
  });
});
