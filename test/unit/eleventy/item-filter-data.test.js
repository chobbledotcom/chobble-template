import { describe, expect, test } from "bun:test";
import { configureItemFilterData } from "#eleventy/item-filter-data.js";
import { createMockEleventyConfig } from "#test/test-utils.js";

/**
 * Unescape HTML entities in a string
 * @param {string} str - String with HTML entities
 * @returns {string} Unescaped string
 */
const unescapeHtml = (str) =>
  str
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");

describe("configureItemFilterData", () => {
  test("registers toFilterJsonAttr filter", () => {
    const config = createMockEleventyConfig();
    configureItemFilterData(config);
    expect(config.filters.toFilterJsonAttr).toBeDefined();
  });

  test("serializes filter_data to escaped JSON", () => {
    const config = createMockEleventyConfig();
    configureItemFilterData(config);
    const filter = config.filters.toFilterJsonAttr;

    const filterData = {
      title: "test product",
      price: 99,
      filters: { size: "large", color: "red" },
    };

    const escaped = filter(filterData);
    const parsed = JSON.parse(unescapeHtml(escaped));

    expect(parsed).toEqual(filterData);
  });

  test("escapes HTML entities for safe attribute embedding", () => {
    const config = createMockEleventyConfig();
    configureItemFilterData(config);
    const filter = config.filters.toFilterJsonAttr;

    const result = filter({ title: 'salt & pepper "deluxe"' });

    expect(result).toContain("&amp;");
    expect(result).toContain("&quot;");
    expect(result).not.toContain('"salt & pepper');
  });

  test("escapes angle brackets to prevent XSS", () => {
    const config = createMockEleventyConfig();
    configureItemFilterData(config);
    const filter = config.filters.toFilterJsonAttr;

    const result = filter({ title: "<script>alert('xss')</script>" });

    expect(result).toContain("&lt;");
    expect(result).toContain("&gt;");
    expect(result).not.toContain("<script>");
  });

  test("round-trips through JSON.parse after unescaping", () => {
    const config = createMockEleventyConfig();
    configureItemFilterData(config);
    const filter = config.filters.toFilterJsonAttr;

    const original = {
      title: 'test & <special> "product"',
      price: 99,
      filters: { brand: "acme", category: "home-garden" },
    };

    const escaped = filter(original);
    const parsed = JSON.parse(unescapeHtml(escaped));
    expect(parsed).toEqual(original);
  });
});
