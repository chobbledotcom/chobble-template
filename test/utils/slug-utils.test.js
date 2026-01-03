import assert from "node:assert";
import { describe, it } from "node:test";
import {
  buildPdfFilename,
  buildPermalink,
  normaliseSlug,
} from "#utils/slug-utils.js";

describe("normaliseSlug", () => {
  it("returns falsy values unchanged", () => {
    assert.strictEqual(normaliseSlug(null), null, "Null returns null");
    assert.strictEqual(
      normaliseSlug(undefined),
      undefined,
      "Undefined returns undefined",
    );
    assert.strictEqual(normaliseSlug(""), "", "Empty string returns empty");
  });

  it("removes .md extension", () => {
    assert.strictEqual(
      normaliseSlug("menu.md"),
      "menu",
      "Strips .md extension",
    );
  });

  it("extracts filename from full path", () => {
    assert.strictEqual(
      normaliseSlug("content/menus/lunch.md"),
      "lunch",
      "Extracts from path",
    );
  });

  it("handles paths without extension", () => {
    assert.strictEqual(
      normaliseSlug("content/menus/lunch"),
      "lunch",
      "Handles no extension",
    );
  });

  it("handles simple slugs without path or extension", () => {
    assert.strictEqual(
      normaliseSlug("my-slug"),
      "my-slug",
      "Passes through simple slug",
    );
    assert.strictEqual(
      normaliseSlug("simple"),
      "simple",
      "Passes through single word",
    );
  });

  it("preserves dots in filename, only removing .md extension", () => {
    assert.strictEqual(
      normaliseSlug("categories/v2.0-widgets.md"),
      "v2.0-widgets",
      "Preserves version number in slug",
    );
    assert.strictEqual(
      normaliseSlug("products/1.5-inch-nails.md"),
      "1.5-inch-nails",
      "Preserves decimal in slug",
    );
  });
});

describe("buildPermalink", () => {
  it("returns existing permalink if set", () => {
    const data = { permalink: "/custom/path/", page: { fileSlug: "ignored" } };
    assert.strictEqual(
      buildPermalink(data, "products"),
      "/custom/path/",
      "Uses existing permalink instead of building from slug",
    );
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
    assert.strictEqual(
      buildPermalink(data, "pages"),
      "/pages/about-us/",
      "Builds correct permalink for pages directory",
    );
    assert.strictEqual(
      buildPermalink(data, "news"),
      "/news/about-us/",
      "Builds correct permalink for news directory",
    );
  });

  it("returns undefined permalink if explicitly set to undefined", () => {
    const data = { permalink: undefined, page: { fileSlug: "test" } };
    assert.strictEqual(
      buildPermalink(data, "dir"),
      "/dir/test/",
      "Builds permalink when permalink is undefined",
    );
  });

  it("builds permalink when permalink is falsy (false)", () => {
    // When permalink is falsy (including false), the function builds a permalink
    // Draft pages in Eleventy typically wouldn't call buildPermalink
    const data = { permalink: false, page: { fileSlug: "draft" } };
    assert.strictEqual(
      buildPermalink(data, "posts"),
      "/posts/draft/",
      "Builds permalink when permalink is false",
    );
  });
});

describe("buildPdfFilename", () => {
  it("builds PDF filename from business name and menu slug", () => {
    const result = buildPdfFilename("My Restaurant", "lunch-menu");
    assert.strictEqual(
      result,
      "my-restaurant-lunch-menu.pdf",
      "Combines name and slug",
    );
  });

  it("slugifies business name with special characters", () => {
    const result = buildPdfFilename("Café & Bistro", "dinner");
    assert.strictEqual(
      result,
      "cafe-and-bistro-dinner.pdf",
      "Handles special chars",
    );
  });

  it("handles already-slugified business name", () => {
    const result = buildPdfFilename("simple-name", "menu");
    assert.strictEqual(
      result,
      "simple-name-menu.pdf",
      "Handles pre-slugified name",
    );
  });

  it("handles business name with numbers", () => {
    const result = buildPdfFilename("Restaurant 42", "specials");
    assert.strictEqual(
      result,
      "restaurant-42-specials.pdf",
      "Preserves numbers",
    );
  });

  it("handles business name with apostrophes", () => {
    const result = buildPdfFilename("Joe's Diner", "breakfast");
    assert.strictEqual(
      result,
      "joes-diner-breakfast.pdf",
      "Removes apostrophes",
    );
  });
});
