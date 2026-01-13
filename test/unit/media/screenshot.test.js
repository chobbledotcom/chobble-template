import { describe, expect, test } from "bun:test";
import {
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

  describe("getDefaultOptions", () => {
    test("Has viewport set to desktop", () => {
      expect(getDefaultOptions().viewport).toBe("desktop");
    });

    test("Has baseUrl set to localhost:8080", () => {
      expect(getDefaultOptions().baseUrl).toBe("http://localhost:8080");
    });

    test("Has timeout set to 10000ms", () => {
      expect(getDefaultOptions().timeout).toBe(10000);
    });

    test("Has waitForStable enabled", () => {
      expect(getDefaultOptions().waitForStable).toBe(true);
    });

    test("Has backgroundColor set to FFFFFF", () => {
      expect(getDefaultOptions().backgroundColor).toBe("FFFFFF");
    });

    test("Has virtualTimeBudget set to 5000ms", () => {
      expect(getDefaultOptions().virtualTimeBudget).toBe(5000);
    });

    test("Returns independent copy that does not affect original", () => {
      const options = getDefaultOptions();
      options.timeout = 999;
      expect(getDefaultOptions().timeout).toBe(10000);
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
});
