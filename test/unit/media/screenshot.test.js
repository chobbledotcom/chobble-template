import { describe, expect, test } from "bun:test";
import { join } from "node:path";
import {
  buildOutputFilename,
  DEFAULT_OPTIONS,
  getDefaultOptions,
  getViewports,
  VIEWPORTS,
} from "#media/screenshot.js";

describe("screenshot", () => {
  describe("VIEWPORTS", () => {
    test("Defines mobile viewport with correct dimensions", () => {
      expect(VIEWPORTS.mobile).toEqual({
        width: 375,
        height: 667,
        name: "mobile",
      });
    });

    test("Defines tablet viewport with correct dimensions", () => {
      expect(VIEWPORTS.tablet).toEqual({
        width: 768,
        height: 1024,
        name: "tablet",
      });
    });

    test("Defines desktop viewport with correct dimensions", () => {
      expect(VIEWPORTS.desktop).toEqual({
        width: 1280,
        height: 800,
        name: "desktop",
      });
    });

    test("Defines full-page viewport with correct dimensions", () => {
      expect(VIEWPORTS["full-page"]).toEqual({
        width: 1280,
        height: 4000,
        name: "full-page",
      });
    });
  });

  describe("DEFAULT_OPTIONS", () => {
    test("Has viewport set to desktop", () => {
      expect(DEFAULT_OPTIONS.viewport).toBe("desktop");
    });

    test("Has baseUrl set to localhost:8080", () => {
      expect(DEFAULT_OPTIONS.baseUrl).toBe("http://localhost:8080");
    });

    test("Has timeout set to 10000ms", () => {
      expect(DEFAULT_OPTIONS.timeout).toBe(10000);
    });

    test("Has waitForStable enabled", () => {
      expect(DEFAULT_OPTIONS.waitForStable).toBe(true);
    });

    test("Has backgroundColor set to FFFFFF", () => {
      expect(DEFAULT_OPTIONS.backgroundColor).toBe("FFFFFF");
    });

    test("Has virtualTimeBudget set to 5000ms", () => {
      expect(DEFAULT_OPTIONS.virtualTimeBudget).toBe(5000);
    });
  });

  describe("buildOutputFilename", () => {
    const testOutputDir = "/tmp/screenshots";

    test("Generates filename from root path", () => {
      const result = buildOutputFilename("/", "desktop", testOutputDir);
      expect(result).toBe(join(testOutputDir, "home.png"));
    });

    test("Generates filename from simple path", () => {
      const result = buildOutputFilename("/about/", "desktop", testOutputDir);
      expect(result).toBe(join(testOutputDir, "about.png"));
    });

    test("Generates filename from nested path", () => {
      const result = buildOutputFilename(
        "/products/category/item/",
        "desktop",
        testOutputDir,
      );
      expect(result).toBe(join(testOutputDir, "products-category-item.png"));
    });

    test("Adds viewport suffix for mobile", () => {
      const result = buildOutputFilename("/about/", "mobile", testOutputDir);
      expect(result).toBe(join(testOutputDir, "about-mobile.png"));
    });

    test("Adds viewport suffix for tablet", () => {
      const result = buildOutputFilename("/about/", "tablet", testOutputDir);
      expect(result).toBe(join(testOutputDir, "about-tablet.png"));
    });

    test("Adds viewport suffix for full-page", () => {
      const result = buildOutputFilename("/about/", "full-page", testOutputDir);
      expect(result).toBe(join(testOutputDir, "about-full-page.png"));
    });

    test("Does not add suffix for desktop viewport", () => {
      const result = buildOutputFilename("/about/", "desktop", testOutputDir);
      expect(result).not.toContain("-desktop");
    });

    test("Handles path without leading slash", () => {
      const result = buildOutputFilename("about", "desktop", testOutputDir);
      expect(result).toBe(join(testOutputDir, "about.png"));
    });

    test("Handles path without trailing slash", () => {
      const result = buildOutputFilename("/about", "desktop", testOutputDir);
      expect(result).toBe(join(testOutputDir, "about.png"));
    });

    test("Handles empty path as home", () => {
      const result = buildOutputFilename("", "desktop", testOutputDir);
      expect(result).toBe(join(testOutputDir, "home.png"));
    });
  });

  describe("getViewports", () => {
    test("Returns a copy of viewports object", () => {
      const viewports = getViewports();
      expect(viewports).toEqual(VIEWPORTS);
    });

    test("Returns independent copy that does not affect original", () => {
      const viewports = getViewports();
      viewports.custom = { width: 100, height: 100 };
      expect(VIEWPORTS.custom).toBeUndefined();
    });
  });

  describe("getDefaultOptions", () => {
    test("Returns a copy of default options", () => {
      const options = getDefaultOptions();
      expect(options).toEqual(DEFAULT_OPTIONS);
    });

    test("Returns independent copy that does not affect original", () => {
      const options = getDefaultOptions();
      options.timeout = 999;
      expect(DEFAULT_OPTIONS.timeout).toBe(10000);
    });
  });
});
