import { describe, expect, test } from "bun:test";
import {
  buildImgAttributes,
  buildWrapperStyles,
  filenameFormat,
  getPathAwareBasename,
  isExternalUrl,
  normalizeImagePath,
  parseWidths,
} from "#media/image-utils.js";

describe("image-utils", () => {
  describe("normalizeImagePath", () => {
    test("prepends ./src for paths starting with /", () => {
      expect(normalizeImagePath("/images/photo.jpg")).toBe(
        "./src/images/photo.jpg",
      );
    });

    test("prepends ./ for paths starting with src/", () => {
      expect(normalizeImagePath("src/images/photo.jpg")).toBe(
        "./src/images/photo.jpg",
      );
    });

    test("prepends ./src/ for paths starting with images/", () => {
      expect(normalizeImagePath("images/photo.jpg")).toBe(
        "./src/images/photo.jpg",
      );
    });

    test("prepends ./src/images/ for bare filenames", () => {
      expect(normalizeImagePath("photo.jpg")).toBe("./src/images/photo.jpg");
    });
  });

  describe("isExternalUrl", () => {
    test("returns true for http:// URLs", () => {
      expect(isExternalUrl("http://example.com/image.jpg")).toBe(true);
    });

    test("returns true for https:// URLs", () => {
      expect(isExternalUrl("https://example.com/image.jpg")).toBe(true);
    });

    test("returns false for relative paths", () => {
      expect(isExternalUrl("/images/photo.jpg")).toBe(false);
    });

    test("returns false for bare filenames", () => {
      expect(isExternalUrl("photo.jpg")).toBe(false);
    });
  });

  describe("parseWidths", () => {
    test("splits comma-separated string into array", () => {
      expect(parseWidths("240,480,900")).toEqual(["240", "480", "900"]);
    });

    test("returns array as-is", () => {
      const widths = [240, 480, 900];
      expect(parseWidths(widths)).toBe(widths);
    });

    test("returns default widths for null/undefined", () => {
      const result = parseWidths(null);
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
    });
  });

  describe("buildImgAttributes", () => {
    test("builds attributes with provided values", () => {
      const attrs = buildImgAttributes({
        alt: "A photo",
        sizes: "100vw",
        loading: "eager",
      });
      expect(attrs).toEqual({
        alt: "A photo",
        sizes: "100vw",
        loading: "eager",
        decoding: "async",
      });
    });

    test("uses defaults for missing values", () => {
      const attrs = buildImgAttributes({});
      expect(attrs.alt).toBe("");
      expect(attrs.loading).toBe("lazy");
      expect(attrs.decoding).toBe("async");
    });

    test("includes src when provided", () => {
      const attrs = buildImgAttributes({
        src: "https://example.com/image.jpg",
        alt: "External image",
      });
      expect(attrs.src).toBe("https://example.com/image.jpg");
      expect(attrs.alt).toBe("External image");
    });

    test("includes class when provided", () => {
      const attrs = buildImgAttributes({ alt: "Photo", classes: "featured" });
      expect(attrs.class).toBe("featured");
    });

    test("omits src and class when not provided", () => {
      const attrs = buildImgAttributes({ alt: "Photo" });
      expect(attrs).not.toHaveProperty("src");
      expect(attrs).not.toHaveProperty("class");
    });
  });

  describe("buildWrapperStyles", () => {
    const mockGetAspectRatio = (ratio, _metadata) => ratio || "auto";

    test("builds style string with background image", () => {
      const styles = buildWrapperStyles(
        "url(thumb.jpg)",
        "16:9",
        { width: 800 },
        mockGetAspectRatio,
      );
      expect(styles).toContain("background-image: url(thumb.jpg)");
      expect(styles).toContain("aspect-ratio: 16:9");
      expect(styles).toContain("max-width: min(800px, 100%)");
    });

    test("omits background image when not provided", () => {
      const styles = buildWrapperStyles(
        null,
        "16:9",
        { width: 800 },
        mockGetAspectRatio,
      );
      expect(styles).not.toContain("background-image");
    });

    test("omits max-width when metadata has no width", () => {
      const styles = buildWrapperStyles(null, "16:9", {}, mockGetAspectRatio);
      expect(styles).not.toContain("max-width");
    });
  });

  describe("getPathAwareBasename", () => {
    test("extracts basename for images in root images folder", () => {
      expect(getPathAwareBasename("./src/images/photo.jpg")).toBe("photo");
    });

    test("includes subdirectory in basename for nested images", () => {
      expect(getPathAwareBasename("./src/images/products/photo.jpg")).toBe(
        "products-photo",
      );
    });

    test("handles multiple subdirectory levels", () => {
      expect(
        getPathAwareBasename("./src/images/products/featured/photo.jpg"),
      ).toBe("products-featured-photo");
    });

    test("handles paths without ./ prefix", () => {
      expect(getPathAwareBasename("src/images/products/photo.jpg")).toBe(
        "products-photo",
      );
    });

    test("handles paths starting with images/", () => {
      expect(getPathAwareBasename("images/products/photo.jpg")).toBe(
        "products-photo",
      );
    });

    test("handles Windows-style backslashes", () => {
      expect(getPathAwareBasename(".\\src\\images\\products\\photo.jpg")).toBe(
        "products-photo",
      );
    });

    test("preserves path for non-images directories", () => {
      expect(getPathAwareBasename("./src/assets/icons/logo.png")).toBe(
        "assets-icons-logo",
      );
    });

    test("handles paths outside src directory", () => {
      expect(getPathAwareBasename("/other/path/photo.jpg")).toBe(
        "other-path-photo",
      );
    });

    test("handles various image extensions", () => {
      expect(getPathAwareBasename("./src/images/products/item.png")).toBe(
        "products-item",
      );
      expect(getPathAwareBasename("./src/images/news/banner.webp")).toBe(
        "news-banner",
      );
    });
  });

  describe("filenameFormat", () => {
    test("generates correct filename for root images", () => {
      expect(filenameFormat("id", "./src/images/photo.jpg", 240, "webp")).toBe(
        "photo-240.webp",
      );
    });

    test("generates correct filename for nested images", () => {
      expect(
        filenameFormat("id", "./src/images/products/photo.jpg", 240, "webp"),
      ).toBe("products-photo-240.webp");
    });

    test("generates correct filename for deeply nested images", () => {
      expect(
        filenameFormat(
          "id",
          "./src/images/products/featured/photo.jpg",
          480,
          "jpeg",
        ),
      ).toBe("products-featured-photo-480.jpeg");
    });

    test("generates correct filename for non-images directories", () => {
      expect(
        filenameFormat("id", "./src/assets/icons/logo.png", 240, "webp"),
      ).toBe("assets-icons-logo-240.webp");
    });

    test("different paths with same filename produce different output", () => {
      const productsResult = filenameFormat(
        "id",
        "./src/images/products/photo.jpg",
        240,
        "webp",
      );
      const newsResult = filenameFormat(
        "id",
        "./src/images/news/photo.jpg",
        240,
        "webp",
      );
      expect(productsResult).not.toBe(newsResult);
      expect(productsResult).toBe("products-photo-240.webp");
      expect(newsResult).toBe("news-photo-240.webp");
    });
  });
});
