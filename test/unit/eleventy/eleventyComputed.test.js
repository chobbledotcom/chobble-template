import { describe, expect, test } from "bun:test";
import eleventyComputed from "#data/eleventyComputed.js";

describe("eleventyComputed.filter_data", () => {
  test("lowercases title", () => {
    const data = {
      title: "UPPERCASE PRODUCT",
      page: { fileSlug: "test" },
    };

    const result = eleventyComputed.filter_data(data);
    expect(result.title).toBe("uppercase product");
  });

  test("extracts lowest option price", () => {
    const data = {
      title: "Test Product",
      page: { fileSlug: "test" },
      options: [{ unit_price: 100 }, { unit_price: 50 }, { unit_price: 75 }],
    };

    const result = eleventyComputed.filter_data(data);
    expect(result.price).toBe(50);
  });

  test("handles missing options with price 0", () => {
    const data = {
      title: "Test Product",
      page: { fileSlug: "test" },
    };

    const result = eleventyComputed.filter_data(data);
    expect(result.price).toBe(0);
  });

  test("handles empty options array with price 0", () => {
    const data = {
      title: "Test Product",
      page: { fileSlug: "test" },
      options: [],
    };

    const result = eleventyComputed.filter_data(data);
    expect(result.price).toBe(0);
  });

  test("handles options with missing unit_price", () => {
    const data = {
      title: "Test Product",
      page: { fileSlug: "test" },
      options: [{ unit_price: 100 }, {}, { unit_price: 50 }],
    };

    const result = eleventyComputed.filter_data(data);
    expect(result.price).toBe(0);
  });

  test("parses filter_attributes into slugified filters", () => {
    const data = {
      title: "Test Product",
      page: { fileSlug: "test" },
      filter_attributes: [
        { name: "Size", value: "Large" },
        { name: "Color", value: "Red" },
      ],
    };

    const result = eleventyComputed.filter_data(data);
    expect(result.filters).toEqual({
      size: "large",
      color: "red",
    });
  });

  test("handles missing filter_attributes with empty filters object", () => {
    const data = {
      title: "Test Product",
      page: { fileSlug: "test" },
    };

    const result = eleventyComputed.filter_data(data);
    expect(result.filters).toEqual({});
  });

  test("includes slug from page.fileSlug", () => {
    const data = {
      title: "Test Product",
      page: { fileSlug: "my-product-slug" },
    };

    const result = eleventyComputed.filter_data(data);
    expect(result.slug).toBe("my-product-slug");
  });

  test("handles missing page.fileSlug with empty string", () => {
    const data = {
      title: "Test Product",
      page: {},
    };

    const result = eleventyComputed.filter_data(data);
    expect(result.slug).toBe("");
  });

  test("handles missing title with empty string", () => {
    const data = {
      page: { fileSlug: "test" },
    };

    const result = eleventyComputed.filter_data(data);
    expect(result.title).toBe("");
  });

  test("complete filter_data structure", () => {
    const data = {
      title: "Premium Widget",
      page: { fileSlug: "premium-widget" },
      options: [{ unit_price: 99 }, { unit_price: 149 }],
      filter_attributes: [
        { name: "Brand", value: "Acme Corp" },
        { name: "Material", value: "Stainless Steel" },
      ],
    };

    const result = eleventyComputed.filter_data(data);
    expect(result).toEqual({
      slug: "premium-widget",
      title: "premium widget",
      price: 99,
      filters: {
        brand: "acme-corp",
        material: "stainless-steel",
      },
    });
  });
});
