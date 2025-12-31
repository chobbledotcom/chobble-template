import assert from "node:assert";
import { describe, it } from "node:test";
import {
  buildPdfFilename,
  buildPermalink,
  normaliseSlug,
} from "#utils/slug-utils.js";

describe("normaliseSlug", () => {
  it("returns falsy values unchanged", () => {
    assert.strictEqual(normaliseSlug(null), null);
    assert.strictEqual(normaliseSlug(undefined), undefined);
    assert.strictEqual(normaliseSlug(""), "");
  });

  it("removes file extension", () => {
    assert.strictEqual(normaliseSlug("menu.md"), "menu");
    assert.strictEqual(normaliseSlug("product.json"), "product");
  });

  it("extracts filename from full path", () => {
    assert.strictEqual(normaliseSlug("content/menus/lunch.md"), "lunch");
    assert.strictEqual(normaliseSlug("src/_data/products/item.json"), "item");
  });

  it("handles paths without extension", () => {
    assert.strictEqual(normaliseSlug("content/menus/lunch"), "lunch");
  });

  it("handles simple slugs without path or extension", () => {
    assert.strictEqual(normaliseSlug("my-slug"), "my-slug");
    assert.strictEqual(normaliseSlug("simple"), "simple");
  });

  it("handles paths with multiple dots in filename", () => {
    assert.strictEqual(normaliseSlug("path/to/file.test.js"), "file");
  });
});

describe("buildPermalink", () => {
  it("returns existing permalink if set", () => {
    const data = { permalink: "/custom/path/", page: { fileSlug: "ignored" } };
    assert.strictEqual(buildPermalink(data, "products"), "/custom/path/");
  });

  it("builds permalink from dir and fileSlug when no permalink set", () => {
    const data = { page: { fileSlug: "my-product" } };
    assert.strictEqual(
      buildPermalink(data, "products"),
      "/products/my-product/",
    );
  });

  it("builds permalink for different directories", () => {
    const data = { page: { fileSlug: "about-us" } };
    assert.strictEqual(buildPermalink(data, "pages"), "/pages/about-us/");
    assert.strictEqual(buildPermalink(data, "news"), "/news/about-us/");
  });

  it("returns undefined permalink if explicitly set to undefined", () => {
    const data = { permalink: undefined, page: { fileSlug: "test" } };
    assert.strictEqual(buildPermalink(data, "dir"), "/dir/test/");
  });

  it("builds permalink when permalink is falsy (false)", () => {
    // When permalink is falsy (including false), the function builds a permalink
    // Draft pages in Eleventy typically wouldn't call buildPermalink
    const data = { permalink: false, page: { fileSlug: "draft" } };
    assert.strictEqual(buildPermalink(data, "posts"), "/posts/draft/");
  });
});

describe("buildPdfFilename", () => {
  it("builds PDF filename from business name and menu slug", () => {
    const result = buildPdfFilename("My Restaurant", "lunch-menu");
    assert.strictEqual(result, "my-restaurant-lunch-menu.pdf");
  });

  it("slugifies business name with special characters", () => {
    const result = buildPdfFilename("Café & Bistro", "dinner");
    assert.strictEqual(result, "cafe-and-bistro-dinner.pdf");
  });

  it("handles already-slugified business name", () => {
    const result = buildPdfFilename("simple-name", "menu");
    assert.strictEqual(result, "simple-name-menu.pdf");
  });

  it("handles business name with numbers", () => {
    const result = buildPdfFilename("Restaurant 42", "specials");
    assert.strictEqual(result, "restaurant-42-specials.pdf");
  });

  it("handles business name with apostrophes", () => {
    const result = buildPdfFilename("Joe's Diner", "breakfast");
    assert.strictEqual(result, "joes-diner-breakfast.pdf");
  });
});
