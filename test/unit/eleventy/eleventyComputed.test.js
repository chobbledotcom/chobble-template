import { describe, expect, test } from "bun:test";
import eleventyComputed from "#data/eleventyComputed.js";

describe("eleventyComputed.filter_data", () => {
  test("returns undefined for pages without tags", () => {
    const data = {
      title: "No Tags Page",
      page: { fileSlug: "test" },
    };

    expect(eleventyComputed.filter_data(data)).toBeUndefined();
  });

  test("lowercases title", () => {
    const data = {
      title: "UPPERCASE PRODUCT",
      tags: ["products"],
      page: { fileSlug: "test" },
    };

    const result = eleventyComputed.filter_data(data);
    expect(result.title).toBe("uppercase product");
  });

  test("extracts lowest option price", () => {
    const data = {
      title: "Test Product",
      tags: ["products"],
      page: { fileSlug: "test" },
      options: [{ unit_price: 100 }, { unit_price: 50 }, { unit_price: 75 }],
    };

    const result = eleventyComputed.filter_data(data);
    expect(result.price).toBe(50);
  });

  test("parses filter_attributes into slugified filters", () => {
    const data = {
      title: "Test Product",
      tags: ["products"],
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

  test("includes slug from page.fileSlug", () => {
    const data = {
      title: "Test Product",
      tags: ["products"],
      page: { fileSlug: "my-product-slug" },
    };

    const result = eleventyComputed.filter_data(data);
    expect(result.slug).toBe("my-product-slug");
  });

  test("complete filter_data structure", () => {
    const data = {
      title: "Premium Widget",
      tags: ["products"],
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
