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
      expect(getBodyClasses("base.html", { stickyMobileNav: true })).toContain(
        "sticky-mobile-nav",
      );
    });

    test("does not add sticky-mobile-nav class when stickyMobileNav is false", () => {
      expect(
        getBodyClasses("base.html", { stickyMobileNav: false }),
      ).not.toContain("sticky-mobile-nav");
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
      expect(getBodyClasses("page.html")).toBe(
        "page horizontal-nav one-column",
      );
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
      expect(getBodyClasses("base.html", [], true, false, true, false)).toBe(
        "base design-system horizontal-nav one-column",
      );
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
