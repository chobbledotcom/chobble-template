import { describe, expect, test } from "bun:test";
import eleventyComputed from "#data/eleventyComputed.js";

const site = { name: "Test Site", url: "https://test.com" };

describe("eleventyComputed.meta", () => {
  test("returns product-shaped meta when the page is tagged 'products'", () => {
    const result = eleventyComputed.meta({
      tags: ["products"],
      title: "Test Product",
      site,
      page: { url: "/products/test/" },
    });
    expect(result.name).toBe("Test Product");
    expect(result.brand).toBe("Test Site");
  });

  test("returns post-shaped meta when the page is tagged 'news'", () => {
    const result = eleventyComputed.meta({
      tags: ["news"],
      title: "Test Post",
      site,
      page: { url: "/news/test-post/", date: new Date("2024-01-15") },
    });
    expect(result.author.name).toBe("Test Site");
    expect(result.publisher.name).toBe("Test Site");
    expect(result.datePublished).toBe("2024-01-15");
  });

  test("returns organization-shaped meta for contact layouts", () => {
    const result = eleventyComputed.meta({
      layout: "contact.html",
      title: "Contact Us",
      site,
      page: { url: "/contact/" },
    });
    expect(result.title).toBe("Contact Us");
    expect(result.url).toBeDefined();
  });

  test("returns base meta for pages without a product/news/contact signal", () => {
    const result = eleventyComputed.meta({
      tags: ["pages"],
      title: "About Us",
      site,
      page: { url: "/about/" },
    });
    expect(result.title).toBe("About Us");
    expect(result.url).toBeDefined();
  });

  test("returns undefined when no_index is set, regardless of tags", () => {
    expect(
      eleventyComputed.meta({
        tags: ["products"],
        title: "Secret Product",
        no_index: true,
        site,
        page: { url: "/secret/" },
      }),
    ).toBeUndefined();
  });
});

describe("eleventyComputed.metaComputed", () => {
  test("returns the metaComputed object as-is when set", () => {
    const metaComputed = { customField: "value" };
    expect(eleventyComputed.metaComputed({ metaComputed })).toBe(metaComputed);
  });

  test("returns an empty object when metaComputed is not set", () => {
    expect(eleventyComputed.metaComputed({})).toEqual({});
  });

  test("returns an empty object when no_index is set, dropping metaComputed", () => {
    expect(
      eleventyComputed.metaComputed({
        no_index: true,
        metaComputed: { customField: "leaky" },
      }),
    ).toEqual({});
  });
});
