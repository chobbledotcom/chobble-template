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

  test("toFilterJsonAttr escapes quotes", () => {
    const config = createMockEleventyConfig();
    configureItemFilterData(config);
    const filter = config.filters.toFilterJsonAttr;

    const result = filter({ name: 'Product "Special"' });
    expect(result).toContain("&quot;");
    expect(result).not.toContain('"Product "Special"');
  });

  test("toFilterJsonAttr escapes ampersands", () => {
    const config = createMockEleventyConfig();
    configureItemFilterData(config);
    const filter = config.filters.toFilterJsonAttr;

    const result = filter({ name: "Salt & Pepper" });
    expect(result).toContain("&amp;");
    expect(result).not.toContain("Salt & Pepper");
  });

  test("toFilterJsonAttr escapes angle brackets", () => {
    const config = createMockEleventyConfig();
    configureItemFilterData(config);
    const filter = config.filters.toFilterJsonAttr;

    const result = filter({ name: "<script>alert('xss')</script>" });
    expect(result).toContain("&lt;");
    expect(result).toContain("&gt;");
    expect(result).not.toContain("<script>");
  });

  test("toFilterJsonAttr round-trips through JSON.parse after unescaping", () => {
    const config = createMockEleventyConfig();
    configureItemFilterData(config);
    const filter = config.filters.toFilterJsonAttr;

    const original = {
      slug: "test-product",
      title: 'test & <special> "product"',
      price: 99,
      filters: { size: "large", color: "red" },
    };

    const escaped = filter(original);

    // Unescape HTML entities
    const parsed = JSON.parse(unescapeHtml(escaped));
    expect(parsed).toEqual(original);
  });

  test("toFilterJsonAttr handles complex nested objects", () => {
    const config = createMockEleventyConfig();
    configureItemFilterData(config);
    const filter = config.filters.toFilterJsonAttr;

    const original = {
      slug: "complex",
      title: "complex product",
      price: 0,
      filters: {
        "brand-name": "test&co",
        category: "home>garden",
      },
    };

    const escaped = filter(original);
    expect(escaped).toContain("&amp;");
    expect(escaped).toContain("&gt;");

    // Verify it can be unescaped and parsed
    const parsed = JSON.parse(unescapeHtml(escaped));
    expect(parsed.filters["brand-name"]).toBe("test&co");
    expect(parsed.filters.category).toBe("home>garden");
  });
});
