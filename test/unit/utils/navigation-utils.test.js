import { describe, expect, test } from "bun:test";
import {
  buildNavigation,
  withNavigationAnchor,
} from "#utils/navigation-utils.js";

// Curried factory: (defaultUrl) => (overrides) => data
const createDataWithUrl =
  (defaultUrl) =>
  (overrides = {}) => ({
    config: { internal_link_suffix: "#content" },
    page: { url: defaultUrl },
    ...overrides,
  });

describe("withNavigationAnchor", () => {
  const createData = createDataWithUrl("/products/");

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
  });

  describe("when config flag is disabled", () => {
    // Helper: test that nav is returned unchanged (both value and reference)
    const expectNavUnchanged = (configValue) => {
      const data = createData({ config: configValue });
      const nav = { key: "Products", order: 1 };
      const result = withNavigationAnchor(data, nav);
      expect(result).toEqual({ key: "Products", order: 1 });
      expect(result).toBe(nav); // Same object reference
    };

    test("returns nav unchanged when suffix is empty string", () => {
      expectNavUnchanged({ internal_link_suffix: "" });
    });

    test("returns nav unchanged when suffix is missing", () => {
      expectNavUnchanged({});
    });

    test("returns nav unchanged when config is undefined", () => {
      expectNavUnchanged(undefined);
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

describe("buildNavigation", () => {
  const createData = createDataWithUrl("/test/");

  test("uses withNavigationAnchor when eleventyNavigation is present", () => {
    const data = createData({
      eleventyNavigation: { key: "Test", order: 1 },
    });

    const result = buildNavigation(data, () => ({ key: "Fallback" }));

    expect(result).toEqual({
      key: "Test",
      order: 1,
      url: "/test/#content",
    });
  });

  test("calls buildNav function when eleventyNavigation is not present", () => {
    const data = createData();

    const result = buildNavigation(data, (d) => ({
      key: "Built",
      url: d.page.url,
    }));

    expect(result).toEqual({
      key: "Built",
      url: "/test/",
    });
  });

  test("passes data to buildNav function", () => {
    const data = createData({ customField: "value" });
    let receivedData = null;

    buildNavigation(data, (d) => {
      receivedData = d;
      return { key: "Test" };
    });

    expect(receivedData).toBe(data);
    expect(receivedData.customField).toBe("value");
  });
});
