import { describe, expect, test } from "bun:test";
import { withNavigationAnchor } from "#utils/navigation-utils.js";

describe("withNavigationAnchor", () => {
  const createData = (overrides = {}) => ({
    config: { navigation_content_anchor: true },
    page: { url: "/products/" },
    ...overrides,
  });

  describe("when config flag is enabled", () => {
    test("adds #content anchor to navigation url", () => {
      const data = createData();
      const nav = { key: "Products", parent: "Home", order: 1 };

      const result = withNavigationAnchor(data, nav);

      expect(result).toEqual({
        key: "Products",
        parent: "Home",
        order: 1,
        url: "/products/#content",
      });
    });

    test("preserves existing url if already set", () => {
      const data = createData();
      const nav = {
        key: "External",
        url: "https://example.com",
        order: 1,
      };

      const result = withNavigationAnchor(data, nav);

      expect(result).toEqual({
        key: "External",
        url: "https://example.com",
        order: 1,
      });
    });

    test("returns false when nav is false", () => {
      const data = createData();

      const result = withNavigationAnchor(data, false);

      expect(result).toBe(false);
    });

    test("returns undefined when nav is undefined", () => {
      const data = createData();

      const result = withNavigationAnchor(data, undefined);

      expect(result).toBeUndefined();
    });

    test("returns null when nav is null", () => {
      const data = createData();

      const result = withNavigationAnchor(data, null);

      expect(result).toBeNull();
    });
  });

  describe("when config flag is disabled", () => {
    const disabledConfigs = [
      ["flag is false", { navigation_content_anchor: false }],
      ["flag is missing", {}],
      ["config is undefined", undefined],
    ];

    for (const [scenario, configValue] of disabledConfigs) {
      test(`returns nav unchanged when ${scenario}`, () => {
        const data = createData({ config: configValue });
        const nav = { key: "Products", order: 1 };

        const result = withNavigationAnchor(data, nav);

        expect(result).toEqual({ key: "Products", order: 1 });
      });
    }

    test("returns exact same object reference when disabled", () => {
      const data = createData({ config: { navigation_content_anchor: false } });
      const nav = { key: "Products", order: 1 };

      const result = withNavigationAnchor(data, nav);

      expect(result).toBe(nav);
    });
  });

  describe("edge cases", () => {
    test("handles nested paths correctly", () => {
      const data = createData({
        page: { url: "/products/category/item/" },
      });
      const nav = { key: "Item", order: 1 };

      const result = withNavigationAnchor(data, nav);

      expect(result.url).toBe("/products/category/item/#content");
    });

    test("handles root url", () => {
      const data = createData({
        page: { url: "/" },
      });
      const nav = { key: "Home", order: 1 };

      const result = withNavigationAnchor(data, nav);

      expect(result.url).toBe("/#content");
    });
  });
});
