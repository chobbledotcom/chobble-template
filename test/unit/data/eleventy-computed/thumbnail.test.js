import { describe, expect, test } from "vitest";
import eleventyComputed from "#data/eleventyComputed.js";
import { getPlaceholderForPath } from "#media/thumbnail-placeholder.js";

const pageAt = (url = "/some-page/") => ({ url });

describe("eleventyComputed.thumbnail", () => {
  test("returns explicit thumbnail when specified", () => {
    const result = eleventyComputed.thumbnail({
      tags: ["pages"],
      thumbnail: "https://example.com/photo.jpg",
      page: pageAt("/some-page/"),
    });
    expect(result).toBe("https://example.com/photo.jpg");
  });

  test("returns placeholder for tagged items without thumbnail", () => {
    const result = eleventyComputed.thumbnail({
      tags: ["pages"],
      page: pageAt("/pages/test-page/"),
    });
    expect(result).toBe(getPlaceholderForPath("/pages/test-page/"));
  });

  test("returns null when placeholder_images disabled and no thumbnail", () => {
    const result = eleventyComputed.thumbnail({
      tags: ["pages"],
      page: pageAt("/pages/test-page/"),
      config: { placeholder_images: false },
    });
    expect(result).toBe(null);
  });

  test("returns placeholder for items without any tags", () => {
    const result = eleventyComputed.thumbnail({ page: pageAt("/page/") });
    expect(result).toBe(getPlaceholderForPath("/page/"));
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
      tags: ["pages"],
      thumbnail: "/images/placeholders/blue.svg",
      page: pageAt("/pages/test/"),
    });
    expect(result).toBe("/images/placeholders/blue.svg");
  });

  test("falls back to first gallery image when no thumbnail is set", () => {
    const result = eleventyComputed.thumbnail({
      tags: ["pages"],
      gallery: [
        "https://example.com/gallery1.jpg",
        "https://example.com/gallery2.jpg",
      ],
      page: pageAt("/pages/test/"),
    });
    expect(result).toBe("https://example.com/gallery1.jpg");
  });

  test("prefers thumbnail over gallery", () => {
    const result = eleventyComputed.thumbnail({
      tags: ["pages"],
      thumbnail: "https://example.com/thumb.jpg",
      gallery: ["https://example.com/gallery.jpg"],
      page: pageAt("/pages/test/"),
    });
    expect(result).toBe("https://example.com/thumb.jpg");
  });

  test("throws when thumbnail references a missing local file", () => {
    expect(() =>
      eleventyComputed.thumbnail({
        tags: ["pages"],
        thumbnail: "/images/does-not-exist.jpg",
        page: pageAt("/pages/test/"),
      }),
    ).toThrow("Image file not found");
  });
});
