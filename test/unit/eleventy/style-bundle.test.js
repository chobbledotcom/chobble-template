import { describe, expect, test } from "bun:test";
import {
  configureStyleBundle,
  getCssBundle,
  getJsBundle,
  usesDesignSystem,
} from "#eleventy/style-bundle.js";
import { createMockEleventyConfig } from "#test/test-utils.js";

describe("style-bundle", () => {
  describe("usesDesignSystem", () => {
    test("returns true when layout is in design system layouts list", () => {
      const result = usesDesignSystem("landing-page.html", [
        "landing-page.html",
      ]);
      expect(result).toBe(true);
    });

    test("returns false when layout is not in design system layouts list", () => {
      const result = usesDesignSystem("base.html", ["landing-page.html"]);
      expect(result).toBe(false);
    });

    test("returns false for empty designSystemLayouts array", () => {
      const result = usesDesignSystem("landing-page.html", []);
      expect(result).toBe(false);
    });

    test("handles multiple layouts in list", () => {
      const layouts = ["landing-page.html", "promo.html", "splash.html"];
      expect(usesDesignSystem("promo.html", layouts)).toBe(true);
      expect(usesDesignSystem("splash.html", layouts)).toBe(true);
      expect(usesDesignSystem("base.html", layouts)).toBe(false);
    });
  });

  describe("getCssBundle", () => {
    test("returns landing bundle path for design system layout", () => {
      const result = getCssBundle("landing-page.html", ["landing-page.html"]);
      expect(result).toBe("/css/landing-bundle.css");
    });

    test("returns main bundle path for non-design-system layout", () => {
      const result = getCssBundle("base.html", ["landing-page.html"]);
      expect(result).toBe("/css/bundle.css");
    });
  });

  describe("getJsBundle", () => {
    test("returns landing bundle path for design system layout", () => {
      const result = getJsBundle("landing-page.html", ["landing-page.html"]);
      expect(result).toBe("/assets/js/landing-bundle.js");
    });

    test("returns main bundle path for non-design-system layout", () => {
      const result = getJsBundle("base.html", ["landing-page.html"]);
      expect(result).toBe("/assets/js/bundle.js");
    });
  });

  describe("configureStyleBundle", () => {
    test("registers usesDesignSystem filter", () => {
      const mockConfig = createMockEleventyConfig();
      configureStyleBundle(mockConfig);
      expect(typeof mockConfig.filters.usesDesignSystem).toBe("function");
    });

    test("registers getCssBundle filter", () => {
      const mockConfig = createMockEleventyConfig();
      configureStyleBundle(mockConfig);
      expect(typeof mockConfig.filters.getCssBundle).toBe("function");
    });

    test("registers getJsBundle filter", () => {
      const mockConfig = createMockEleventyConfig();
      configureStyleBundle(mockConfig);
      expect(typeof mockConfig.filters.getJsBundle).toBe("function");
    });

    test("getCssBundle filter works correctly", () => {
      const mockConfig = createMockEleventyConfig();
      configureStyleBundle(mockConfig);

      const filterFn = mockConfig.filters.getCssBundle;
      expect(filterFn("landing-page.html", ["landing-page.html"])).toBe(
        "/css/landing-bundle.css",
      );
      expect(filterFn("base.html", ["landing-page.html"])).toBe(
        "/css/bundle.css",
      );
    });

    test("getJsBundle filter works correctly", () => {
      const mockConfig = createMockEleventyConfig();
      configureStyleBundle(mockConfig);

      const filterFn = mockConfig.filters.getJsBundle;
      expect(filterFn("landing-page.html", ["landing-page.html"])).toBe(
        "/assets/js/landing-bundle.js",
      );
      expect(filterFn("base.html", ["landing-page.html"])).toBe(
        "/assets/js/bundle.js",
      );
    });
  });
});
