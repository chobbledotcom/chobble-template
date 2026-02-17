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

  test("merges filter_data with parsed filter_attributes", () => {
    const config = createMockEleventyConfig();
    configureItemFilterData(config);
    const filter = config.filters.toFilterJsonAttr;

    const filterData = { title: "test product", price: 99 };
    const filterAttributes = [
      { name: "Size", value: "Large" },
      { name: "Color", value: "Red" },
    ];

    const escaped = filter(filterData, filterAttributes);
    const parsed = JSON.parse(unescapeHtml(escaped));

    expect(parsed).toEqual({
      title: "test product",
      price: 99,
      filters: { size: "large", color: "red" },
    });
  });

  test("handles empty filter_attributes", () => {
    const config = createMockEleventyConfig();
    configureItemFilterData(config);
    const filter = config.filters.toFilterJsonAttr;

    const filterData = { title: "test product", price: 0 };
    const parsed = JSON.parse(unescapeHtml(filter(filterData, [])));

    expect(parsed.filters).toEqual({});
  });

  test("escapes HTML entities for safe attribute embedding", () => {
    const config = createMockEleventyConfig();
    configureItemFilterData(config);
    const filter = config.filters.toFilterJsonAttr;

    const filterData = { title: 'salt & pepper "deluxe"', price: 0 };
    const result = filter(filterData, []);

    expect(result).toContain("&amp;");
    expect(result).toContain("&quot;");
    expect(result).not.toContain('"salt & pepper');
  });

  test("escapes angle brackets to prevent XSS", () => {
    const config = createMockEleventyConfig();
    configureItemFilterData(config);
    const filter = config.filters.toFilterJsonAttr;

    const filterData = { title: "<script>alert('xss')</script>", price: 0 };
    const result = filter(filterData, []);

    expect(result).toContain("&lt;");
    expect(result).toContain("&gt;");
    expect(result).not.toContain("<script>");
  });

  test("round-trips through JSON.parse after unescaping", () => {
    const config = createMockEleventyConfig();
    configureItemFilterData(config);
    const filter = config.filters.toFilterJsonAttr;

    const filterData = { title: 'test & <special> "product"', price: 99 };
    const filterAttributes = [
      { name: "Brand", value: "Acme & Co" },
      { name: "Category", value: "Home>Garden" },
    ];

    const escaped = filter(filterData, filterAttributes);
    const parsed = JSON.parse(unescapeHtml(escaped));

    expect(parsed.title).toBe('test & <special> "product"');
    expect(parsed.filters.brand).toBe("acme-and-co");
    expect(parsed.filters.category).toBe("home-garden");
  });
});
