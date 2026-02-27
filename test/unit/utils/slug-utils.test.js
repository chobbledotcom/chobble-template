import { describe, expect, test } from "bun:test";
import {
  buildPdfFilename,
  buildPermalink,
  normalisePermalink,
  normaliseSlug,
} from "#utils/slug-utils.js";

describe("normaliseSlug", () => {
  test("returns falsy values unchanged", () => {
    expect(normaliseSlug(null)).toBe(null);
    expect(normaliseSlug(undefined)).toBe(undefined);
    expect(normaliseSlug("")).toBe("");
  });

  test("removes .md extension", () => {
    expect(normaliseSlug("menu.md")).toBe("menu");
  });

  test("extracts filename from full path", () => {
    expect(normaliseSlug("content/menus/lunch.md")).toBe("lunch");
  });

  test("handles paths without extension", () => {
    expect(normaliseSlug("content/menus/lunch")).toBe("lunch");
  });

  test("handles simple slugs without path or extension", () => {
    expect(normaliseSlug("my-slug")).toBe("my-slug");
    expect(normaliseSlug("simple")).toBe("simple");
  });

  test("preserves dots in filename, only removing .md extension", () => {
    expect(normaliseSlug("categories/v2.0-widgets.md")).toBe("v2.0-widgets");
    expect(normaliseSlug("products/1.5-inch-nails.md")).toBe("1.5-inch-nails");
  });
});

describe("normalisePermalink", () => {
  test("adds leading and trailing slashes to bare slug", () => {
    expect(normalisePermalink("foo-bar")).toBe("/foo-bar/");
  });

  test("adds trailing slash when only leading slash present", () => {
    expect(normalisePermalink("/foo-bar")).toBe("/foo-bar/");
  });

  test("adds leading slash when only trailing slash present", () => {
    expect(normalisePermalink("foo-bar/")).toBe("/foo-bar/");
  });

  test("returns already-normalised permalink unchanged", () => {
    expect(normalisePermalink("/custom/path/")).toBe("/custom/path/");
  });

  test("returns root permalink unchanged", () => {
    expect(normalisePermalink("/")).toBe("/");
  });

  test("does not modify Liquid templates", () => {
    expect(normalisePermalink("/{{ page.fileSlug }}/index.html")).toBe(
      "/{{ page.fileSlug }}/index.html",
    );
  });

  test("does not modify paths with file extensions", () => {
    expect(normalisePermalink("/page/index.html")).toBe("/page/index.html");
    expect(normalisePermalink("feed.xml")).toBe("feed.xml");
  });

  test("returns non-string values unchanged", () => {
    expect(normalisePermalink(false)).toBe(false);
    expect(normalisePermalink(undefined)).toBe(undefined);
    expect(normalisePermalink(null)).toBe(null);
  });

  test("normalises multi-segment bare paths", () => {
    expect(normalisePermalink("special-products/my-product")).toBe(
      "/special-products/my-product/",
    );
  });
});

describe("buildPermalink", () => {
  test("normalises existing permalink if set", () => {
    const data = { permalink: "/custom/path/", page: { fileSlug: "ignored" } };
    expect(buildPermalink(data, "products")).toBe("/custom/path/");
  });

  test("normalises bare slug permalink", () => {
    const data = {
      permalink: "specsavers-case-study",
      page: { fileSlug: "ignored" },
    };
    expect(buildPermalink(data, "products")).toBe("/specsavers-case-study/");
  });

  test("builds permalink from dir and fileSlug when no permalink set", () => {
    const data = { page: { fileSlug: "my-product" } };
    expect(buildPermalink(data, "products")).toBe("/products/my-product/");
  });

  test("builds permalink for different directories", () => {
    const data = { page: { fileSlug: "about-us" } };
    expect(buildPermalink(data, "pages")).toBe("/pages/about-us/");
    expect(buildPermalink(data, "news")).toBe("/news/about-us/");
  });

  test("returns undefined permalink if explicitly set to undefined", () => {
    const data = { permalink: undefined, page: { fileSlug: "test" } };
    expect(buildPermalink(data, "dir")).toBe("/dir/test/");
  });

  test("builds permalink when permalink is falsy (false)", () => {
    const data = { permalink: false, page: { fileSlug: "draft" } };
    expect(buildPermalink(data, "posts")).toBe("/posts/draft/");
  });
});

describe("buildPdfFilename", () => {
  test("builds PDF filename from business name and menu slug", () => {
    const result = buildPdfFilename("My Restaurant", "lunch-menu");
    expect(result).toBe("my-restaurant-lunch-menu.pdf");
  });

  test("slugifies business name with special characters", () => {
    const result = buildPdfFilename("Café & Bistro", "dinner");
    expect(result).toBe("cafe-and-bistro-dinner.pdf");
  });

  test("handles already-slugified business name", () => {
    const result = buildPdfFilename("simple-name", "menu");
    expect(result).toBe("simple-name-menu.pdf");
  });

  test("handles business name with numbers", () => {
    const result = buildPdfFilename("Restaurant 42", "specials");
    expect(result).toBe("restaurant-42-specials.pdf");
  });

  test("handles business name with apostrophes", () => {
    const result = buildPdfFilename("Joe's Diner", "breakfast");
    expect(result).toBe("joes-diner-breakfast.pdf");
  });
});
