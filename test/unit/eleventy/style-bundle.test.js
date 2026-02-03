import { describe, expect, test } from "bun:test";
import { configureStyleBundle } from "#eleventy/style-bundle.js";
import {
  createMockEleventyConfig,
  withConfiguredMock,
} from "#test/test-utils.js";

// Extract filters once - they're pure functions, safe to reuse
const { usesDesignSystem, getCssBundle, getBodyClasses } =
  withConfiguredMock(configureStyleBundle)().filters;

describe("style-bundle", () => {
  describe("usesDesignSystem filter", () => {
    test("returns true when layout is in design system layouts list", () => {
      expect(usesDesignSystem("landing-page.html", ["landing-page.html"])).toBe(
        true,
      );
    });

    test("returns false when layout is not in design system layouts list", () => {
      expect(usesDesignSystem("base.html", ["landing-page.html"])).toBe(false);
    });

    test("returns false for empty designSystemLayouts array", () => {
      expect(usesDesignSystem("landing-page.html", [])).toBe(false);
    });

    test("handles multiple layouts in list", () => {
      const layouts = ["landing-page.html", "promo.html", "splash.html"];
      expect(usesDesignSystem("promo.html", layouts)).toBe(true);
      expect(usesDesignSystem("splash.html", layouts)).toBe(true);
      expect(usesDesignSystem("base.html", layouts)).toBe(false);
    });
  });

  describe("getCssBundle filter", () => {
    test("returns design system bundle path for design system layout", () => {
      expect(getCssBundle("landing-page.html", ["landing-page.html"])).toBe(
        "/css/design-system-bundle.css",
      );
    });

    test("returns main bundle path for non-design-system layout", () => {
      expect(getCssBundle("base.html", ["landing-page.html"])).toBe(
        "/css/bundle.css",
      );
    });
  });

  describe("getBodyClasses filter", () => {
    const baseConfig = {
      sticky_mobile_nav: false,
      horizontal_nav: true,
      navigation_is_clicky: false,
    };

    test("includes layout name without .html extension", () => {
      const result = getBodyClasses("base.html", baseConfig);
      expect(result).toContain("base");
      expect(result).not.toContain(".html");
    });

    test("adds sticky-mobile-nav class when enabled", () => {
      const result = getBodyClasses("base.html", {
        ...baseConfig,
        sticky_mobile_nav: true,
      });
      expect(result).toContain("sticky-mobile-nav");
    });

    test("does not add sticky-mobile-nav class when disabled", () => {
      const result = getBodyClasses("base.html", baseConfig);
      expect(result).not.toContain("sticky-mobile-nav");
    });

    test("adds horizontal-nav class when enabled", () => {
      const result = getBodyClasses("base.html", baseConfig);
      expect(result).toContain("horizontal-nav");
      expect(result).not.toContain("left-nav");
    });

    test("adds left-nav class when horizontal_nav is false", () => {
      const result = getBodyClasses("base.html", {
        ...baseConfig,
        horizontal_nav: false,
      });
      expect(result).toContain("left-nav");
      expect(result).not.toContain("horizontal-nav");
    });

    test("adds clicky-nav class when enabled", () => {
      const result = getBodyClasses("base.html", {
        ...baseConfig,
        navigation_is_clicky: true,
      });
      expect(result).toContain("clicky-nav");
    });

    test("does not add clicky-nav class when disabled", () => {
      const result = getBodyClasses("base.html", baseConfig);
      expect(result).not.toContain("clicky-nav");
    });

    test("auto-detects hasRightContent from filesystem", () => {
      // The test runs from the project root where src/snippets/right-content.md exists
      const result = getBodyClasses("base.html", baseConfig);
      expect(result).toContain("two-columns");
    });

    test("appends extra classes from string", () => {
      const result = getBodyClasses("base.html", baseConfig, "custom-class");
      expect(result).toContain("custom-class");
    });

    test("appends extra classes from array", () => {
      const result = getBodyClasses("base.html", baseConfig, [
        "class-a",
        "class-b",
      ]);
      expect(result).toContain("class-a");
      expect(result).toContain("class-b");
    });

    test("skips falsy extra classes", () => {
      const result = getBodyClasses("base.html", baseConfig, [
        "valid",
        "",
        null,
      ]);
      expect(result).toContain("valid");
      expect(result).not.toContain("null");
    });

    test("generates complete class string for typical usage", () => {
      const result = getBodyClasses("base.html", {
        sticky_mobile_nav: true,
        horizontal_nav: true,
        navigation_is_clicky: true,
      });
      expect(result).toContain("base");
      expect(result).toContain("sticky-mobile-nav");
      expect(result).toContain("horizontal-nav");
      expect(result).toContain("clicky-nav");
    });
  });

  describe("configureStyleBundle", () => {
    test("registers all expected filters", () => {
      const mockConfig = createMockEleventyConfig();
      configureStyleBundle(mockConfig);

      expect(typeof mockConfig.filters.usesDesignSystem).toBe("function");
      expect(typeof mockConfig.filters.getCssBundle).toBe("function");
      expect(typeof mockConfig.filters.getBodyClasses).toBe("function");
    });
  });
});
