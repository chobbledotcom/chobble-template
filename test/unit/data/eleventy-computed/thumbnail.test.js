import { describe, expect, test } from "bun:test";
import eleventyComputed from "#data/eleventyComputed.js";
import { PLACEHOLDER_COLORS } from "#media/thumbnail-placeholder.js";

/** Matches any placeholder path written by thumbnail-placeholder.js. */
const PLACEHOLDER_PATH = new RegExp(
  `^images/placeholders/(${PLACEHOLDER_COLORS.join("|")})\\.svg$`,
);

const pageAt = (url = "/some-page/") => ({ url });

describe("eleventyComputed.thumbnail", () => {
  test("returns null for reviews without explicit thumbnail", () => {
    const result = eleventyComputed.thumbnail({
      tags: ["reviews"],
      page: pageAt("/reviews/some-review/"),
    });
    expect(result).toBe(null);
  });

  test("returns explicit thumbnail for reviews when specified", () => {
    const result = eleventyComputed.thumbnail({
      tags: ["reviews"],
      thumbnail: "https://example.com/photo.jpg",
      page: pageAt("/reviews/some-review/"),
    });
    expect(result).toBe("https://example.com/photo.jpg");
  });

  test("returns placeholder for non-reviews without thumbnail", () => {
    const result = eleventyComputed.thumbnail({
      tags: ["products"],
      page: pageAt("/products/test-product/"),
    });
    expect(result).toMatch(PLACEHOLDER_PATH);
  });

  test("returns null when placeholder_images disabled and no thumbnail", () => {
    const result = eleventyComputed.thumbnail({
      tags: ["products"],
      page: pageAt("/products/test-product/"),
      config: { placeholder_images: false },
    });
    expect(result).toBe(null);
  });

  test("returns placeholder for items without any tags", () => {
    const result = eleventyComputed.thumbnail({ page: pageAt("/page/") });
    expect(result).toMatch(PLACEHOLDER_PATH);
  });

  test("returns null when page.url is missing, even with placeholders enabled", () => {
    const result = eleventyComputed.thumbnail({
      tags: ["pages"],
      config: { placeholder_images: true },
    });
    expect(result).toBe(null);
  });

  test("returns local thumbnail path when the file exists on disk", () => {
    const result = eleventyComputed.thumbnail({
      tags: ["products"],
      thumbnail: "/images/placeholders/blue.svg",
      page: pageAt("/products/test/"),
    });
    expect(result).toBe("/images/placeholders/blue.svg");
  });

  test("falls back to first gallery image when no thumbnail is set", () => {
    const result = eleventyComputed.thumbnail({
      tags: ["products"],
      gallery: [
        "https://example.com/gallery1.jpg",
        "https://example.com/gallery2.jpg",
      ],
      page: pageAt("/products/test/"),
    });
    expect(result).toBe("https://example.com/gallery1.jpg");
  });

  test("falls back to header_image when no thumbnail or gallery is set", () => {
    const result = eleventyComputed.thumbnail({
      tags: ["products"],
      header_image: "https://example.com/header.jpg",
      page: pageAt("/products/test/"),
    });
    expect(result).toBe("https://example.com/header.jpg");
  });

  test("prefers thumbnail over gallery and header_image", () => {
    const result = eleventyComputed.thumbnail({
      tags: ["products"],
      thumbnail: "https://example.com/thumb.jpg",
      gallery: ["https://example.com/gallery.jpg"],
      header_image: "https://example.com/header.jpg",
      page: pageAt("/products/test/"),
    });
    expect(result).toBe("https://example.com/thumb.jpg");
  });

  test("throws when thumbnail references a missing local file", () => {
    expect(() =>
      eleventyComputed.thumbnail({
        tags: ["products"],
        thumbnail: "/images/does-not-exist.jpg",
        page: pageAt("/products/test/"),
      }),
    ).toThrow("Image file not found");
  });
});
