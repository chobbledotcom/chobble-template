import { describe, expect, test } from "bun:test";
import {
  configureStyleBundle,
  getBodyClasses,
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

  describe("getBodyClasses", () => {
    test("includes layout name without .html extension", () => {
      const result = getBodyClasses("base.html", {});
      expect(result).toContain("base");
      expect(result).not.toContain(".html");
    });

    test("adds design-system class when layout is in designSystemLayouts", () => {
      const result = getBodyClasses("design-system-base.html", {
        designSystemLayouts: ["design-system-base.html"],
      });
      expect(result).toContain("design-system-base");
      expect(result).toContain("design-system");
    });

    test("does not add design-system class when layout is not in designSystemLayouts", () => {
      const result = getBodyClasses("base.html", {
        designSystemLayouts: ["design-system-base.html"],
      });
      expect(result).not.toContain("design-system");
    });

    test("adds design-system class when forceDesignSystem is true", () => {
      const result = getBodyClasses("base.html", {
        designSystemLayouts: [],
        forceDesignSystem: true,
      });
      expect(result).toContain("design-system");
    });

    test("adds sticky-mobile-nav class when stickyMobileNav is true", () => {
      const result = getBodyClasses("base.html", { stickyMobileNav: true });
      expect(result).toContain("sticky-mobile-nav");
    });

    test("does not add sticky-mobile-nav class when stickyMobileNav is false", () => {
      const result = getBodyClasses("base.html", { stickyMobileNav: false });
      expect(result).not.toContain("sticky-mobile-nav");
    });

    test("adds horizontal-nav class when horizontalNav is true", () => {
      const result = getBodyClasses("base.html", { horizontalNav: true });
      expect(result).toContain("horizontal-nav");
      expect(result).not.toContain("left-nav");
    });

    test("adds left-nav class when horizontalNav is false", () => {
      const result = getBodyClasses("base.html", { horizontalNav: false });
      expect(result).toContain("left-nav");
      expect(result).not.toContain("horizontal-nav");
    });

    test("adds two-columns class when hasRightContent is true", () => {
      const result = getBodyClasses("base.html", { hasRightContent: true });
      expect(result).toContain("two-columns");
      expect(result).not.toContain("one-column");
    });

    test("adds one-column class when hasRightContent is false", () => {
      const result = getBodyClasses("base.html", { hasRightContent: false });
      expect(result).toContain("one-column");
      expect(result).not.toContain("two-columns");
    });

    test("uses sensible defaults", () => {
      const result = getBodyClasses("page.html");
      expect(result).toBe("page horizontal-nav one-column");
    });

    test("generates complete class string for typical base.html usage", () => {
      const result = getBodyClasses("base.html", {
        designSystemLayouts: ["design-system-base.html"],
        stickyMobileNav: true,
        horizontalNav: true,
        hasRightContent: false,
      });
      expect(result).toBe("base sticky-mobile-nav horizontal-nav one-column");
    });

    test("generates complete class string for design-system layout", () => {
      const result = getBodyClasses("design-system-base.html", {
        designSystemLayouts: ["design-system-base.html"],
        stickyMobileNav: false,
        horizontalNav: true,
        hasRightContent: false,
      });
      expect(result).toBe(
        "design-system-base design-system horizontal-nav one-column",
      );
    });

    test("works with positional arguments (Liquid filter style)", () => {
      // layout | getBodyClasses: designSystemLayouts, force, sticky, horizontal, rightContent
      const result = getBodyClasses(
        "base.html",
        ["design-system-base.html"],
        false,
        true,
        true,
        false,
      );
      expect(result).toBe("base sticky-mobile-nav horizontal-nav one-column");
    });

    test("positional args with forceDesignSystem", () => {
      const result = getBodyClasses("base.html", [], true, false, true, false);
      expect(result).toBe("base design-system horizontal-nav one-column");
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

    test("registers getBodyClasses filter", () => {
      const mockConfig = createMockEleventyConfig();
      configureStyleBundle(mockConfig);
      expect(typeof mockConfig.filters.getBodyClasses).toBe("function");
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
