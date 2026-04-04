import { describe, expect, test } from "bun:test";
import { configureStyleBundle } from "#eleventy/style-bundle.js";
import {
  createMockEleventyConfig,
  fs,
  path,
  withConfiguredMock,
  withMockedCwdAsync,
  withTempDirAsync,
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

    test("adds two-columns when right-content.md exists", () =>
      withTempDirAsync("style-bundle-right", async (tempDir) => {
        const snippetDir = path.join(tempDir, "src", "snippets");
        fs.mkdirSync(snippetDir, { recursive: true });
        fs.writeFileSync(path.join(snippetDir, "right-content.md"), "content");
        return withMockedCwdAsync(tempDir, () => {
          const result = getBodyClasses("base.html", baseConfig);
          expect(result).toContain("two-columns");
        });
      }));

    test("adds one-column when right-content.md does not exist", () =>
      withTempDirAsync("style-bundle-no-right", async (tempDir) =>
        withMockedCwdAsync(tempDir, () => {
          const result = getBodyClasses("base.html", baseConfig);
          expect(result).toContain("one-column");
          expect(result).not.toContain("two-columns");
        }),
      ));

    test("appends extra classes from array", () => {
      const result = getBodyClasses("base.html", baseConfig, [
        "class-a",
        "class-b",
      ]);
      expect(result).toContain("class-a");
      expect(result).toContain("class-b");
    });

    test("generates complete class string for typical usage", () => {
      const result = getBodyClasses("base.html", {
        sticky_mobile_nav: true,
        horizontal_nav: true,
      });
      expect(result).toContain("base");
      expect(result).toContain("sticky-mobile-nav");
      expect(result).toContain("horizontal-nav");
    });

    test("adds featured class when featured is true", () => {
      const result = getBodyClasses("item.html", baseConfig, [], true);
      expect(result).toContain("featured");
    });

    test("does not add featured class when featured is falsy", () => {
      const result = getBodyClasses("item.html", baseConfig, [], false);
      expect(result).not.toContain("featured");
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
