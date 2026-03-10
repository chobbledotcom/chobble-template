import { describe, expect, test } from "bun:test";
import {
  buildImageWrapperStyles,
  buildWrapperStyles,
  filenameFormat,
  getPathAwareBasename,
  isExternalUrl,
  normalizeImagePath,
  parseWidths,
  prepareImageAttributes,
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
    test("splits comma-separated string into array and appends auto", () => {
      expect(parseWidths("240,480,900")).toEqual(["240", "480", "900", "auto"]);
    });

    test("spreads input array and appends auto", () => {
      const widths = [240, 480, 900];
      const result = parseWidths(widths);
      expect(result).toEqual([240, 480, 900, "auto"]);
      expect(result).not.toBe(widths);
    });

    test("returns default widths with auto appended for null/undefined", () => {
      const result = parseWidths(null);
      expect(Array.isArray(result)).toBe(true);
      expect(result).toEqual([240, 480, 900, 1300, "auto"]);
    });

    test("returns default widths with auto appended for empty string", () => {
      const result = parseWidths("");
      expect(result).toEqual([240, 480, 900, 1300, "auto"]);
    });
  });

  describe("prepareImageAttributes", () => {
    test("builds img and picture attributes with provided values", () => {
      const { imgAttributes, pictureAttributes } = prepareImageAttributes({
        alt: "A photo",
        sizes: "100vw",
        loading: "eager",
        classes: "featured",
      });
      expect(imgAttributes.alt).toBe("A photo");
      expect(imgAttributes.sizes).toBe("100vw");
      expect(imgAttributes.loading).toBe("eager");
      expect(imgAttributes.decoding).toBe("async");
      expect(pictureAttributes.class).toBe("featured");
    });

    test("uses defaults for missing img values", () => {
      const { imgAttributes } = prepareImageAttributes({});
      expect(imgAttributes.alt).toBe("");
      expect(imgAttributes.loading).toBe("lazy");
      expect(imgAttributes.decoding).toBe("async");
    });

    test("returns empty picture attributes when classes is null", () => {
      const { pictureAttributes } = prepareImageAttributes({
        alt: "Photo",
        classes: null,
      });
      expect(pictureAttributes).toEqual({});
    });

    test("returns empty picture attributes when classes is empty string", () => {
      const { pictureAttributes } = prepareImageAttributes({
        alt: "Photo",
        classes: "  ",
      });
      expect(pictureAttributes).toEqual({});
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

    test("omits max-width when skipMaxWidth is true", () => {
      const styles = buildWrapperStyles(
        null,
        "16:9",
        { width: 800 },
        mockGetAspectRatio,
        true,
      );
      expect(styles).not.toContain("max-width");
      expect(styles).toContain("aspect-ratio: 16:9");
    });

    test("includes max-width when skipMaxWidth is false", () => {
      const styles = buildWrapperStyles(
        null,
        "16:9",
        { width: 800 },
        mockGetAspectRatio,
        false,
      );
      expect(styles).toContain("max-width: min(800px, 100%)");
    });
  });

  describe("buildImageWrapperStyles", () => {
    test("builds style string with all properties", () => {
      const styles = buildImageWrapperStyles({
        bgImage: "url(thumb.jpg)",
        aspectRatio: "16/9",
        maxWidth: 800,
      });
      expect(styles).toContain("background-image: url(thumb.jpg)");
      expect(styles).toContain("aspect-ratio: 16/9");
      expect(styles).toContain("max-width: min(800px, 100%)");
    });

    test("omits background image when null", () => {
      const styles = buildImageWrapperStyles({
        bgImage: null,
        aspectRatio: "16/9",
        maxWidth: 800,
      });
      expect(styles).not.toContain("background-image");
    });

    test("omits aspect ratio when null", () => {
      const styles = buildImageWrapperStyles({
        bgImage: null,
        aspectRatio: null,
        maxWidth: 800,
      });
      expect(styles).not.toContain("aspect-ratio");
    });

    test("omits max-width when skipMaxWidth is true", () => {
      const styles = buildImageWrapperStyles({
        bgImage: null,
        aspectRatio: "16/9",
        maxWidth: 800,
        skipMaxWidth: true,
      });
      expect(styles).not.toContain("max-width");
      expect(styles).toContain("aspect-ratio: 16/9");
    });

    test("omits max-width when maxWidth is not provided", () => {
      const styles = buildImageWrapperStyles({
        bgImage: null,
        aspectRatio: "16/9",
      });
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

    test("strips .image-cache/ prefix from cropped images", () => {
      expect(getPathAwareBasename(".image-cache/photo-crop-abc123.jpeg")).toBe(
        "photo-crop-abc123",
      );
    });

    test("strips image-cache/ prefix without leading dot", () => {
      expect(getPathAwareBasename("image-cache/photo-crop-abc123.jpeg")).toBe(
        "photo-crop-abc123",
      );
    });

    test("strips .image-cache/ from absolute paths", () => {
      expect(
        getPathAwareBasename("/abs/path/.image-cache/photo-crop-abc123.jpeg"),
      ).toBe("photo-crop-abc123");
    });

    test("strips .image-cache/ from paths with parent directory references", () => {
      expect(
        getPathAwareBasename("../.image-cache/photo-crop-abc123.jpeg"),
      ).toBe("photo-crop-abc123");
    });

    test("strips .image-cache/ from paths with other prefixes", () => {
      expect(
        getPathAwareBasename("foo/.image-cache/photo-crop-abc123.jpeg"),
      ).toBe("photo-crop-abc123");
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

    test("generates correct filename for .image-cache paths (cropped images)", () => {
      expect(
        filenameFormat(
          "id",
          ".image-cache/photo-crop-abc123.jpeg",
          240,
          "webp",
        ),
      ).toBe("photo-crop-abc123-240.webp");
    });
  });
});
